"""
AI Interview API
Endpoints:
  POST /interview-ai/generate-questions  — generate 7 tailored questions (Gemini)
  POST /interview-ai/evaluate-answer     — score a single answer (Groq)
  POST /interview-ai/followup            — generate a follow-up question (Groq)
  POST /interview-ai/final-score         — produce final interview score (Gemini x3)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
import httpx
import json
import asyncio
import logging

from app.config import settings

router = APIRouter(prefix="/interview-ai", tags=["interview-ai"])
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Constants (mirrors the reference JS logic)
# ─────────────────────────────────────────────────────────────────────────────
GEMINI_MODEL          = "gemini-3.6-flash"
GROQ_MODEL            = "openai/gpt-oss-120b"
NUM_MAIN_QUESTIONS    = 3
NUM_RAPPORT_QUESTIONS = 2
MAX_FOLLOWUPS         = 3
FOLLOWUP_BASE_THRESH  = 0.6
FOLLOWUP_HYSTERESIS   = 0.15
FOLLOWUP_MIN_THRESH   = 0.25
NUM_FINAL_SCORE_RUNS  = 3
DIFFICULTY_LEVELS     = ["basic", "intermediate", "advanced"]

INTERVIEWER_PERSONA = (
    "You are Alex, a warm but sharp technical interviewer. You keep the conversation moving naturally, "
    "occasionally react briefly to what the candidate said before continuing, vary your phrasing instead of "
    "repeating templated openers, and never sound like a written exam. You are efficient with time — you do "
    "not over-interrogate a candidate on minor gaps, and you ease off when someone is clearly struggling. You "
    "are speaking out loud in a live voice interview, so keep every line short, natural, and easy to say."
)

# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class CandidateProfile(BaseModel):
    name:             str = ""
    qualification:    str = ""
    total_experience: str = ""
    skills:           str = ""
    work_experience:  List[str] = []
    projects:         List[str] = []
    certifications:   str = ""

class JobData(BaseModel):
    title:             str = ""
    company:           str = ""
    experience_level:  str = ""
    required_skills:   str = ""
    responsibilities:  List[str] = []
    other_requirements: str = ""

class GenerateQuestionsRequest(BaseModel):
    candidate: CandidateProfile
    job:       JobData

# Shape returned per rapport question from generate-questions
class RapportQuestion(BaseModel):
    id:       int
    kind:     str   # "greeting" | "self_intro"
    question: str

# Shape returned per main question from generate-questions
# (extends the existing shape — adds difficulty)
class GenerateQuestionsResponseQuestion(BaseModel):
    id:         int
    category:   str
    topic:      str
    transition: str = ""
    question:   str
    key_points: List[str] = []
    ideal_depth: str = ""
    difficulty: str  # "basic" | "intermediate" | "advanced"

class Exchange(BaseModel):
    question: str
    answer:   str

class EvaluateAnswerRequest(BaseModel):
    main_question:       str
    category:            str = "technical"   # "rapport" short-circuits scoring
    key_points:          List[str] = []
    ideal_depth:         str = ""
    exchanges:           List[Exchange]
    full_transcript_text: str = ""
    strength_label:      str = ""
    current_difficulty:  str = "basic"       # difficulty of the current main question
    attempt_number:      int = 1             # how many exchanges have already happened on this question

class FollowupRequest(BaseModel):
    main_question:       str
    exchanges:           List[Exchange]
    full_transcript_text: str = ""
    strength_label:      str = ""
    mode:                str = "deepen"           # "deepen" | "rephrase" | "clarify"
    target_difficulty:   Optional[str] = None     # e.g. "advanced" — hint for deepen mode

class TranscriptItem(BaseModel):
    id:         Any
    category:   str          # now includes "rapport" as a possible value
    topic:      str
    key_points: List[str] = []
    exchanges:  List[Exchange]
    final_eval: Optional[dict] = None
    scored:     bool = True  # False for rapport items — excluded from final scoring

class FinalScoreRequest(BaseModel):
    candidate:  CandidateProfile
    job:        JobData
    transcript: List[TranscriptItem]

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _extract_json(raw: str) -> Any:
    """Strip markdown fences and parse JSON."""
    text = (raw or "").strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    # fallback: find first {...} or [...]
    import re
    m = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
    if m:
        return json.loads(m.group(1))
    raise ValueError(f"Cannot parse JSON from: {text[:300]}")


def _profile_to_text(c: CandidateProfile) -> str:
    lines = [
        f"Name: {c.name}",
        f"Qualification: {c.qualification}",
        f"Total Experience: {c.total_experience} years",
        f"Skills: {c.skills}",
    ]
    if c.work_experience:
        lines.append("Work Experience:")
        for w in c.work_experience:
            lines.append(f"- {w}")
    if c.projects:
        lines.append("Projects:")
        for p in c.projects:
            lines.append(f"- {p}")
    if c.certifications:
        lines.append(f"Certifications: {c.certifications}")
    return "\n".join(lines)


def _job_to_text(j: JobData) -> str:
    lines = [
        f"Job Title: {j.title}",
        f"Company: {j.company}",
        f"Experience Level: {j.experience_level}",
        f"Required Skills: {j.required_skills}",
    ]
    if j.responsibilities:
        lines.append("Responsibilities:")
        for r in j.responsibilities:
            lines.append(f"- {r}")
    if j.other_requirements:
        lines.append(f"Other Requirements: {j.other_requirements}")
    return "\n".join(lines)


def _transcript_to_text(transcript: List[TranscriptItem]) -> str:
    """
    Build the scored transcript text for final scoring.
    Rapport items (category == "rapport" or scored == False) are EXCLUDED from the
    scored body but collected into a short context-only preamble so the panel model
    can use the self-introduction for behavioural/summary quality without letting it
    move numeric scores.
    """
    rapport_lines: List[str] = []
    scored_blocks: List[str] = []

    for item in transcript:
        is_rapport = (item.category == "rapport") or (not item.scored)

        if is_rapport:
            # Collect rapport exchanges for the unscored preamble only
            for e in item.exchanges:
                if e.answer and e.answer.strip():
                    rapport_lines.append(e.answer.strip())
        else:
            block = [f"[{item.category.upper()}] Topic: {item.topic}"]
            for e in item.exchanges:
                block.append(f"Q: {e.question}")
                block.append(f"A: {e.answer}")
            scored_blocks.append("\n".join(block))

    parts: List[str] = []

    # Prepend rapport preamble if any self-introduction content was captured
    if rapport_lines:
        intro_text = " | ".join(rapport_lines)
        parts.append(
            f"[CANDIDATE SELF-INTRODUCTION — CONTEXT ONLY, NOT SCORED]\n{intro_text}"
        )

    parts.extend(scored_blocks)
    return "\n\n".join(parts)


def _mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _pstdev(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    return (_mean([(v - m) ** 2 for v in values])) ** 0.5

# ─────────────────────────────────────────────────────────────────────────────
# API callers
# ─────────────────────────────────────────────────────────────────────────────

async def _call_gemini(prompt: str) -> str:
    key = settings.GEMINI_API_KEY.strip()
    if not key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={key}"
    )
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, json=payload)
        data = resp.json()
        if not resp.is_success:
            raise HTTPException(
                status_code=502,
                detail=f"Gemini error: {data.get('error', {}).get('message', resp.status_code)}"
            )
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts)
        if not text.strip():
            raise HTTPException(status_code=502, detail="Empty response from Gemini")
        return text


async def _call_groq(system_prompt: str, user_prompt: str) -> str:
    key = settings.GROQ_API_KEY.strip()
    if not key:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY not configured")
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
        "temperature": 0.4,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {key}"},
        )
        data = resp.json()
        if not resp.is_success:
            raise HTTPException(
                status_code=502,
                detail=f"Groq error: {data.get('error', {}).get('message', resp.status_code)}"
            )
        text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if not text.strip():
            raise HTTPException(status_code=502, detail="Empty response from Groq")
        return text


async def _call_with_retries(fn, retries: int = 2):
    last_err = None
    for attempt in range(retries + 1):
        try:
            return await fn()
        except HTTPException:
            raise
        except Exception as e:
            last_err = e
            if attempt < retries:
                await asyncio.sleep(1.0)
    raise last_err

# ─────────────────────────────────────────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────────────────────────────────────────

def _rapport_questions_prompt(resume_text: str, candidate_name: str) -> str:
    return f"""{INTERVIEWER_PERSONA}

