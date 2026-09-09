import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import WaveformAnimation from "@/components/WaveformAnimation";
import CameraPreview from "@/components/CameraPreview";
import ProctoringDebugPanel from "@/components/ProctoringDebugPanel";
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis";
import { useProctoringMonitor } from "@/hooks/useProctoringMonitor";
import { useCandidateSignals } from "@/hooks/useCandidateSignals";
import {
  Brain, Clock, AlertTriangle, Mic,
  X, Volume2, ShieldAlert, ShieldCheck, ShieldOff, ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const API = "http://localhost:8000/api/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface RapportQuestion {
  id: number;
  kind: "greeting" | "self_intro";
  question: string;
}

interface Question {
  id: number;
  category: string;
  topic: string;
  transition: string;
  question: string;
  key_points: string[];
  ideal_depth: string;
  difficulty: "basic" | "intermediate" | "advanced";
}

interface Exchange {
  question: string;
  answer: string;
}

interface TranscriptItem {
  id: number | string;
  category: string;
  topic: string;
  key_points: string[];
  exchanges: Exchange[];
  final_eval: any;
  scored: boolean;
}

type AiMode = "idle" | "speaking" | "listening" | "processing";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MAX_FOLLOWUPS      = 3;   // kept for the follow-up counter display only
const SILENCE_TIMEOUT_MS = 8000;
const DIFFICULTY_LEVELS  = ["basic", "intermediate", "advanced"] as const;

