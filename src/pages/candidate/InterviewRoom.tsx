import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import WaveformAnimation from "@/components/WaveformAnimation";
import { CandidateCamera } from "@/components/CandidateCamera";
import { InterviewerAvatar } from "@/components/InterviewerAvatar";
import {
  Brain, Camera, Clock, AlertTriangle, Mic, MicOff, BarChart3,
  TrendingUp, X, Volume2, ArrowLeft, RefreshCw, CheckCircle2, Send,
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
  transition?: string;
  question: string;
  key_points?: string[];
  ideal_depth?: string;
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
const MAX_FOLLOWUPS        = 3;
const FOLLOWUP_BASE_THRESH = 0.6;
const FOLLOWUP_HYSTERESIS  = 0.15;
const FOLLOWUP_MIN_THRESH  = 0.25;
const SILENCE_TIMEOUT_MS   = 15000;

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
    const lines = [`[${(item.category || "").toUpperCase()}] Topic: ${item.topic || ""}`];
    (item.exchanges || []).forEach(e => {
      lines.push(`Q: ${e.question}`);
      lines.push(`A: ${e.answer}`);
    });
    return lines.join("\n");
  }).join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS helper (with termination check)
// ─────────────────────────────────────────────────────────────────────────────
function speak(text: string, isTerminated: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (isTerminated()) { resolve(); return; }
    const clean = (text || "").trim();
    if (!clean || !("speechSynthesis" in window)) { resolve(); return; }

    try {
      window.speechSynthesis.cancel();
      if (isTerminated()) { resolve(); return; }

      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.lang = "en-US";
      let done = false;

      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };

      utter.onend = finish;
      utter.onerror = finish;

      const checkInterval = setInterval(() => {
        if (isTerminated()) {
          clearInterval(checkInterval);
          try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
          finish();
        }
      }, 100);

      const estMs = Math.min(Math.max(clean.length * 60, 1200), 20000);
      setTimeout(() => {
        clearInterval(checkInterval);
        finish();
      }, estMs + 2500);

      window.speechSynthesis.speak(utter);
    } catch {
      resolve();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio Transcription via Groq Whisper (Universal fallback for Brave/Privacy browsers)
// ─────────────────────────────────────────────────────────────────────────────
async function transcribeAudioBlob(blob: Blob): Promise<string> {
  if (!blob || blob.size < 500) return "";
  try {
    const formData = new FormData();
    formData.append("file", blob, "speech.webm");
    const res = await fetch(`${API}/interview-ai/transcribe-audio`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) return "";
    const data = await res.json();
    return (data.text || "").trim();
  } catch (err) {
    console.warn("Whisper transcription failed:", err);
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STT helper (SpeechRecognition + MediaRecorder Whisper AI + Manual Input)
// ─────────────────────────────────────────────────────────────────────────────
function listenForAnswer(
  onInterim: (text: string) => void,
  onCountdown: (sec: number) => void,
  isTerminated: () => boolean,
  setActiveRecognition: (rec: any) => void,
  registerSubmit: (submitFn: () => void) => void,
  getCurrentManualText: () => string,
  mediaStream: MediaStream | null,
): Promise<string> {
  return new Promise(async (resolve) => {
    if (isTerminated()) { resolve(""); return; }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    let finalText = "";
    let interimText = "";
    let finished = false;
    let lastSpeech = Date.now();
    let interval: ReturnType<typeof setInterval>;
    let recognition: any = null;
    let mediaRecorder: MediaRecorder | null = null;
    let audioChunks: Blob[] = [];

    // Setup MediaRecorder for universal STT (Brave, Chrome, Firefox, Safari)
    if (mediaStream && typeof MediaRecorder !== "undefined") {
      try {
        const audioTracks = mediaStream.getAudioTracks();
        if (audioTracks.length > 0) {
          const audioOnlyStream = new MediaStream([audioTracks[0]]);
          let mime = "";
          if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) mime = "audio/webm;codecs=opus";
          else if (MediaRecorder.isTypeSupported("audio/webm")) mime = "audio/webm";
          else if (MediaRecorder.isTypeSupported("audio/mp4")) mime = "audio/mp4";

          mediaRecorder = new MediaRecorder(audioOnlyStream, mime ? { mimeType: mime } : undefined);
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunks.push(e.data);
            }
          };
          mediaRecorder.start(400); // 400ms slices
        }
      } catch (recErr) {
        console.warn("MediaRecorder init notice:", recErr);
      }
    }

    function currentText() {
      const manual = getCurrentManualText().trim();
      const stt = (finalText + " " + interimText).trim();
      return manual || stt;
    }

    async function finalize() {
      if (finished) return;
      finished = true;
      clearInterval(interval);
      setActiveRecognition(null);

      if (recognition) {
        try {
          recognition.onend = null;
          recognition.onerror = null;
          recognition.onresult = null;
          recognition.stop();
          recognition.abort();
        } catch { /* ignore */ }
      }

      let text = currentText();

      // If text is still empty, transcribe the recorded audio via Groq Whisper
      if (!text && mediaRecorder && audioChunks.length > 0) {
        try {
          if (mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
          }
          await new Promise((r) => setTimeout(r, 200));
          const fullBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
          if (fullBlob.size > 1000) {
            onInterim("Transcribing your speech via Whisper AI…");
            const whisperResult = await transcribeAudioBlob(fullBlob);
            if (whisperResult) {
              text = whisperResult;
              onInterim(whisperResult);
            }
          }
        } catch (whisperErr) {
          console.warn("Whisper finalize error:", whisperErr);
        }
      } else if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try { mediaRecorder.stop(); } catch { /* ignore */ }
      }

      resolve(text);
    }

    // Register submit callback for user's manual "Submit Answer" button
    registerSubmit(finalize);

    // Periodic Whisper check if browser STT is shielded/blocked (common in Brave)
    let periodicWhisperTimer: ReturnType<typeof setInterval>;
    if (mediaRecorder) {
      periodicWhisperTimer = setInterval(async () => {
        if (finished || isTerminated()) {
          clearInterval(periodicWhisperTimer);
          return;
        }
        // If browser STT has not produced any transcript but user has spoken audio:
        if (!finalText && !interimText && audioChunks.length >= 6) {
          try {
            const currentBlob = new Blob([...audioChunks], { type: mediaRecorder?.mimeType || "audio/webm" });
            const partial = await transcribeAudioBlob(currentBlob);
            if (partial && !finished && !getCurrentManualText().trim()) {
              onInterim(partial);
              lastSpeech = Date.now();
            }
          } catch { /* ignore */ }
        }
      }, 3500);
    }

    function tick() {
      if (isTerminated()) {
        if (periodicWhisperTimer) clearInterval(periodicWhisperTimer);
        finalize();
        return;
      }
      const remaining = SILENCE_TIMEOUT_MS - (Date.now() - lastSpeech);
      onCountdown(Math.max(0, Math.ceil(remaining / 1000)));
      if (remaining <= 0) {
        if (periodicWhisperTimer) clearInterval(periodicWhisperTimer);
        finalize();
      }
    }

    if (SR) {
      try {
        recognition = new SR();
        recognition.lang = "en-US";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          if (isTerminated() || finished) return;
          interimText = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalText += piece + " ";
            else interimText += piece;
          }
          lastSpeech = Date.now();
          const combined = (finalText + " " + interimText).trim();
          onInterim(combined);
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition notice:", event.error);
        };

        recognition.onend = () => {
          if (!finished && !isTerminated()) {
            setTimeout(() => {
              if (!finished && !isTerminated() && recognition) {
                try { recognition.start(); } catch { /* ignore */ }
              }
            }, 150);
          }
        };

        recognition.start();
        setActiveRecognition(recognition);
      } catch (err) {
        console.warn("Could not initialize SpeechRecognition:", err);
      }
    }

    lastSpeech = Date.now();
    interval = setInterval(tick, 250);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const InterviewRoom = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params   = useParams<{ interviewId?: string }>();

  const state = (location.state || {}) as {
    questions?:         Question[];
    rapport_questions?: Question[];
    candidateProfile?:  any;
    jobData?:           any;
    applicationId?:     string;
  };

  const initialQuestions: Question[] = useMemo(() => {
    const list: Question[] = [];
    if (Array.isArray(state.rapport_questions)) {
      list.push(...state.rapport_questions);
    }
    if (Array.isArray(state.questions)) {
      list.push(...state.questions);
    }
    return list;
  }, [state.questions, state.rapport_questions]);

  // ── Core interview state ──────────────────────────────────────────────────
  const [questions,        setQuestions]        = useState<Question[]>(initialQuestions);
  const [questionIndex,    setQuestionIndex]    = useState(0);
  const [aiMode,           setAiMode]           = useState<AiMode>("processing");
  const [currentQuestion,  setCurrentQuestion]  = useState("");
  const [currentTopic,     setCurrentTopic]     = useState("");
  const [currentCategory,  setCurrentCategory]  = useState("");
  const [liveTranscript,   setLiveTranscript]   = useState("");
  const [silenceCountdown, setSilenceCountdown] = useState(15);
  const [followupCount,    setFollowupCount]    = useState(0);
  const [isFinished,       setIsFinished]       = useState(false);
  const [terminated,       setTerminated]       = useState(false);
  const [finalResult,      setFinalResult]      = useState<any>(null);
  const [elapsedSec,       setElapsedSec]       = useState(0);
  const [errorMsg,         setErrorMsg]         = useState("");
  const [audioLevel,       setAudioLevel]       = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const transcriptRef          = useRef<TranscriptItem[]>([]);
  const correctnessHistory     = useRef<number[]>([]);
  const currentExchangesRef    = useRef<Exchange[]>([]);
  const runningRef             = useRef(false);
  const terminatedRef          = useRef(false);
  const activeRecognitionRef   = useRef<any>(null);
  const manualAnswerRef        = useRef("");
  const submitCurrentAnswerRef = useRef<(() => void) | null>(null);
  const audioContextRef        = useRef<AudioContext | null>(null);
  const animFrameRef           = useRef<number | null>(null);
  const mediaStreamRef         = useRef<MediaStream | null>(null);

  // Helper function to check termination across all async operations
  const isTerminated = useCallback(() => terminatedRef.current, []);

  // ── Audio Level Meter from Camera/Mic stream ─────────────────────────────
  const handleMediaStream = useCallback((stream: MediaStream) => {
    mediaStreamRef.current = stream;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch { /* ignore */ }
      }
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = ctx;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (terminatedRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn("AudioContext visualizer error:", e);
    }
  }, []);

  // ── Terminate Interview Handler ───────────────────────────────────────────
  const handleTerminate = useCallback(() => {
    terminatedRef.current = true;
    runningRef.current = false;

    // Immediately stop speech synthesis audio
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch { /* ignore */ }
    }

    // Immediately stop speech recognition
    if (activeRecognitionRef.current) {
      try {
        activeRecognitionRef.current.onend = null;
        activeRecognitionRef.current.onerror = null;
        activeRecognitionRef.current.onresult = null;
        activeRecognitionRef.current.abort();
      } catch { /* ignore */ }
      activeRecognitionRef.current = null;
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch { /* ignore */ }
    }

    setAiMode("idle");
    setTerminated(true);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      terminatedRef.current = true;
      runningRef.current = false;
      if ("speechSynthesis" in window) {
        try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
      }
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.onend = null;
          activeRecognitionRef.current.onerror = null;
          activeRecognitionRef.current.onresult = null;
          activeRecognitionRef.current.abort();
        } catch { /* ignore */ }
        activeRecognitionRef.current = null;
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch { /* ignore */ }
      }
    };
  }, []);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isFinished || terminated || questions.length === 0) return;
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isFinished, terminated, questions.length]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  // ── Difficulty dots ───────────────────────────────────────────────────────
  const difficultyLevel = correctnessHistory.current.length === 0 ? 1
    : mean(correctnessHistory.current) >= 0.75 ? 3
    : mean(correctnessHistory.current) >= 0.45 ? 2 : 1;

  // ── API helpers ───────────────────────────────────────────────────────────
  const respondToCandidate = useCallback(async (
    mq: Question,
    utterance: string,
    exchanges: Exchange[],
    attemptNumber: number = 0,
  ) => {
    if (terminatedRef.current) return null;
    const res = await fetch(`${API}/interview-ai/respond-to-candidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        main_question:        mq.question,
        category:             mq.category || "technical",
        key_points:           mq.key_points || [],
        ideal_depth:          mq.ideal_depth || "",
        candidate_utterance:  utterance,
        exchanges,
        attempt_number:       attemptNumber,
      }),
    });
    if (terminatedRef.current) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || "Turn failed");
    return data;
  }, []);

  const computeFinalScore = useCallback(async () => {
    if (terminatedRef.current) return null;
    const res = await fetch(`${API}/interview-ai/final-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidate:  state.candidateProfile || {},
        job:        state.jobData          || {},
        transcript: transcriptRef.current,
      }),
    });
    if (terminatedRef.current) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || "Scoring failed");
    return data.result;
  }, [state.candidateProfile, state.jobData]);

  // ── Main interview orchestration ──────────────────────────────────────────
  const runInterview = useCallback(async (qs: Question[]) => {
    if (runningRef.current || qs.length === 0 || terminatedRef.current) return;
    runningRef.current = true;

    for (let qi = 0; qi < qs.length; qi++) {
      if (terminatedRef.current) break;
      const mq = qs[qi];

      setQuestionIndex(qi + 1);
      setFollowupCount(0);
      currentExchangesRef.current = [];

      const questionText = `${mq.transition || ""} ${mq.question}`.trim();
      setCurrentQuestion(questionText);
      setCurrentTopic(mq.topic || "");
      setCurrentCategory(mq.category || "");
      setLiveTranscript("");
      manualAnswerRef.current = "";

      // Speak the initial question
      setAiMode("speaking");
      await speak(questionText, isTerminated);
      if (terminatedRef.current) break;

      let lastEval: any = null;
      let questionResolved = false;
      let turnCount = 0;
      let silenceRetries = 0;
      const exchanges: Exchange[] = [];

      // Conversational interaction loop on THIS question (handles candidate questions, clarifications, followups)
      while (!questionResolved && turnCount < 4 && !terminatedRef.current) {
        setAiMode("listening");
        setLiveTranscript("");
        manualAnswerRef.current = "";

        const spokenAnswer = await listenForAnswer(
          (t) => {
            if (!terminatedRef.current) {
              setLiveTranscript(t);
              manualAnswerRef.current = t;
            }
          },
          (s) => { if (!terminatedRef.current) setSilenceCountdown(s); },
          isTerminated,
          (rec) => { activeRecognitionRef.current = rec; },
          (submitFn) => { submitCurrentAnswerRef.current = submitFn; },
          () => manualAnswerRef.current,
          mediaStreamRef.current,
        );
        if (terminatedRef.current) break;

        const candidateText = (spokenAnswer || "").trim();

        // 1. Check for silence / empty speech:
        if (!candidateText || candidateText.length < 3) {
          if (silenceRetries === 0) {
            silenceRetries++;
            const promptRetry = "I didn't quite hear an answer. Whenever you're ready, feel free to speak, type your answer, or ask if you'd like me to clarify!";
            setCurrentQuestion(promptRetry);
            setAiMode("speaking");
            await speak(promptRetry, isTerminated);
            if (terminatedRef.current) break;
            continue;
          } else {
            // Still silent: move on gracefully
            const promptSkip = "No worries at all, let's move forward to the next question.";
            setCurrentQuestion(promptSkip);
            setAiMode("speaking");
            await speak(promptSkip, isTerminated);
            if (terminatedRef.current) break;
            lastEval = { correctness_score: 0.0, depth_score: 0.0, completeness_score: 0.0, reason: "Candidate remained silent." };
            break;
          }
        }

        // 2. Intelligent Conversational Turn: analyze candidate's question, don't-know, or answer
        setAiMode("processing");
        let turnResult: any;
        try {
          turnResult = await respondToCandidate(mq, candidateText, exchanges, turnCount);
        } catch (e: any) {
          console.error("Turn error:", e.message);
          break;
        }
        if (terminatedRef.current || !turnResult) break;

        const { intent, spoken_response, action, evaluation } = turnResult;

        if (intent === "candidate_question") {
          // CANDIDATE ASKED A QUESTION (e.g. "Can you explain what closures are?" or "Can you repeat that?")
          // Alex speaks the actual answer to the candidate's question and loops back to listen!
          setCurrentQuestion(spoken_response);
          setAiMode("speaking");
          await speak(spoken_response, isTerminated);
          if (terminatedRef.current) break;
          // Remain on this question, do not count against answer attempts
          continue;
        }

        if (intent === "does_not_know") {
          // Candidate doesn't know / wants to pass
          setCurrentQuestion(spoken_response);
          setAiMode("speaking");
          await speak(spoken_response, isTerminated);
          if (terminatedRef.current) break;
          lastEval = evaluation;
          exchanges.push({ question: mq.question, answer: candidateText });
          break;
        }

        // intent === "answered": Candidate answered the question
        exchanges.push({ question: (exchanges.length === 0 ? mq.question : `Follow-up ${turnCount}`), answer: candidateText });
        currentExchangesRef.current = exchanges;
        lastEval = evaluation;
        turnCount++;

        // Speak Alex's natural reaction / follow-up probe / wrap-up
        setCurrentQuestion(spoken_response);
        setAiMode("speaking");
        await speak(spoken_response, isTerminated);
        if (terminatedRef.current) break;

        if (action === "followup" && turnCount < 3) {
          setFollowupCount(turnCount);
          // Loop again to listen for candidate's answer to Alex's follow-up!
          continue;
        } else {
          // Question complete: move to next main question
          questionResolved = true;
          break;
        }
      }

      if (terminatedRef.current) break;

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

    if (terminatedRef.current) {
      runningRef.current = false;
      return;
    }

    // Final scoring
    setAiMode("processing");
    setCurrentQuestion("Scoring your interview, please wait…");
    setCurrentTopic("");
    setCurrentCategory("");
    setLiveTranscript("");

    try {
      const result = await computeFinalScore();
      if (terminatedRef.current) return;
      setFinalResult(result);

      // If this was an actual application, record the score to the backend
      if (state.applicationId) {
        try {
          await fetch(`${API}/applications/${state.applicationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              application_status: "interview_completed",
              final_interview_score: result?.overall_score || 0,
            }),
          });
        } catch (err) {
          console.error("Could not update application score:", err);
        }
      }
    } catch (e: any) {
      if (!terminatedRef.current) {
        setErrorMsg("Could not generate final score: " + e.message);
      }
    }

    if (!terminatedRef.current) {
      setIsFinished(true);
      runningRef.current = false;
    }
  }, [respondToCandidate, computeFinalScore, isTerminated, state.applicationId]);

  // Start on mount when questions are ready
  useEffect(() => {
    if (questions.length > 0 && !runningRef.current && !terminatedRef.current) {
      runInterview(questions);
    }
  }, [questions, runInterview]);

  // ─────────────────────────────────────────────────────────────────────────
  // NO QUESTIONS / DIRECT ACCESS SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <GlassCard variant="neon" className="text-center max-w-md p-8 border border-border/50">
          <Brain className="w-16 h-16 text-primary mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Active Interview Session</h2>
          <p className="text-sm text-muted-foreground mb-6">
            To start an interview, please select a role in Practice Mode or launch your scheduled company interview.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              to="/candidate/practice"
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all text-center"
            >
              Start Practice Interview
            </Link>
            <Link
              to="/candidate/interviews"
              className="w-full py-2.5 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all text-center"
            >
              View Company Interviews
            </Link>
          </div>
        </GlassCard>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TERMINATED SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (terminated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-20 h-20 text-destructive mx-auto mb-6 animate-pulse" />
          <h1
            className="font-display text-4xl text-destructive tracking-wider mb-4 neon-glow"
            style={{ textShadow: "0 0 10px hsl(0 84% 60% / 0.6), 0 0 40px hsl(0 84% 60% / 0.3)" }}
          >
            INTERVIEW ENDED
          </h1>
          <p className="text-muted-foreground mb-8">
            Session has been completely terminated. All audio and recognition services have been stopped.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              to="/candidate/practice"
              className="px-6 py-2.5 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all"
            >
              Practice Mode
            </Link>
            <Link
              to="/candidate/dashboard"
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-all"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FINISHED / RESULTS SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (isFinished) {
    const r = finalResult || {};
    return (
      <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl text-foreground tracking-widest mb-1">INTERVIEW COMPLETE</h1>
          <p className="text-muted-foreground text-sm">{state.jobData?.title || "Practice Mode"}</p>
        </div>

        {errorMsg ? (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-6">
            {errorMsg}
          </div>
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
                  { label: "Technical Score",    value: r.technical_score },
                  { label: "Behavioral Score",   value: r.behavioral_score },
                  { label: "Technical Accuracy", value: r.technical_correctness },
                  { label: "Technical Depth",    value: r.technical_depth },
                  { label: "Problem Solving",    value: r.problem_solving },
                  { label: "Communication",      value: r.communication_clarity },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-36 flex-shrink-0">{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-muted/30">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${((value ?? 0) / 10) * 100}%` }}
                      />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          <Link
            to="/candidate/practice"
            className="px-6 py-3 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all"
          >
            Practice Again
          </Link>
          <Link
            to="/candidate/dashboard"
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN INTERVIEW SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-sm tracking-widest text-foreground">AI INTERVIEW ROOM</span>
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
          <button
            onClick={handleTerminate}
            className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-all cursor-pointer"
            title="End Interview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

        {/* AI interviewer avatar + question - LEFT */}
        <div className="flex flex-col gap-4">
          <GlassCard variant="neon" hover={false} className="aspect-video overflow-hidden p-0 relative">
            <InterviewerAvatar mode={aiMode} questionText={currentQuestion} />
          </GlassCard>

          {/* Question text box */}
          <GlassCard variant="neon" hover={false} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                  {currentCategory || "Technical Assessment"}
                </span>
                {currentTopic && <span className="text-[11px] text-muted-foreground">· {currentTopic}</span>}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {aiMode === "speaking" && (
                  <span className="text-primary font-medium flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 animate-pulse" /> Asking question
                  </span>
                )}
                {aiMode === "listening" && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Mic className="w-3.5 h-3.5 animate-pulse" /> Your turn to speak
                  </span>
                )}
                {aiMode === "processing" && (
                  <span className="text-amber-400 font-medium">Processing response...</span>
                )}
              </div>
            </div>
            <p className="text-sm min-h-[56px] text-foreground leading-relaxed font-medium">
              {currentQuestion || "Preparing your tailored interview question..."}
            </p>
          </GlassCard>
        </div>

        {/* Candidate camera + live transcript - RIGHT */}
        <div className="flex flex-col gap-4">
          <GlassCard variant="neon" hover={false} className="aspect-video flex items-center justify-center relative overflow-hidden p-0">
            <CandidateCamera enabled={!terminated} onStream={handleMediaStream} />
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <div className="w-2 h-2 rounded-full bg-destructive animate-glow-pulse" />
              <span className="text-[10px] font-semibold text-white tracking-wider">LIVE FEED</span>
            </div>
          </GlassCard>

          {/* Live transcript & interactive response box */}
          <GlassCard variant="neon" hover={false} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                  <Mic className={`w-3.5 h-3.5 ${audioLevel > 12 ? "text-emerald-400" : "text-primary"}`} />
                  Your Answer
                </h4>
                {/* Live Mic Audio Level Meter */}
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/20 border border-border/30">
                  {[1, 2, 3, 4, 5, 6].map((bar) => (
                    <div
                      key={bar}
                      className={`w-1 rounded-full transition-all duration-75 ${
                        audioLevel >= bar * 12
                          ? "bg-emerald-400 h-3 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                          : "bg-muted/40 h-1.5"
                      }`}
                    />
                  ))}
                  <span className="text-[10px] font-mono ml-1 text-muted-foreground">
                    {audioLevel > 12 ? (
                      <span className="text-emerald-400 font-medium">Voice Detected</span>
                    ) : (
                      "Mic Ready"
                    )}
                  </span>
                </div>
              </div>

              {aiMode === "listening" && (
                <span className="text-xs text-amber-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {silenceCountdown}s left
                </span>
              )}
            </div>

            {/* Live speech-to-text / editable answer box */}
            <div className="relative mb-3">
              <textarea
                value={liveTranscript}
                onChange={(e) => {
                  setLiveTranscript(e.target.value);
                  manualAnswerRef.current = e.target.value;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (submitCurrentAnswerRef.current) {
                      submitCurrentAnswerRef.current();
                    }
                  }
                }}
                placeholder={
                  aiMode === "listening"
                    ? "Microphone is listening — Speak your answer now (or type here)..."
                    : aiMode === "speaking"
                    ? "Interviewer is speaking... (You can speak or start typing here)"
                    : "Evaluating your response with AI..."
                }
                disabled={aiMode === "processing"}
                rows={3}
                className="w-full text-sm p-3 rounded-lg bg-black/40 border border-border/50 text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:border-primary/50 transition-all font-sans leading-relaxed"
              />
            </div>

            {/* Answer Controls: Submit Answer button */}
            {aiMode !== "processing" && (
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-muted-foreground">
                  {aiMode === "listening"
                    ? "Speak clearly or type above. Press Enter or click Submit when done."
                    : "Interviewer is asking question. Speak or type anytime."}
                </span>
                <button
                  onClick={() => {
                    if (submitCurrentAnswerRef.current) {
                      submitCurrentAnswerRef.current();
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Answer</span>
                </button>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* ── Metrics row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Emotion Analysis */}
        <GlassCard variant="neon" hover={false}>
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="w-3 h-3 text-primary" /> Emotion Analysis
          </h4>
          <div className="space-y-2">
            {[
              { label: "Confidence", value: difficultyLevel === 3 ? 88 : difficultyLevel === 2 ? 76 : 64, color: "bg-primary" },
              { label: "Calm",       value: 70, color: "bg-neon-purple" },
              { label: "Engaged",    value: 84, color: "bg-primary" },
              { label: "Stress",     value: difficultyLevel === 1 ? 35 : 20, color: "bg-destructive" },
            ].map((e) => (
              <div key={e.label} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">{e.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted/30">
                  <div className={`h-full rounded-full ${e.color} transition-all duration-500`} style={{ width: `${e.value}%` }} />
                </div>
                <span className="text-xs font-mono text-foreground w-8">{e.value}%</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Confidence meter */}
        <GlassCard variant="neon" hover={false} className="flex flex-col items-center justify-center">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Overall Confidence</h4>
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(222, 30%, 14%)" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(185, 100%, 50%)" strokeWidth="6"
                strokeDasharray={`${(difficultyLevel === 3 ? 88 : 78) * 2.64} ${264 - (difficultyLevel === 3 ? 88 : 78) * 2.64}`}
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_hsl(185_100%_50%/0.5)] transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-2xl text-primary neon-glow">
                {difficultyLevel === 3 ? "88%" : "78%"}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Voice stability */}
        <GlassCard variant="neon" hover={false}>
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-primary" /> Voice Stability
          </h4>
          <WaveformAnimation bars={24} className="h-16 mb-3" />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Signal Quality</span>
            <span className="text-primary font-mono font-medium">Optimal (86%)</span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default InterviewRoom;