Candidate Resume:
{resume_text}

You are opening a live voice interview with {candidate_name}. Generate exactly {NUM_RAPPORT_QUESTIONS} short,
warm rapport-building questions in the same spoken style as the interviewer persona above.

Rules:
- Question 1 (kind: "greeting"): A warm, natural opener addressed to {candidate_name} by name. Reference ONE
  specific, concrete detail you noticed in their resume (a project, a past role, a skill, a certification —
  something real). Then invite them to briefly walk you through their background. Keep it to 2-3 sentences max.
- Question 2 (kind: "self_intro"): A light, resume-grounded ice-breaker — NOT technical. Ask about something
  like what drew them to this kind of work, a highlight from their most recent role, or what they are most
  proud of so far in their career. One sentence only.
- BOTH questions must sound like natural small talk from a live interviewer, NOT a written form or quiz.
- NEITHER question should be technical, require evaluation, or assess any skill.
- Keep every sentence short and easy to say aloud (TTS-friendly).
- Do NOT include a transition field — these questions open the interview.

Return ONLY a valid JSON array, no markdown fences, no extra text:
[
  {{"id": 1, "kind": "greeting", "question": "..."}},
  {{"id": 2, "kind": "self_intro", "question": "..."}}
]""".strip()


def _main_questions_prompt(resume_text: str, jd_text: str, projects_text: str = "") -> str:
    projects_hint = (
        f"\nCandidate Projects (use at least one as the basis for a question):\n{projects_text}"
        if projects_text else ""
    )
    return f"""{INTERVIEWER_PERSONA}