function mean(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function strengthLabel(history: number[]) {
  if (!history.length) return "unknown (first question, treat as average difficulty)";
  const avg = mean(history);
  if (avg >= 0.75) return `strong so far (avg ${avg.toFixed(2)}) — go deeper`;
  if (avg >= 0.45) return `average so far (avg ${avg.toFixed(2)}) — keep standard pacing`;
  return `struggling so far (avg ${avg.toFixed(2)}) — ease off`;
}

function nextDifficulty(
  current: string,
  delta: "up" | "down" | "same",
): "basic" | "intermediate" | "advanced" {
  const idx = DIFFICULTY_LEVELS.indexOf(current as any);
  const base = idx < 0 ? 0 : idx;
  const next = delta === "up"   ? Math.min(base + 1, DIFFICULTY_LEVELS.length - 1)
             : delta === "down" ? Math.max(base - 1, 0)
             : base;
  return DIFFICULTY_LEVELS[next];
}

function difficultyDots(level: "basic" | "intermediate" | "advanced") {
  return level === "advanced" ? 3 : level === "intermediate" ? 2 : 1;
}

function transcriptToText(items: TranscriptItem[]) {
  return items
    .filter(item => item.scored)
    .map(item => {
      const lines = [`[${item.category.toUpperCase()}] Topic: ${item.topic}`];
      item.exchanges.forEach(e => { lines.push(`Q: ${e.question}`); lines.push(`A: ${e.answer}`); });
      return lines.join("\n");
    }).join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS helper
// ─────────────────────────────────────────────────────────────────────────────
function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    const clean = (text || "").trim();
    if (!clean || !("speechSynthesis" in window)) { resolve(); return; }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.lang = "en-US";
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      utter.onend = finish;
      utter.onerror = finish;
      const estMs = Math.min(Math.max(clean.length * 60, 1200), 20000);
      setTimeout(finish, estMs + 2500);
      window.speechSynthesis.speak(utter);
    } catch { resolve(); }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STT helper
// ─────────────────────────────────────────────────────────────────────────────
function listenForAnswer(
  onInterim: (text: string) => void,
  onCountdown: (sec: number) => void,
  forceSubmitRef?: React.MutableRefObject<(() => void) | null>,
): Promise<string> {
  return new Promise((resolve) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { resolve(""); return; }

    let finalText = "";
    let interimText = "";
    let finished = false;
    let lastSpeech = Date.now();
    let interval: ReturnType<typeof setInterval>;

    function currentText() { return (finalText + " " + interimText).trim(); }

    function finalize() {
      if (finished) return;
      finished = true;
      clearInterval(interval);
      // Clear the force-submit handle so the button disappears
      if (forceSubmitRef) forceSubmitRef.current = null;
      try { recognition.onend = null; recognition.onerror = null; recognition.stop(); } catch { /* ignore */ }
      resolve(currentText());
    }

    // Expose early-submit to the button via the ref
    if (forceSubmitRef) forceSubmitRef.current = finalize;

    function tick() {
      onInterim(currentText());
      const remaining = SILENCE_TIMEOUT_MS - (Date.now() - lastSpeech);
      onCountdown(Math.max(0, Math.ceil(remaining / 1000)));
      if (remaining <= 0) finalize();
    }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece + " ";
        else interimText += piece;
      }
      lastSpeech = Date.now();
      onInterim(currentText());
    };

    recognition.onerror = (event: any) => {
      if (finished) return;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") { finalize(); }
    };

    recognition.onend = () => { if (!finished) { try { recognition.start(); } catch { /* ignore */ } } };

    try { recognition.start(); } catch { resolve(""); return; }

    lastSpeech = Date.now();
    interval = setInterval(tick, 250);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const InterviewRoom = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const state     = (location.state || {}) as {
    rapport_questions?: RapportQuestion[];
    questions?:        Question[];
    candidateProfile?: any;
    jobData?:          any;
    applicationId?:    string;
  };

  // ── Core interview state ──────────────────────────────────────────────────
  const [rapportQuestions,  setRapportQuestions]  = useState<RapportQuestion[]>(state.rapport_questions || []);
  const [questions,         setQuestions]         = useState<Question[]>(state.questions || []);
  const [questionIndex,     setQuestionIndex]     = useState(0);
  const [totalQuestions,    setTotalQuestions]    = useState(
    (state.rapport_questions?.length || 0) + (state.questions?.length || 0)
  );
  const [aiMode,            setAiMode]            = useState<AiMode>("processing");
  const [currentQuestion,   setCurrentQuestion]   = useState("");
  const [currentTopic,      setCurrenTopic]       = useState("");
  const [currentCategory,   setCurrentCategory]   = useState("");
  const [currentDifficulty, setCurrentDifficulty] = useState<"basic" | "intermediate" | "advanced">("basic");
  const [liveTranscript,    setLiveTranscript]    = useState("");
  const [silenceCountdown,  setSilenceCountdown]  = useState(8);
  const [followupCount,     setFollowupCount]     = useState(0);
  const [isFinished,        setIsFinished]        = useState(false);
  const [terminated,        setTerminated]        = useState(false);
  const [finalResult,       setFinalResult]       = useState<any>(null);
  const [elapsedSec,        setElapsedSec]        = useState(0);
  const [errorMsg,          setErrorMsg]          = useState("");

  // ── Refs (mutable across renders without re-render) ──────────────────────
  const transcriptRef        = useRef<TranscriptItem[]>([]);
  const correctnessHistory   = useRef<number[]>([]);
  const currentExchangesRef  = useRef<Exchange[]>([]);
  const runningRef           = useRef(false);
  // Holds the finalize() fn of the currently active listenForAnswer call.
  // The "Submit Answer" button calls this to skip waiting for silence.
  const forceSubmitRef       = useRef<(() => void) | null>(null);

  // ── Face analysis + proctoring + candidate signals ────────────────────────
  const proctoring = useProctoringMonitor();
  const signals    = useCandidateSignals();

  // Accumulates per-question aggregates for the backend signals payload
  const signalAggregatesRef = useRef<any[]>([]);

  // Stable refs for use inside runInterview without stale closure
  const proctoringRef = useRef(proctoring);
  const signalsRef    = useRef(signals);
  useEffect(() => { proctoringRef.current = proctoring; }, [proctoring]);
  useEffect(() => { signalsRef.current    = signals;    }, [signals]);

  // useFaceAnalysis is wired here — it calls proctoring.pushFrame + signals.pushFrame
  // on every detection tick via the onFrame callback.
  const faceAnalysis = useFaceAnalysis(
    useCallback((frame) => {
      proctoringRef.current.pushFrame(frame);
      signalsRef.current.pushFrame(frame);
    }, []),
  );

  // Camera-denied modal: shown as a blocking overlay when camera is required
  // but access was denied. Interview is NOT silently continued without camera.
  const [showCameraModal, setShowCameraModal] = useState(false);
  useEffect(() => {
    if (faceAnalysis.error && faceAnalysis.error !== "model_load_failed") {
      setShowCameraModal(true);
    }
  }, [faceAnalysis.error]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ── Difficulty dots (driven by the current question's explicit difficulty field) ──
  const difficultyLevel = difficultyDots(currentDifficulty);

  // ── API helpers ───────────────────────────────────────────────────────────
  const evaluateAnswer = useCallback(async (
    mq: Question,
    exchanges: Exchange[],
    attemptNumber: number,
    activeDifficulty: string,
  ) => {
    const res = await fetch(`${API}/interview-ai/evaluate-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        main_question:        mq.question,
        category:             mq.category,
        key_points:           mq.key_points,
        ideal_depth:          mq.ideal_depth,
        exchanges,
        full_transcript_text: transcriptToText(transcriptRef.current),
        strength_label:       strengthLabel(correctnessHistory.current),
        current_difficulty:   activeDifficulty,
        attempt_number:       attemptNumber,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || "Evaluation failed");
    // Returns { scored, evaluation, recommended_action, difficulty_delta }
    return data as {
      scored: boolean;
      evaluation: any;
      recommended_action: "deepen" | "rephrase" | "move_on";
      difficulty_delta: "up" | "down" | "same";
    };
  }, []);

  const generateFollowup = useCallback(async (
    mq: Question,
    exchanges: Exchange[],
    mode: "deepen" | "rephrase" | "clarify",
    targetDifficulty: string,
  ) => {
    const res = await fetch(`${API}/interview-ai/followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        main_question:        mq.question,
        exchanges,
        full_transcript_text: transcriptToText(transcriptRef.current),
        strength_label:       strengthLabel(correctnessHistory.current),
        mode,
        target_difficulty:    targetDifficulty,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || "Followup failed");
    return { reaction: data.reaction || "", followup_question: data.followup_question || "" };
  }, []);

  const computeFinalScore = useCallback(async () => {
    const res = await fetch(`${API}/interview-ai/final-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate:  state.candidateProfile || {},
        job:        state.jobData          || {},
        transcript: transcriptRef.current,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || "Scoring failed");
    return data.result;
  }, [state.candidateProfile, state.jobData]);

  /** Submit accumulated signals to backend — fire-and-forget, never blocks interview */
  const submitSignals = useCallback(async (aggregates: any[]) => {
    if (!aggregates.length) return;
    try {
      await fetch(`${API}/interview-ai/signals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_id: state.applicationId || `session_${Date.now()}`,
          signals:      aggregates,
        }),
      });
    } catch (e) {
      // Signals submission failure must never affect the interview
      console.warn("Signals submission failed (non-fatal):", e);
    }
  }, [state.applicationId]);

  // ── Main interview orchestration ──────────────────────────────────────────
  const runInterview = useCallback(async (
    rqs: RapportQuestion[],
    qs: Question[],
  ) => {
    if (runningRef.current) return;
    runningRef.current = true;

    let globalIndex = 0; // counts every question shown (rapport + main)
    const totalQ = rqs.length + qs.length;
    setTotalQuestions(totalQ);

    // ── PHASE 1: Rapport ──────────────────────────────────────────────────
    for (const rq of rqs) {
      if (terminated) break;

      globalIndex += 1;
      setQuestionIndex(globalIndex);
      setCurrentCategory("rapport");
      setCurrenTopic(rq.kind === "greeting" ? "Introduction" : "Background");
      setCurrentDifficulty("basic"); // rapport is always shown as basic
      setFollowupCount(0);
      currentExchangesRef.current = [];
      setLiveTranscript("");

      // Speak the rapport question
      setCurrentQuestion(rq.question);
      setAiMode("speaking");
      await speak(rq.question);

      // Listen once — no follow-up loop on rapport
      setAiMode("listening");
      setLiveTranscript("");
      const answer = await listenForAnswer(
        (t) => setLiveTranscript(t),
        (s) => setSilenceCountdown(s),
        forceSubmitRef,
      );

      const exchanges: Exchange[] = [{ question: rq.question, answer }];
      currentExchangesRef.current = exchanges;

      // Record in transcript as unscored
      transcriptRef.current.push({
        id:         `rapport-${rq.id}`,
        category:   "rapport",
        topic:      rq.kind === "greeting" ? "Greeting" : "Self Introduction",
        key_points: [],
        exchanges,
        final_eval: null,
        scored:     false,
      });
    }

    // ── PHASE 2: Main questions ───────────────────────────────────────────
    for (let qi = 0; qi < qs.length; qi++) {
      if (terminated) break;
      const mq = qs[qi];

      globalIndex += 1;
      setQuestionIndex(globalIndex);
      setFollowupCount(0);
      currentExchangesRef.current = [];

      // Difficulty starts at the question's labelled difficulty
      let activeDifficulty = mq.difficulty || "basic";
      setCurrentDifficulty(activeDifficulty);

      const questionText = `${mq.transition || ""} ${mq.question}`.trim();
      setCurrentQuestion(questionText);
      setCurrenTopic(mq.topic);
      setCurrentCategory(mq.category);
      setLiveTranscript("");

      // ── Signal tracking for this question ───────────────────────────────
      signalsRef.current.startQuestion(mq.id);

      // Speak the question
      setAiMode("speaking");
      await speak(questionText);

      // Listen for initial answer
      setAiMode("listening");
      setLiveTranscript("");
      const answer = await listenForAnswer(
        (t) => setLiveTranscript(t),
        (s) => setSilenceCountdown(s),
        forceSubmitRef,
      );

      const exchanges: Exchange[] = [{ question: mq.question, answer }];
      currentExchangesRef.current = exchanges;

      let lastEval: any = null;

      // ── Follow-up loop — driven entirely by backend recommendations ────
      for (let fu = 0; fu < MAX_FOLLOWUPS; fu++) {
        setAiMode("processing");

        let evalResult: Awaited<ReturnType<typeof evaluateAnswer>>;
        try {
          evalResult = await evaluateAnswer(mq, exchanges, fu + 1, activeDifficulty);
        } catch (e: any) {
          console.error("Eval error:", e.message);
          break;
        }
        lastEval = evalResult.evaluation;

        // Update difficulty based on backend delta (clamped server-side already)
        activeDifficulty = nextDifficulty(activeDifficulty, evalResult.difficulty_delta);
        setCurrentDifficulty(activeDifficulty);

        // Backend decides the action — no threshold reimplementation here
        const action = evalResult.recommended_action; // "deepen" | "rephrase" | "move_on"
        if (action === "move_on") break;

        // Map action to followup mode
        const fuMode = action === "rephrase" ? "rephrase" : "deepen";

        let followupData: { reaction: string; followup_question: string };
        try {
          followupData = await generateFollowup(mq, exchanges, fuMode, activeDifficulty);
        } catch (e: any) {
          console.error("Followup error:", e.message);
          break;
        }

        const fuText = `${followupData.reaction} ${followupData.followup_question}`.trim();
        setFollowupCount(fu + 1);
        setCurrentQuestion(fuText);
        setLiveTranscript("");

        setAiMode("speaking");
        await speak(fuText);

        setAiMode("listening");
        setLiveTranscript("");
        const fuAnswer = await listenForAnswer(
          (t) => setLiveTranscript(t),
          (s) => setSilenceCountdown(s),
          forceSubmitRef,
        );

        exchanges.push({ question: followupData.followup_question, answer: fuAnswer });
        currentExchangesRef.current = exchanges;
      }

      correctnessHistory.current.push(lastEval?.combined_score ?? lastEval?.correctness_score ?? 0.5);
      transcriptRef.current.push({
        id:         mq.id,
        category:   mq.category,
        topic:      mq.topic,
        key_points: mq.key_points || [],
        exchanges,
        final_eval: lastEval,
        scored:     true,
      });

      // ── Collect per-question signals aggregate ───────────────────────────
      const agg = signalsRef.current.endQuestion(
        proctoringRef.current.violations.filter(
          v => v.startTime >= (Date.now() - 300_000), // last 5 min — wide window
        ),
      );
      if (agg) signalAggregatesRef.current.push(agg);
    }

    // ── Final scoring ─────────────────────────────────────────────────────
    setAiMode("processing");
    setCurrentQuestion("Scoring your interview, please wait…");
    setCurrenTopic("");
    setCurrentCategory("");
    setCurrentDifficulty("basic");
    setLiveTranscript("");

    // Submit signals in parallel with final scoring — non-blocking
    submitSignals(signalAggregatesRef.current);

    // ── Helper: save score regardless of whether AI scoring succeeds ──────
    const saveInterviewScore = async (score: number, notes: string) => {
      if (!state.applicationId) return;
      try {
        await fetch(`${API}/applications/${state.applicationId}/score`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            round:     "interview",
            score:     Math.round(score * 10) / 10,
            max_score: 10,
            notes,
          }),
        });
      } catch (e) {
        console.error("Failed to save interview score:", e);
      }
    };

    try {
      const result = await computeFinalScore();
      setFinalResult(result);
      // Save AI-computed score
      await saveInterviewScore(
        result.overall_score ?? 0,
        result.summary || "",
      );
    } catch (e: any) {
      setErrorMsg("Could not generate final score: " + e.message);
      // Fallback: save score derived from correctness history average
      const avgCorrectness = correctnessHistory.current.length > 0
        ? correctnessHistory.current.reduce((a, b) => a + b, 0) / correctnessHistory.current.length
        : 0;
      await saveInterviewScore(
        Math.round(avgCorrectness * 10 * 10) / 10,  // scale 0-1 → 0-10
        "Score estimated from answer quality (AI scoring unavailable)",
      );
    }
    setIsFinished(true);
  }, [evaluateAnswer, generateFollowup, computeFinalScore, submitSignals, terminated]);

  // Start on mount when questions are ready
  useEffect(() => {
    if (questions.length > 0 && !runningRef.current) {
      runInterview(rapportQuestions, questions);
    }
  }, [questions, rapportQuestions, runInterview]);

  // ─────────────────────────────────────────────────────────────────────────
  // TERMINATED screen
  // ─────────────────────────────────────────────────────────────────────────
  if (terminated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-20 h-20 text-destructive mx-auto mb-6" />
          <h1 className="font-display text-4xl text-destructive tracking-wider mb-4 neon-glow"
            style={{ textShadow: "0 0 10px hsl(0 84% 60% / 0.6), 0 0 40px hsl(0 84% 60% / 0.3)" }}>
            INTERVIEW TERMINATED
          </h1>
          <p className="text-muted-foreground mb-8">Session ended due to policy violation</p>
          <Link to="/candidate/dashboard"
            className="px-6 py-3 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FINISHED / RESULTS screen
  // ─────────────────────────────────────────────────────────────────────────
  if (isFinished) {
    const r = finalResult || {};
    const isJobInterview = !!state.applicationId;

    // ── Job interview: show thank-you, not scores ─────────────────────────
    if (isJobInterview) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-lg w-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-6">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-display text-3xl text-foreground tracking-widest mb-3">
              THANK YOU!
            </h1>
            <p className="text-lg text-muted-foreground mb-2">
              Thanks for attempting the interview round.
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Your results will be reviewed and declared soon. You'll be notified about the outcome.
            </p>
            <GlassCard variant="neon" hover={false} className="mb-8 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 text-lg">✓</span>
                </div>
                <p className="text-sm font-medium text-foreground">All rounds completed</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your responses have been recorded and submitted for evaluation. The recruiter will review your performance across all rounds.
              </p>
            </GlassCard>
            <div className="flex gap-3 justify-center">
              <Link to="/candidate/interviews"
                className="px-6 py-3 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all">
                Back to Interviews
              </Link>
              <Link to="/candidate/dashboard"
                className="px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-all">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl text-foreground tracking-widest mb-1">INTERVIEW COMPLETE</h1>
          <p className="text-muted-foreground text-sm">{state.jobData?.title || "Interview"}</p>
        </div>

        {errorMsg ? (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6">{errorMsg}</div>
        ) : (
          <>
            {/* Overall score */}
            <GlassCard variant="neon" className="mb-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overall Score</p>
              <p className="font-display text-6xl text-primary neon-glow">{r.overall_score ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">out of 10</p>
            </GlassCard>

            {/* Score breakdown */}
            <GlassCard variant="neon" className="mb-4">
              <h3 className="text-sm font-semibold text-foreground mb-4">Score Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "Technical Score",     value: r.technical_score },
                  { label: "Behavioral Score",    value: r.behavioral_score },
                  { label: "Technical Accuracy",  value: r.technical_correctness },
                  { label: "Technical Depth",     value: r.technical_depth },
                  { label: "Problem Solving",     value: r.problem_solving },
                  { label: "Communication",       value: r.communication_clarity },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-36 flex-shrink-0">{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted/30">
                      <div className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${((value ?? 0) / 10) * 100}%` }} />
                    </div>
                    <span className="text-xs font-mono text-foreground w-8 text-right">{value ?? "—"}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Summary */}
            {r.summary && (
              <GlassCard variant="neon" className="mb-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Summary</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{r.summary}</p>
              </GlassCard>
            )}

            {/* Strengths & weaknesses */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <GlassCard variant="neon">
                <h3 className="text-sm font-semibold text-green-400 mb-2">Strengths</h3>
                <ul className="space-y-1">
                  {(r.strengths || []).map((s: string, i: number) => (
                    <li key={i} className="text-xs text-foreground/80 flex gap-2">
                      <span className="text-green-400 flex-shrink-0">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </GlassCard>
              <GlassCard variant="neon">
                <h3 className="text-sm font-semibold text-amber-400 mb-2">Areas to Improve</h3>
                <ul className="space-y-1">
                  {(r.weaknesses || []).map((w: string, i: number) => (
                    <li key={i} className="text-xs text-foreground/80 flex gap-2">
                      <span className="text-amber-400 flex-shrink-0">→</span>{w}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </div>
          </>
        )}

        <div className="flex gap-3 justify-center">
          <Link to="/candidate/interviews"
            className="px-6 py-3 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all">
            Back to Interviews
          </Link>
          <Link to="/candidate/dashboard"
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-all">
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN INTERVIEW screen
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background p-4 flex flex-col">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-sm tracking-widest text-foreground">INTERVIEW ROOM</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Question</span>
            <span className="font-display text-primary">{questionIndex}/{totalQuestions || "?"}</span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-foreground">{formatTime(elapsedSec)}</span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Difficulty</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i <= difficultyLevel ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
          {followupCount > 0 && (
            <div className="glass-panel px-3 py-2">
              <span className="text-xs text-amber-400">Follow-up {followupCount}/{MAX_FOLLOWUPS}</span>
            </div>
          )}
          <button onClick={() => setTerminated(true)}
            className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main grid — grows to fill remaining screen height ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">

        {/* AI avatar + question */}
        <GlassCard variant="neon" hover={false} className="flex flex-col items-center justify-center relative scan-line p-6 gap-4 h-full">

          {/* Orb */}
          <div className="relative">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center
              ${aiMode === "speaking" ? "pulse-glow" : ""}`}>
              <Brain className={`w-10 h-10 ${aiMode === "speaking" ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            {aiMode === "speaking" && (
              <span className="absolute inset-0 rounded-full border border-primary/40 animate-ping" />
            )}
          </div>

          {/* Mode label */}
          <div className="flex items-center gap-2">
            {aiMode === "speaking"  && <><Volume2 className="w-4 h-4 text-primary animate-pulse" /><span className="text-xs text-primary">Speaking…</span></>}
            {aiMode === "listening" && <><Mic className="w-4 h-4 text-green-400 animate-pulse" /><span className="text-xs text-green-400">Listening — speak your answer</span></>}
            {aiMode === "processing" && <><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span className="text-xs text-muted-foreground">Thinking…</span></>}
          </div>

          {/* Question text */}
          {currentQuestion && (
            <div className="w-full p-4 rounded-xl bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">{currentCategory}</span>
                {currentTopic && <span className="text-[10px] text-muted-foreground">· {currentTopic}</span>}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{currentQuestion}</p>
            </div>
          )}

          {/* Waveform when speaking */}
          {aiMode === "speaking" && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <Mic className="w-4 h-4 text-primary" />
              <WaveformAnimation bars={12} className="h-6" />
            </div>
          )}
        </GlassCard>

        {/* Candidate camera + live transcript */}
        <div className="flex flex-col gap-4 h-full min-h-0">
          {/* Camera feed — CameraPreview owns the video element */}
          <div className="flex-1 min-h-0">
            <CameraPreview
              videoRef={faceAnalysis.videoRef}
              ready={faceAnalysis.ready}
              error={faceAnalysis.error}
              proctoringStatus={proctoring.status}
              activeViolations={proctoring.activeViolations}
            />
          </div>

          {/* Live transcript box */}
          <GlassCard variant="neon" hover={false} className="p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-3 h-3" /> Your Answer
              </h4>
              {aiMode === "listening" && (
                <span className="text-xs text-amber-400">
                  Auto-submits in {silenceCountdown}s
                </span>
              )}
            </div>
            <p className={`text-sm min-h-[48px] leading-relaxed ${
              liveTranscript ? "text-foreground" : "text-muted-foreground/50 italic"
            }`}>
              {liveTranscript || (aiMode === "listening" ? "Start speaking…" : "Waiting…")}
            </p>
            {/* Submit button — only shown while actively listening */}
            {aiMode === "listening" && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => forceSubmitRef.current?.()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-semibold hover:bg-green-500/30 active:scale-95 transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  Submit Answer
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* ── Camera-denied blocking modal ── */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border/50 rounded-2xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto">
              <ShieldOff className="w-7 h-7 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground mb-1">Camera Access Required</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {faceAnalysis.error === "permission_denied_os"
                  ? "Your operating system is blocking camera access. Open System Preferences / Settings → Privacy → Camera and allow your browser."
                  : faceAnalysis.error === "not_found"
                  ? "No camera was detected. Connect a webcam and reload the page."
                  : faceAnalysis.error === "in_use"
                  ? "Your camera is being used by another application. Close it and reload."
                  : "Camera access was denied. Click the camera icon in your browser's address bar to allow access, then reload."}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                Reload &amp; Try Again
              </button>
              <button
                onClick={() => setShowCameraModal(false)}
                className="w-full py-2.5 rounded-lg border border-border/40 text-muted-foreground text-sm hover:bg-muted/20 transition-all"
              >
                Continue Without Camera
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dev debug panel (VITE_DEBUG_PROCTORING=true only) ── */}
      <ProctoringDebugPanel
        lastFrame={faceAnalysis.lastFrame}
        proctoring={proctoring}
        signals={signals}
      />
    </div>
  );
};

export default InterviewRoom;
