import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import WaveformAnimation from "@/components/WaveformAnimation";
import {
  Brain, Camera, Clock, AlertTriangle, Mic, BarChart3,
  TrendingUp, X, ChevronRight, Volume2,
} from "lucide-react";
import { Link } from "react-router-dom";

const API = "http://localhost:8000/api/v1";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Question {
  id: number;
  category: string;
  topic: string;
  transition: string;
  question: string;
  key_points: string[];
  ideal_depth: string;
}

interface Exchange {
  question: string;
  answer: string;
}

interface TranscriptItem {
  id: number;
  category: string;
  topic: string;
  key_points: string[];
  exchanges: Exchange[];
  final_eval: any;
}

type AiMode = "idle" | "speaking" | "listening" | "processing";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const MAX_FOLLOWUPS          = 3;
const FOLLOWUP_BASE_THRESH   = 0.6;
const FOLLOWUP_HYSTERESIS    = 0.15;
const FOLLOWUP_MIN_THRESH    = 0.25;
const SILENCE_TIMEOUT_MS     = 15000;

function followupThreshold(followupCount: number) {
  return Math.max(FOLLOWUP_BASE_THRESH - FOLLOWUP_HYSTERESIS * followupCount, FOLLOWUP_MIN_THRESH);
}

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

function transcriptToText(items: TranscriptItem[]) {
  return items.map(item => {
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
      try { recognition.onend = null; recognition.onerror = null; recognition.stop(); } catch { /* ignore */ }
      resolve(currentText());
    }

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
    questions?:        Question[];
    candidateProfile?: any;
    jobData?:          any;
    applicationId?:    string;
  };

  // ── Core interview state ──────────────────────────────────────────────────
  const [questions,         setQuestions]         = useState<Question[]>(state.questions || []);
  const [questionIndex,     setQuestionIndex]     = useState(0);
  const [aiMode,            setAiMode]            = useState<AiMode>("processing");
  const [currentQuestion,   setCurrentQuestion]   = useState("");
  const [currentTopic,      setCurrenTopic]       = useState("");
  const [currentCategory,   setCurrentCategory]   = useState("");
  const [liveTranscript,    setLiveTranscript]    = useState("");
  const [silenceCountdown,  setSilenceCountdown]  = useState(15);
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

  // ── Difficulty dots (based on correctness history) ────────────────────────
  const difficultyLevel = correctnessHistory.current.length === 0 ? 1
    : mean(correctnessHistory.current) >= 0.75 ? 3
    : mean(correctnessHistory.current) >= 0.45 ? 2 : 1;

  // ── API helpers ───────────────────────────────────────────────────────────
  const evaluateAnswer = useCallback(async (
    mq: Question,
    exchanges: Exchange[],
  ) => {
    const res = await fetch(`${API}/interview-ai/evaluate-answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        main_question:        mq.question,
        key_points:           mq.key_points,
        ideal_depth:          mq.ideal_depth,
        exchanges,
        full_transcript_text: transcriptToText(transcriptRef.current),
        strength_label:       strengthLabel(correctnessHistory.current),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || "Evaluation failed");
    return data.evaluation;
  }, []);

  const generateFollowup = useCallback(async (
    mq: Question,
    exchanges: Exchange[],
  ) => {
    const res = await fetch(`${API}/interview-ai/followup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        main_question:        mq.question,
        exchanges,
        full_transcript_text: transcriptToText(transcriptRef.current),
        strength_label:       strengthLabel(correctnessHistory.current),
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

  // ── Main interview orchestration ──────────────────────────────────────────
  const runInterview = useCallback(async (qs: Question[]) => {
    if (runningRef.current) return;
    runningRef.current = true;

    for (let qi = 0; qi < qs.length; qi++) {
      if (terminated) break;
      const mq = qs[qi];

      setQuestionIndex(qi + 1);
      setFollowupCount(0);
      currentExchangesRef.current = [];

      const questionText = `${mq.transition || ""} ${mq.question}`.trim();
      setCurrentQuestion(questionText);
      setCurrenTopic(mq.topic);
      setCurrentCategory(mq.category);
      setLiveTranscript("");

      // Speak the question
      setAiMode("speaking");
      await speak(questionText);

      // Listen for answer
      setAiMode("listening");
      setLiveTranscript("");
      const answer = await listenForAnswer(
        (t) => setLiveTranscript(t),
        (s) => setSilenceCountdown(s),
      );

      const exchanges: Exchange[] = [{ question: mq.question, answer }];
      currentExchangesRef.current = exchanges;

      let lastEval: any = null;

      // Follow-up loop
      for (let fu = 0; fu < MAX_FOLLOWUPS; fu++) {
        setAiMode("processing");

        let evalResult: any;
        try {
          evalResult = await evaluateAnswer(mq, exchanges);
        } catch (e: any) {
          console.error("Eval error:", e.message);
          break;
        }
        lastEval = evalResult;

        const threshold = followupThreshold(fu);
        if ((evalResult.completeness_score ?? 1.0) >= threshold) break;

        let followupData: { reaction: string; followup_question: string };
        try {
          followupData = await generateFollowup(mq, exchanges);
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
        );

        exchanges.push({ question: followupData.followup_question, answer: fuAnswer });
        currentExchangesRef.current = exchanges;
      }

      correctnessHistory.current.push(lastEval?.correctness_score ?? 0.5);
      transcriptRef.current.push({
        id:         mq.id,
        category:   mq.category,
        topic:      mq.topic,
        key_points: mq.key_points || [],
        exchanges,
        final_eval: lastEval,
      });
    }

    // Final scoring
    setAiMode("processing");
    setCurrentQuestion("Scoring your interview, please wait…");
    setCurrenTopic("");
    setCurrentCategory("");
    setLiveTranscript("");

    try {
      const result = await computeFinalScore();
      setFinalResult(result);
    } catch (e: any) {
      setErrorMsg("Could not generate final score: " + e.message);
    }
    setIsFinished(true);
  }, [evaluateAnswer, generateFollowup, computeFinalScore, terminated]);

  // Start on mount when questions are ready
  useEffect(() => {
    if (questions.length > 0 && !runningRef.current) {
      runInterview(questions);
    }
  }, [questions, runInterview]);

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
    <div className="min-h-screen bg-background p-4">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-sm tracking-widest text-foreground">INTERVIEW ROOM</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Question</span>
            <span className="font-display text-primary">{questionIndex}/{questions.length || "?"}</span>
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

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* AI avatar + question */}
        <GlassCard variant="neon" hover={false} className="flex flex-col items-center justify-center relative scan-line p-6 gap-4">

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
        <div className="flex flex-col gap-4">
          <GlassCard variant="neon" hover={false} className="flex-1 flex items-center justify-center relative min-h-[200px]">
            <div className="text-center">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Candidate Camera Feed</p>
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive animate-glow-pulse" />
              <span className="text-xs text-muted-foreground">LIVE</span>
            </div>
          </GlassCard>

          {/* Live transcript box */}
          <GlassCard variant="neon" hover={false} className="p-4">
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
          </GlassCard>
        </div>
      </div>

      {/* ── Metrics row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Emotion Analysis */}
        <GlassCard variant="neon" hover={false}>
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="w-3 h-3" /> Emotion Analysis
          </h4>
          <div className="space-y-2">
            {[
              { label: "Confidence", value: 78, color: "bg-primary" },
              { label: "Calm",       value: 65, color: "bg-neon-purple" },
              { label: "Engaged",    value: 82, color: "bg-primary" },
              { label: "Stress",     value: 25, color: "bg-destructive" },
            ].map((e) => (
              <div key={e.label} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">{e.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted/30">
                  <div className={`h-full rounded-full ${e.color} transition-all`} style={{ width: `${e.value}%` }} />
                </div>
                <span className="text-xs font-mono text-foreground w-8">{e.value}%</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Confidence meter */}
        <GlassCard variant="neon" hover={false} className="flex flex-col items-center justify-center">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Confidence</h4>
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(222, 30%, 14%)" strokeWidth="6" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke="hsl(185, 100%, 50%)" strokeWidth="6"
                strokeDasharray={`${78 * 2.64} ${264 - 78 * 2.64}`}
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_hsl(185_100%_50%/0.5)]"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-2xl text-primary neon-glow">78%</span>
            </div>
          </div>
        </GlassCard>

        {/* Voice stability */}
        <GlassCard variant="neon" hover={false}>
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" /> Voice Stability
          </h4>
          <WaveformAnimation bars={24} className="h-16 mb-3" />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Stability</span>
            <span className="text-primary font-mono">86%</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default InterviewRoom;