Candidate Resume:
{resume_text}

Job Description:
{jd_text}{projects_hint}

The rapport/greeting phase has already happened before these questions. Do NOT open with another greeting,
introduction request, or "tell me about yourself" — jump straight into job-relevant content.

Generate exactly {NUM_MAIN_QUESTIONS} interview questions for this candidate, tailored to the resume and job description.

Ordering rules (strictly follow this sequence):
1. Question 1 MUST be a basic/fundamental question about a core skill or concept required for the role —
   NOT an intro or greeting, since that is already handled.
2. Questions 2-4: mix of basic and intermediate technical questions, progressively increasing in depth.
3. Questions 5-6: advanced technical questions — trade-offs, architecture decisions, edge cases, or a
   deeper question directly grounded in one of the candidate's listed projects.
4. Questions 6-7 area: include 1-2 behavioral questions naturally mixed in (category: "behavioral").
5. At least ONE question must be explicitly grounded in the candidate's projects (reference the project by
   name or detail from the resume). Set its difficulty according to how advanced the project is relative
   to the role's experience_level.

Per-question rules:
- Each question must cover ONLY ONE single topic/concept at a time.
- Keep each question SHORT (max 1-2 sentences), clear, and conversational — it will be read aloud by TTS.
- Vary sentence openers across all questions.
- category must be one of: "technical", "behavioral".
- difficulty must be one of: "basic", "intermediate", "advanced" — reflecting the cognitive demand of the
  question relative to the role, NOT the candidate's expected answer quality.
