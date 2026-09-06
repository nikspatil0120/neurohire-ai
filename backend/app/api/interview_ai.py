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
NUM_MAIN_QUESTIONS    = 7
MAX_FOLLOWUPS         = 3
FOLLOWUP_BASE_THRESH  = 0.6
FOLLOWUP_HYSTERESIS   = 0.15
FOLLOWUP_MIN_THRESH   = 0.25
NUM_FINAL_SCORE_RUNS  = 3

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

class Exchange(BaseModel):
    question: str
    answer:   str

class EvaluateAnswerRequest(BaseModel):
    main_question:       str
    key_points:          List[str] = []
    ideal_depth:         str = ""
    exchanges:           List[Exchange]
    full_transcript_text: str = ""
    strength_label:      str = ""

class FollowupRequest(BaseModel):
    main_question:       str
    exchanges:           List[Exchange]
    full_transcript_text: str = ""
    strength_label:      str = ""

class TranscriptItem(BaseModel):
    id:         Any
    category:   str
    topic:      str
    key_points: List[str] = []
    exchanges:  List[Exchange]
    final_eval: Optional[dict] = None

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
    blocks = []
    for item in transcript:
        block = [f"[{item.category.upper()}] Topic: {item.topic}"]
        for e in item.exchanges:
            block.append(f"Q: {e.question}")
            block.append(f"A: {e.answer}")
        blocks.append("\n".join(block))
    return "\n\n".join(blocks)


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

def _main_questions_prompt(resume_text: str, jd_text: str) -> str:
    return f"""{INTERVIEWER_PERSONA}

Candidate Resume:
{resume_text}

Job Description:
{jd_text}

Generate exactly {NUM_MAIN_QUESTIONS} interview questions for this candidate, tailored to the resume and job description.

Rules:
- Order them like a real human interviewer: start with 1 introductory question, then basic/fundamental questions,
  then progressively move to advanced/technical depth, mixing in 1-2 behavioral questions naturally.
- Each question must cover ONLY ONE single topic/concept at a time.
- Keep each question SHORT (max 1-2 sentences), clear, and conversational — it will be read aloud by TTS.
- Vary sentence openers across questions.
- Base questions on specifics from the resume and job description.
- category must be one of: "intro", "technical", "behavioral".
- key_points: list 2-3 short concepts/criteria a good answer should touch on.
- ideal_depth: one short phrase describing expected depth.
- transition: a short natural bridge sentence (5-12 words) before asking this question.
  For question 1, transition should be a brief natural interview opener that greets the candidate by name.

Return ONLY a valid JSON array, no markdown fences, no extra text:
[
  {{
    "id": 1, "category": "intro", "topic": "short topic label",
    "transition": "...", "question": "...",
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


def _followup_system_prompt() -> str:
    return f"""{INTERVIEWER_PERSONA}

You are asking a natural spoken follow-up in a live voice interview.

Rules:
- First write a very short (3-8 word) natural reaction to the candidate's last answer.
- Then ask exactly ONE short follow-up question (max 1-2 sentences), ONE topic only.
- Directly reference something specific the candidate said, digging deeper.
- Do not repeat a question already asked.
- Sound conversational and easy to say out loud.

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
    """Generate 7 tailored interview questions using Gemini."""
    try:
        resume_text = _profile_to_text(req.candidate)
        jd_text     = _job_to_text(req.job)
        prompt      = _main_questions_prompt(resume_text, jd_text)

        raw     = await _call_with_retries(lambda: _call_gemini(prompt))
        parsed  = _extract_json(raw)

        if not isinstance(parsed, list) or not parsed:
            raise ValueError("No questions returned from model")

        return {"success": True, "questions": parsed}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"generate_questions error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate-answer")
async def evaluate_answer(req: EvaluateAnswerRequest):
    """Score the candidate's latest answer using Groq."""
    try:
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
        return {"success": True, "evaluation": result}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"evaluate_answer error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/followup")
async def generate_followup(req: FollowupRequest):
    """Generate a follow-up question using Groq."""
    try:
        convo = "\n".join(f"Q: {e.question}\nA: {e.answer}" for e in req.exchanges)
        user_prompt = (
            f"Main interview question: {req.main_question}\n"
            f"Candidate strength so far: {req.strength_label}\n\n"
            f"Full interview so far:\n{req.full_transcript_text}\n\n"
            f"Conversation so far on THIS question:\n{convo}\n\n"
            "Generate the next follow-up (reaction + question)."
        )
        raw    = await _call_with_retries(lambda: _call_groq(_followup_system_prompt(), user_prompt))
        result = _extract_json(raw)
        return {
            "success": True,
            "reaction":          result.get("reaction", ""),
            "followup_question": result.get("followup_question", ""),
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