- key_points: list 2-3 short concepts/criteria a good answer should touch on.
- ideal_depth: one short phrase describing expected answer depth.
- transition: a short natural bridge sentence (5-12 words) that connects from the previous question or
  a prior answer to this one. For question 1, transition should acknowledge the end of the rapport phase
  and signal the start of the technical discussion (e.g. "Alright, let's get into the role itself.").

Return ONLY a valid JSON array, no markdown fences, no extra text:
[
  {{
    "id": 1, "category": "technical", "topic": "short topic label",
    "difficulty": "basic", "transition": "...", "question": "...",
    "key_points": ["...", "..."], "ideal_depth": "..."
  }}
]""".strip()


def _eval_system_prompt() -> str:
    return f"""{INTERVIEWER_PERSONA}

You are the evaluator behind the scenes. The candidate's answer was transcribed from speech — expect informal
spoken phrasing. Do NOT penalize for grammar, formality, or verbosity.

CRITICAL ANTI-BIAS RULES:
- Judge ONLY accuracy, depth, and relevance against key_points and ideal_depth.
- COMPLETELY IGNORE grammar, sentence structure, verbosity, and formality.
- A short correct casual answer must score AT LEAST AS HIGH as a long polished one covering the same key_points.

Return ONLY valid JSON, no markdown fences:
{{
  "restated_answer": "neutral restatement of content only",
  "correctness_score": 0.0,
  "depth_score": 0.0,
  "completeness_score": 0.0,
  "reason": "short reason referencing key_points, not style"
}}""".strip()


def _followup_system_prompt(mode: str = "deepen", target_difficulty: Optional[str] = None) -> str:
    if mode == "rephrase":
        mode_instruction = (
            "The candidate showed partial understanding but wasn't fully clear. "
            "Do NOT increase the difficulty. Ask about the SAME underlying concept using a simpler framing, "
            "a concrete real-world example, or a smaller sub-question that isolates the gap. "
            "Open with a brief, encouraging reaction (3-8 words) — the persona eases off when someone is struggling."
        )
    elif mode == "clarify":
        mode_instruction = (
            "The candidate's answer was ambiguous or incomplete on one specific point. "
            "Ask a short, neutral clarifying question about ONLY that missing detail. "
            "Keep the reaction neutral (3-8 words), no judgement."
        )
    else:  # "deepen" (default)
        difficulty_hint = (
            f" Push toward {target_difficulty}-level depth." if target_difficulty in DIFFICULTY_LEVELS else ""
        )
        mode_instruction = (
            f"The candidate gave a solid answer. Push deeper — ask about trade-offs, edge cases, "
            f"failure modes, or a harder related sub-topic.{difficulty_hint} "
            "Open with a brief, positive reaction (3-8 words) before asking."
        )

    return f"""{INTERVIEWER_PERSONA}

You are asking a natural spoken follow-up in a live voice interview.

Follow-up mode: {mode.upper()}
{mode_instruction}

General rules (apply regardless of mode):
- First write a very short (3-8 word) natural reaction to the candidate's last answer.
- Then ask exactly ONE short follow-up question (max 1-2 sentences), ONE topic only.
- Directly reference something specific the candidate said.
- Do not repeat a question already asked.
- Sound conversational and easy to say out loud (TTS-friendly).

Return ONLY valid JSON, no markdown fences:
{{"reaction": "...", "followup_question": "..."}}""".strip()


def _final_score_prompt(resume_text: str, jd_text: str, transcript_text: str) -> str:
    return f"""{INTERVIEWER_PERSONA}

You are the panel reviewer scoring a completed interview transcript. Ignore transcription artifacts and informal phrasing.

Candidate Resume:
{resume_text}

Job Description:
{jd_text}

Full Interview Transcript:
{transcript_text}

IMPORTANT — RAPPORT / SELF-INTRODUCTION BLOCK:
If the transcript begins with a "[CANDIDATE SELF-INTRODUCTION — CONTEXT ONLY, NOT SCORED]" block, treat it as
background context only. It must NOT influence technical_correctness, technical_depth, problem_solving,
technical_score, behavioral_score, or overall_score. You may use it solely to improve the quality of the
written "summary" and "strengths/weaknesses" narrative.

CRITICAL ANTI-BIAS RULES:
- Score content and reasoning quality only. Completely ignore grammar, formality, and verbosity.

Score each dimension 0-10:
- technical_correctness: factual/conceptual accuracy
- technical_depth: depth of reasoning (trade-offs, edge cases, real examples)
- problem_solving: reasoning through problems, not just recalling facts
- communication_clarity: how understandable the answers were (MINOR dimension)
- behavioral_fit: quality of behavioral/situational answers

Derive:
- technical_score (0-10): weighted combination of correctness, depth, problem_solving
- behavioral_score (0-10): based on behavioral_fit
- overall_score (0-10): overall hiring-worthiness

Return ONLY valid JSON, no markdown fences:
{{
  "technical_correctness": 0, "technical_depth": 0, "problem_solving": 0,
  "communication_clarity": 0, "behavioral_fit": 0,
  "technical_score": 0, "behavioral_score": 0, "overall_score": 0,
  "strengths": ["...", "..."], "weaknesses": ["...", "..."],
  "summary": "2-3 sentence overall summary"
}}""".strip()

# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/generate-questions")
async def generate_questions(req: GenerateQuestionsRequest):
    """Generate rapport questions + 7 tailored main questions using Gemini (parallel calls)."""
    try:
        resume_text   = _profile_to_text(req.candidate)
        jd_text       = _job_to_text(req.job)
        projects_text = "\n".join(f"- {p}" for p in req.candidate.projects) if req.candidate.projects else ""

        rapport_prompt = _rapport_questions_prompt(resume_text, req.candidate.name or "there")
        main_prompt    = _main_questions_prompt(resume_text, jd_text, projects_text)

        # Run both Gemini calls in parallel — rapport and main questions are independent
        rapport_raw, main_raw = await asyncio.gather(
            _call_with_retries(lambda: _call_gemini(rapport_prompt)),
            _call_with_retries(lambda: _call_gemini(main_prompt)),
        )

        rapport_parsed = _extract_json(rapport_raw)
        main_parsed    = _extract_json(main_raw)

        if not isinstance(rapport_parsed, list) or len(rapport_parsed) < NUM_RAPPORT_QUESTIONS:
            logger.warning("Rapport questions count mismatch — using what was returned")
        if not isinstance(main_parsed, list) or not main_parsed:
            raise ValueError("No main questions returned from model")

        # Normalise rapport items: ensure id / kind fields are present
        for i, q in enumerate(rapport_parsed):
            if "id" not in q:
                q["id"] = i + 1
            if "kind" not in q:
                q["kind"] = "greeting" if i == 0 else "self_intro"

        # Normalise main question items: ensure difficulty is a valid value
        for q in main_parsed:
            if q.get("difficulty") not in DIFFICULTY_LEVELS:
                q["difficulty"] = "basic"

        return {
            "success":          True,
            "rapport_questions": rapport_parsed,
            "questions":         main_parsed,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"generate_questions error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate-answer")
async def evaluate_answer(req: EvaluateAnswerRequest):
    """Score the candidate's latest answer using Groq. Skips scoring for rapport exchanges."""
    try:
        # ── Rapport short-circuit ─────────────────────────────────────────────
        if req.category == "rapport":
            return {"success": True, "scored": False, "evaluation": None,
                    "recommended_action": "move_on", "difficulty_delta": "same"}

        # ── Build prompt ──────────────────────────────────────────────────────
        convo = "\n".join(f"Q: {e.question}\nA: {e.answer}" for e in req.exchanges)
        user_prompt = (
            f"Main interview question: {req.main_question}\n"
            f"Key points a good answer should cover: {json.dumps(req.key_points)}\n"
            f"Ideal depth expected: {req.ideal_depth}\n"
            f"Candidate strength so far: {req.strength_label}\n\n"
            f"Full interview so far (for context only):\n{req.full_transcript_text}\n\n"
            f"Conversation so far on THIS question:\n{convo}\n\n"
            "Evaluate the latest answer now."
        )
        raw    = await _call_with_retries(lambda: _call_groq(_eval_system_prompt(), user_prompt))
        result = _extract_json(raw)

        # ── Combined score (mean of the three 0-1 sub-scores) ─────────────────
        correctness  = float(result.get("correctness_score",  0.0))
        depth        = float(result.get("depth_score",        0.0))
        completeness = float(result.get("completeness_score", 0.0))
        combined     = (correctness + depth + completeness) / 3
        result["combined_score"] = round(combined * 1000) / 1000  # 3 d.p.

        # ── Adaptive action using the threshold constants ──────────────────────
        # attempt_number >= MAX_FOLLOWUPS always forces move_on (prevent infinite loops)
        if req.attempt_number >= MAX_FOLLOWUPS:
            action = "move_on"
        elif combined >= FOLLOWUP_BASE_THRESH:
            action = "deepen"    # strong answer — push harder or advance topic
        elif combined >= FOLLOWUP_MIN_THRESH:
            action = "rephrase"  # partial understanding — ask same concept differently
        else:
            action = "move_on"   # clearly struggling — don't over-interrogate (per persona)

        # ── Difficulty delta with hysteresis ──────────────────────────────────
        # Only escalate on a sustained strong showing (above base + hysteresis buffer).
        # Only de-escalate on a genuinely weak answer (below min threshold).
        # Clamp so we never step outside ["basic", "intermediate", "advanced"].
        if combined >= FOLLOWUP_BASE_THRESH + FOLLOWUP_HYSTERESIS:
            raw_delta = "up"
        elif combined < FOLLOWUP_MIN_THRESH:
            raw_delta = "down"
        else:
            raw_delta = "same"

        # Apply clamp: can't go below "basic" or above "advanced"
        current_idx = DIFFICULTY_LEVELS.index(req.current_difficulty) \
            if req.current_difficulty in DIFFICULTY_LEVELS else 0
        if raw_delta == "up" and current_idx >= len(DIFFICULTY_LEVELS) - 1:
            difficulty_delta = "same"   # already at "advanced"
        elif raw_delta == "down" and current_idx <= 0:
            difficulty_delta = "same"   # already at "basic"
        else:
            difficulty_delta = raw_delta

        return {
            "success":            True,
            "scored":             True,
            "evaluation":         result,
            "recommended_action": action,
            "difficulty_delta":   difficulty_delta,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"evaluate_answer error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/followup")
async def generate_followup(req: FollowupRequest):
    """Generate a follow-up question using Groq, respecting the requested mode."""
    try:
        convo = "\n".join(f"Q: {e.question}\nA: {e.answer}" for e in req.exchanges)

        # Surface mode and target_difficulty explicitly in the user prompt so the
        # model has them in context even if the system prompt already mentions them.
        difficulty_line = (
            f"Target difficulty for this follow-up: {req.target_difficulty}.\n"
            if req.target_difficulty in DIFFICULTY_LEVELS else ""
        )
        user_prompt = (
            f"Follow-up mode: {req.mode.upper()}\n"
            f"{difficulty_line}"
            f"Main interview question: {req.main_question}\n"
            f"Candidate strength so far: {req.strength_label}\n\n"
            f"Full interview so far:\n{req.full_transcript_text}\n\n"
            f"Conversation so far on THIS question:\n{convo}\n\n"
            "Generate the next follow-up (reaction + question)."
        )
        sys_prompt = _followup_system_prompt(
            mode=req.mode,
            target_difficulty=req.target_difficulty,
        )
        raw    = await _call_with_retries(lambda: _call_groq(sys_prompt, user_prompt))
        result = _extract_json(raw)
        return {
            "success":           True,
            "reaction":          result.get("reaction", ""),
            "followup_question": result.get("followup_question", ""),
            "mode":              req.mode,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"generate_followup error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/final-score")
async def final_score(req: FinalScoreRequest):
    """Run final scoring 3 times via Gemini and average the results."""
    try:
        resume_text     = _profile_to_text(req.candidate)
        jd_text         = _job_to_text(req.job)
        transcript_text = _transcript_to_text(req.transcript)
        prompt          = _final_score_prompt(resume_text, jd_text, transcript_text)

        # Run NUM_FINAL_SCORE_RUNS times in parallel
        tasks   = [_call_with_retries(lambda: _call_gemini(prompt)) for _ in range(NUM_FINAL_SCORE_RUNS)]
        raws    = await asyncio.gather(*tasks, return_exceptions=True)

        runs = []
        for r in raws:
            if isinstance(r, Exception):
                logger.warning(f"One scoring run failed: {r}")
                continue
            try:
                runs.append(_extract_json(r))
            except Exception as e:
                logger.warning(f"Could not parse scoring run: {e}")

        if not runs:
            raise HTTPException(status_code=502, detail="All scoring runs failed")

        numeric_fields = [
            "technical_correctness", "technical_depth", "problem_solving",
            "communication_clarity", "behavioral_fit",
            "technical_score", "behavioral_score", "overall_score",
        ]
        averaged: dict = {}
        for field in numeric_fields:
            values = [r[field] for r in runs if isinstance(r.get(field), (int, float))]
            averaged[field] = round(_mean(values) * 100) / 100 if values else None

        target  = averaged.get("overall_score") or 0
        closest = min(runs, key=lambda r: abs((r.get("overall_score") or 0) - target))
        averaged["strengths"]  = closest.get("strengths", [])
        averaged["weaknesses"] = closest.get("weaknesses", [])
        averaged["summary"]    = closest.get("summary", "")
        averaged["_num_runs"]  = len(runs)
        averaged["_run_variance_overall_score"] = round(
            _pstdev([r.get("overall_score") or 0 for r in runs]) * 100
        ) / 100

        return {"success": True, "result": averaged}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"final_score error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Candidate Signals — Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class EmotionBreakdown(BaseModel):
    neutral:    float = 0.0
    positive:   float = 0.0
    nervous:    float = 0.0
    confused:   float = 0.0
    disengaged: float = 0.0

class ViolationEventPayload(BaseModel):
    id:         str
    type:       str   # "multiple_faces" | "face_not_visible" | "looking_away" | "tab_switched" | "window_blurred"
    startTime:  float # ms epoch
    endTime:    Optional[float] = None
    durationMs: Optional[float] = None
    severity:   str   # "low" | "medium" | "high"

class QuestionSignalsPayload(BaseModel):
    questionId:          Any
    startTime:           float
    endTime:             float
    avgComposureScore:   float
    minComposureScore:   float
    maxComposureScore:   float
    composureTrend:      float
    dominantEmotion:     str
    emotionBreakdown:    EmotionBreakdown
    proctoringViolations: List[ViolationEventPayload] = []

class SubmitSignalsRequest(BaseModel):
    interview_id: str   # application / session identifier (string, from frontend state)
    signals:      List[QuestionSignalsPayload]

# ─────────────────────────────────────────────────────────────────────────────
# Signals endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/signals")
async def submit_signals(req: SubmitSignalsRequest):
    """
    Accept per-question composure + proctoring signals from the frontend.

    Called once per question (on question transition) — not streamed
    continuously, so payloads stay tiny.

    Signals are stored in MongoDB under the `interview_signals` collection,
    keyed by interview_id.  They are NEVER blended into the technical score —
    they exist as a separate, clearly labelled report section for reviewers.

    No raw video or per-frame data is accepted here — only aggregated metrics.
    """
    try:
        from app.core.database import get_mongo_db
        mongo_db = get_mongo_db()
        if mongo_db is None:
            # MongoDB not configured — accept but discard gracefully so the
            # interview itself is never blocked by a signals storage failure.
            logger.warning("MongoDB not available — signals payload discarded")
            return {"success": True, "stored": False, "reason": "mongodb_unavailable"}

        from datetime import datetime, timezone

        payload = {
            "interview_id": req.interview_id,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "question_count": len(req.signals),
            "questions": [s.model_dump() for s in req.signals],
            # Derived summary across all questions for quick reviewer overview
            "summary": _derive_signals_summary(req.signals),
        }

        # Upsert: if signals for this interview already exist, replace them.
        # (Frontend may call this endpoint multiple times — once per question
        #  or once at end-of-interview with the full batch.)
        await mongo_db.interview_signals.replace_one(
            {"interview_id": req.interview_id},
            payload,
            upsert=True,
        )

        return {"success": True, "stored": True, "question_count": len(req.signals)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"submit_signals error: {e}", exc_info=True)
        # Do not crash the interview over a signals failure — return 200
        return {"success": False, "error": str(e)}


@router.get("/signals/{interview_id}")
async def get_signals(interview_id: str):
    """
    Retrieve the full signals record for a completed interview.
    Intended for the reviewer dashboard — not shown to the candidate.
    Returns 404 if no signals have been submitted for this interview_id.
    """
    try:
        from app.core.database import get_mongo_db
        mongo_db = get_mongo_db()
        if mongo_db is None:
            raise HTTPException(status_code=503, detail="MongoDB not available")

        doc = await mongo_db.interview_signals.find_one(
            {"interview_id": interview_id},
            {"_id": 0},   # exclude internal Mongo _id from response
        )
        if not doc:
            raise HTTPException(
                status_code=404,
                detail=f"No signals found for interview_id={interview_id}",
            )
        return {"success": True, "data": doc}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_signals error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Signals summary helper
# ─────────────────────────────────────────────────────────────────────────────

def _derive_signals_summary(signals: List[QuestionSignalsPayload]) -> dict:
    """
    Compute a cross-question summary for reviewer quick-view.
    This is descriptive only — it never influences technical scoring.
    """
    if not signals:
        return {}

    scores = [s.avgComposureScore for s in signals]
    avg_composure   = round(_mean(scores) * 100) / 100
    trend_overall   = 0.0
    if len(scores) >= 2:
        # Simple overall trend: last-third avg vs first-third avg
        third = max(1, len(scores) // 3)
        trend_overall = round(_mean(scores[-third:]) - _mean(scores[:third]), 2)

    # Dominant emotion across all questions (mode)
    emotion_counts: dict = {}
    for s in signals:
        e = s.dominantEmotion
        emotion_counts[e] = emotion_counts.get(e, 0) + 1
    dominant_emotion = max(emotion_counts, key=lambda k: emotion_counts[k]) if emotion_counts else "neutral"

    # Violation summary
    all_violations = [v for s in signals for v in s.proctoringViolations]
    high_violations   = [v for v in all_violations if v.severity == "high"]
    total_look_away_s = sum(
        (v.durationMs or 0) for v in all_violations if v.type == "looking_away"
    ) / 1000

    proctoring_flag = (
        "high_risk" if high_violations else
        "flagged"   if all_violations  else
        "clear"
    )

    return {
        "avg_composure_score":      avg_composure,
        "composure_trend":          trend_overall,
        "dominant_emotion":         dominant_emotion,
        "total_violations":         len(all_violations),
        "high_severity_violations": len(high_violations),
        "total_look_away_seconds":  round(total_look_away_s, 1),
        "proctoring_flag":          proctoring_flag,
        # NOTE: composure/emotion signals are supplementary reviewer context only.
        # They must NEVER be used to adjust the candidate's technical evaluation.
    }
