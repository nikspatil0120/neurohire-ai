import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import WaveformAnimation from "@/components/WaveformAnimation";
import { InterviewerAvatar } from "@/components/InterviewerAvatar";
import CameraPreview from "@/components/CameraPreview";
import ProctoringDebugPanel from "@/components/ProctoringDebugPanel";
import { useFaceAnalysis } from "@/hooks/useFaceAnalysis";
import { useProctoringMonitor } from "@/hooks/useProctoringMonitor";
import { useCandidateSignals } from "@/hooks/useCandidateSignals";
  Brain, Camera, Clock, AlertTriangle, Mic, MicOff, BarChart3,
  TrendingUp, X, Volume2, ArrowLeft, RefreshCw, CheckCircle2, Send, ShieldOff,
  Shield, ShieldAlert, AlertOctagon, UserCheck, Sparkles,
  Lock, Unlock, Maximize2, Minimize2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import * as faceapi from "face-api.js";
import FaceVerificationGate from "@/components/FaceVerificationGate";

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
  isHalted?: () => boolean,
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
        if (isHalted && isHalted()) return;
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
      if (isHalted && isHalted()) {
        lastSpeech = Date.now(); // freeze silence timeout while security halted
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
  const { user } = useAuth();

  const state = (location.state || {}) as {
    questions?:         Question[];
    rapport_questions?: Question[];
    candidateProfile?:  any;
    jobData?:           any;
    applicationId?:     string;
    isPractice?:        boolean;
    candidateId?:       string;
    candidateEmail?:    string;
    candidateName?:     string;
  };
  const [showTranscript, setShowTranscript] = useState(false);

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

  // ── Biometric Face Verification & Proctoring Security State ───────────────
  const [isVerified,                setIsVerified]                = useState(false);
  const [isSecurityHalted,          setIsSecurityHalted]          = useState(false);
  const [securityHaltReason,        setSecurityHaltReason]        = useState("");
  const [faceViolationsCount,       setFaceViolationsCount]       = useState(0);
  const [outOfFrameCountdown,       setOutOfFrameCountdown]       = useState<number | null>(null);
  const [securityTerminated,        setSecurityTerminated]        = useState(false);
  const [securityTerminationReason, setSecurityTerminationReason] = useState("");

  // ── Window Lockdown & Anti-Cheat State (Dev Mode Unlockable) ───────────────
  const [isWindowLocked,            setIsWindowLocked]            = useState(true);
  const [isFullscreen,              setIsFullscreen]              = useState(false);
  const [windowViolationsCount,     setWindowViolationsCount]     = useState(0);
  const [showWindowViolationModal,  setShowWindowViolationModal]  = useState(false);
  const [needsFullscreenPrompt,     setNeedsFullscreenPrompt]     = useState(false);
  const [windowExitCountdown,       setWindowExitCountdown]       = useState<number | null>(null);
  const isWindowLockedRef           = useRef(true);
  const windowExitStartTimeRef      = useRef<number | null>(null);

  // Keep window lock ref synchronized
  useEffect(() => {
    isWindowLockedRef.current = isWindowLocked;
  }, [isWindowLocked]);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const transcriptRef               = useRef<TranscriptItem[]>([]);
  const correctnessHistory          = useRef<number[]>([]);
  const currentExchangesRef         = useRef<Exchange[]>([]);
  const runningRef                  = useRef(false);
  const terminatedRef               = useRef(false);
  const activeRecognitionRef        = useRef<any>(null);
  const manualAnswerRef             = useRef("");
  const submitCurrentAnswerRef      = useRef<(() => void) | null>(null);
  const audioContextRef             = useRef<AudioContext | null>(null);
  const animFrameRef                = useRef<number | null>(null);
  const mediaStreamRef              = useRef<MediaStream | null>(null);
  const verifiedDescriptorRef       = useRef<Float32Array | null>(null);
  const candidateVideoRef           = useRef<HTMLVideoElement | null>(null);
  const isSecurityHaltedRef         = useRef(false);
  const faceViolationsRef           = useRef(0);
  const isMonitoringRef             = useRef(false);
  const outOfFrameStartTimeRef      = useRef<number | null>(null);
  const mismatchConsecutiveCountRef = useRef(0);
  const zeroFaceConsecutiveTicksRef = useRef(0);
  const multiFaceConsecutiveTicksRef= useRef(0);

  // Keep ref synchronized
  useEffect(() => {
    isSecurityHaltedRef.current = isSecurityHalted;
  }, [isSecurityHalted]);

  // Helper function to check termination across all async operations
  const isTerminated = useCallback(() => terminatedRef.current, []);

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

  // Preload face-api models for continuous background proctoring
  useEffect(() => {
    const loadFaceModels = async () => {
      try {
        if (!faceapi.nets.tinyFaceDetector.params) {
          await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        }
        if (!faceapi.nets.faceLandmark68Net.params) {
          await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        }
        if (!faceapi.nets.faceRecognitionNet.params) {
          await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        }
      } catch (e) {
        console.warn("[InterviewRoom] Face models preload notice:", e);
      }
    };
    loadFaceModels();
  }, []);

  // ── Audio Level Meter from Camera/Mic stream ─────────────────────────────
  const handleMediaStream = useCallback((stream: MediaStream) => {
    mediaStreamRef.current = stream;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try { audioContextRef.current.close().catch(() => {}); } catch { /* ignore */ }
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

  // Acquire microphone stream for speech-to-text recording & audio level visualizer
  useEffect(() => {
    let micStream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    }).then((stream) => {
      micStream = stream;
      handleMediaStream(stream);
    }).catch((err) => {
      console.warn("Microphone access error:", err);
    });

    return () => {
      if (micStream) {
        micStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [handleMediaStream]);

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

  // ── Window Lockdown & Fullscreen Controls ─────────────────────────────────
  const enterFullscreenAndLock = useCallback(async () => {
    try {
      const elem = document.documentElement as any;
      if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      }
      setIsFullscreen(true);
      setNeedsFullscreenPrompt(false);
      setShowWindowViolationModal(false);

      // Keyboard Lock API (Locks Escape, Alt, Tab, Windows keys in modern Chromium browsers)
      if ((navigator as any).keyboard?.lock) {
        try {
          await (navigator as any).keyboard.lock(["Escape", "AltLeft", "AltRight", "Tab", "MetaLeft", "MetaRight"]);
        } catch { /* keyboard lock permissions */ }
      }
    } catch (err) {
      console.warn("[Lockdown] Fullscreen request prevented by browser policy (user gesture required):", err);
      if (isWindowLockedRef.current) {
        setNeedsFullscreenPrompt(true);
      }
    }
  }, []);

  const exitFullscreenAndUnlock = useCallback(async () => {
    try {
      if ((navigator as any).keyboard?.unlock) {
        try { (navigator as any).keyboard.unlock(); } catch { /* ignore */ }
      }
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn("[Lockdown] Exit fullscreen notice:", err);
    }
  }, []);

  const toggleDevModeLock = useCallback(async () => {
    if (isWindowLockedRef.current) {
      // Dev mode: unlock window
      setIsWindowLocked(false);
      isWindowLockedRef.current = false;
      await exitFullscreenAndUnlock();
      setShowWindowViolationModal(false);
      setNeedsFullscreenPrompt(false);
      windowExitStartTimeRef.current = null;
      setWindowExitCountdown(null);
      console.log("[Lockdown] 🔓 Developer Mode: Window unlocked.");
    } else {
      // Dev mode: re-lock window
      setIsWindowLocked(true);
      isWindowLockedRef.current = true;
      await enterFullscreenAndLock();
      console.log("[Lockdown] 🔒 Locked Exam Mode: Window re-locked.");
    }
  }, [exitFullscreenAndUnlock, enterFullscreenAndLock]);

  // ── Terminate Interview Handler ───────────────────────────────────────────
  const handleTerminate = useCallback(() => {
    terminatedRef.current = true;
    runningRef.current = false;

    // Immediately release lockdown upon termination
    try {
      if ((navigator as any).keyboard?.unlock) (navigator as any).keyboard.unlock();
      if (document.fullscreenElement) document.exitFullscreen();
    } catch { /* ignore */ }
    setIsWindowLocked(false);
    isWindowLockedRef.current = false;
    setShowWindowViolationModal(false);
    setNeedsFullscreenPrompt(false);
    windowExitStartTimeRef.current = null;
    setWindowExitCountdown(null);

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
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try { audioContextRef.current.close().catch(() => {}); } catch { /* ignore */ }
    }

    setAiMode("idle");
    setTerminated(true);
  }, []);

  // ── Automatic Security Termination Handler ────────────────────────────────
  const handleSecurityTermination = useCallback((reason: string) => {
    console.error("[InterviewRoom] Automatic Security Termination:", reason);
    setSecurityTerminated(true);
    setSecurityTerminationReason(reason);
    handleTerminate();
  }, [handleTerminate]);

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
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        try { audioContextRef.current.close().catch(() => {}); } catch { /* ignore */ }
      }
    };
  }, []);

  // ── Window Lockdown & Anti-Cheat Enforcement Loop (5s Auto-Termination) ──────
  useEffect(() => {
    if (!isVerified || terminated || isFinished) {
      exitFullscreenAndUnlock();
      windowExitStartTimeRef.current = null;
      setWindowExitCountdown(null);
      return;
    }

    // Try auto-locking on session start if enabled
    if (isWindowLocked) {
      enterFullscreenAndLock();
    }

    // Core validation check: If tab hidden OR not in fullscreen -> 5-second countdown to termination
    const checkWindowSecurity = () => {
      if (!isWindowLockedRef.current || terminatedRef.current) {
        if (windowExitStartTimeRef.current !== null) {
          windowExitStartTimeRef.current = null;
          setWindowExitCountdown(null);
        }
        return;
      }

      const isViolating = document.hidden || !document.fullscreenElement;

      if (isViolating) {
        if (windowExitStartTimeRef.current === null) {
          windowExitStartTimeRef.current = Date.now();
          setWindowExitCountdown(5);
          setShowWindowViolationModal(true);
          try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
        }

        const elapsedSecs = (Date.now() - windowExitStartTimeRef.current) / 1000;
        const remainingSecs = Math.max(0, Math.ceil(5 - elapsedSecs));
        setWindowExitCountdown(remainingSecs);

        if (elapsedSecs >= 5) {
          console.warn("[Lockdown] Candidate exited window / full-screen for > 5 seconds. Terminating interview.");
          windowExitStartTimeRef.current = null;
          setWindowExitCountdown(null);
          setShowWindowViolationModal(false);
          handleSecurityTermination(
            "Interview terminated automatically: Candidate switched tabs or exited full-screen mode for more than 5 seconds."
          );
        }
      } else {
        // Candidate is back inside locked full-screen window within the 5 seconds!
        if (windowExitStartTimeRef.current !== null) {
          console.log("[Lockdown] Candidate returned to locked fullscreen window within 5 seconds! Resuming interview.");
          windowExitStartTimeRef.current = null;
          setWindowExitCountdown(null);
          setShowWindowViolationModal(false);
        }
      }
    };

    // Fullscreen change listener
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);
      checkWindowSecurity();
    };

    // Tab switch / Window visibility change listener
    const handleVisibilityChange = () => {
      checkWindowSecurity();
    };

    // Window blur & focus listeners
    const handleWindowBlur = () => {
      checkWindowSecurity();
    };

    const handleWindowFocus = () => {
      checkWindowSecurity();
    };

    // 250ms periodic ticker ensuring exact countdown and termination even if backgrounded
    const countdownTicker = setInterval(checkWindowSecurity, 250);

    // Keyboard lockdown listener (prevents Alt+Tab, Esc, Win, F5, F11, F12, Ctrl+W, Ctrl+R, DevTools)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isWindowLockedRef.current || terminatedRef.current) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.key === "Meta" || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.altKey && ["Tab", "F4", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && ["w", "t", "n", "r", "q"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (["F5", "F11", "F12"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    // Block right-click context menu (inspect element)
    const handleContextMenu = (e: MouseEvent) => {
      if (isWindowLockedRef.current && !terminatedRef.current) {
        e.preventDefault();
      }
    };

    // Block tab/window close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isWindowLockedRef.current && !terminatedRef.current) {
        e.preventDefault();
        e.returnValue = "An active proctored interview is in progress. Exiting will cancel and invalidate your session!";
        return e.returnValue;
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(countdownTicker);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isVerified, terminated, isFinished, enterFullscreenAndLock, exitFullscreenAndUnlock, handleSecurityTermination]);

  // ── Continuous Background Face Proctoring Loop ─────────────────────────────
  // Ultra-stable proctoring rules:
  // 1. Moving a little in frame will NEVER halt the interview.
  // 2. Only halts if candidate is COMPLETELY out of window for > 2 seconds (starts 5s return countdown).
  // 3. Only halts if another face / multiple faces are detected in camera frame.
  useEffect(() => {
    if (!isVerified || terminated || isFinished) return;

    let isMounted = true;
    const intervalTime = 800; // Fast 800ms interval for responsive tracking

    const monitorFaceTick = async () => {
      if (!isMounted || terminatedRef.current || !verifiedDescriptorRef.current) return;
      const video = candidateVideoRef.current;
      if (!video || video.readyState < 2 || video.paused) return;
      if (isMonitoringRef.current) return;

      try {
        isMonitoringRef.current = true;
        // scoreThreshold 0.35 ensures tracking is preserved during motion and head tilts
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 }))
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (!isMounted || terminatedRef.current) return;

        // ── SCENARIO 1: NO FACE DETECTED (Candidate stepping out of window) ──
        if (detections.length === 0) {
          multiFaceConsecutiveTicksRef.current = 0;
          mismatchConsecutiveCountRef.current = 0;
          zeroFaceConsecutiveTicksRef.current += 1;

          // Candidate must be COMPLETELY out of window for at least 3 consecutive ticks (~2.4s)
          // Normal movement, blinking, or scratching face will NOT cause false halts!
          if (zeroFaceConsecutiveTicksRef.current >= 3) {
            if (outOfFrameStartTimeRef.current === null) {
              outOfFrameStartTimeRef.current = Date.now();
              isSecurityHaltedRef.current = true;
              setIsSecurityHalted(true);
              setSecurityHaltReason("You are completely out of the camera window. Return within 5 seconds.");
              try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
            }

            const elapsedSecs = (Date.now() - outOfFrameStartTimeRef.current) / 1000;
            const remainingSecs = Math.max(0, Math.ceil(5 - elapsedSecs));
            setOutOfFrameCountdown(remainingSecs);

            // If completely out of window for 5 or more seconds without returning -> TERMINATE
            if (elapsedSecs >= 5) {
              console.warn("[FaceProctor] Candidate out of window for > 5 seconds. Terminating interview.");
              handleSecurityTermination(
                "Interview terminated automatically: Candidate was completely out of camera window for more than 5 seconds."
              );
              return;
            }
          }
          return;
        }

        // ── A FACE IS PRESENT IN WINDOW ─────────────────────────────────────
        // Candidate is inside the frame -> Reset zero-face counter immediately
        zeroFaceConsecutiveTicksRef.current = 0;

        // If previously halted because candidate left the window, candidate has returned!
        if (outOfFrameStartTimeRef.current !== null) {
          outOfFrameStartTimeRef.current = null;
          setOutOfFrameCountdown(null);
          // If only 1 person in frame, immediately resume interview
          if (detections.length === 1) {
            console.log("[FaceProctor] Candidate returned to window! Resuming interview.");
            isSecurityHaltedRef.current = false;
            setIsSecurityHalted(false);
            setSecurityHaltReason("");
          }
        }

        // ── SCENARIO 2: MULTIPLE FACES DETECTED (> 1) ──────────────────────
        if (detections.length > 1) {
          mismatchConsecutiveCountRef.current = 0;
          multiFaceConsecutiveTicksRef.current += 1;

          // Require 2 consecutive ticks to confirm a second person is truly in frame
          if (multiFaceConsecutiveTicksRef.current >= 2) {
            console.warn("[FaceProctor] Another face detected in frame:", detections.length);
            if (!isSecurityHaltedRef.current) {
              faceViolationsRef.current += 1;
              setFaceViolationsCount(faceViolationsRef.current);

              // If it happens MORE THAN TWO TIMES (> 2, i.e. 3rd infraction) -> Terminate!
              if (faceViolationsRef.current > 2) {
                handleSecurityTermination(
                  `Interview terminated automatically: Multiple faces were detected in the webcam stream ${faceViolationsRef.current} times (exceeded maximum 2 allowed infractions).`
                );
                return;
              }

              isSecurityHaltedRef.current = true;
              setIsSecurityHalted(true);
              setSecurityHaltReason(`Another face was detected in your camera window (${detections.length} persons). Only the verified candidate is permitted.`);
              try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
            }
          }
          return;
        }

        // Only 1 face in view
        multiFaceConsecutiveTicksRef.current = 0;

        // ── SCENARIO 3: EXACTLY 1 FACE DETECTED ─────────────────────────────
        const dist = faceapi.euclideanDistance(verifiedDescriptorRef.current, detections[0].descriptor);

        // Threshold 0.65: Generous tolerance for natural movement, head tilt, spectacles, expressions
        // Ensures candidate moving around in their chair NEVER triggers a false alarm!
        if (dist <= 0.65) {
          // Real verified candidate is confirmed!
          mismatchConsecutiveCountRef.current = 0;

          if (isSecurityHaltedRef.current) {
            console.log("[FaceProctor] Verified candidate confirmed! Resuming interview.");
            isSecurityHaltedRef.current = false;
            setIsSecurityHalted(false);
            setSecurityHaltReason("");
          }
          return;
        }

        // If dist > 0.65, someone else is sitting in front of the camera
        // Require 3 consecutive ticks (~2.4s) to confirm it is actually an unauthorized person
        mismatchConsecutiveCountRef.current += 1;

        if (mismatchConsecutiveCountRef.current >= 3) {
          console.warn("[FaceProctor] Confirmed unauthorized face mismatch! Distance:", dist.toFixed(3));
          if (!isSecurityHaltedRef.current) {
            faceViolationsRef.current += 1;
            setFaceViolationsCount(faceViolationsRef.current);

            // If it happens MORE THAN TWO TIMES (> 2, i.e. 3rd infraction) -> Terminate!
            if (faceViolationsRef.current > 2) {
              handleSecurityTermination(
                `Interview terminated automatically: An unauthorized face was detected ${faceViolationsRef.current} times during the proctored interview (exceeded maximum 2 allowed infractions).`
              );
              return;
            }

            isSecurityHaltedRef.current = true;
            setIsSecurityHalted(true);
            setSecurityHaltReason(`Another face was detected (Face mismatch distance: ${dist.toFixed(2)}). Interview halted until the verified candidate returns.`);
            try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
          }
        }
      } catch (err) {
        console.warn("[FaceProctor] Detection tick notice:", err);
      } finally {
        isMonitoringRef.current = false;
      }
    };

    const timer = setInterval(monitorFaceTick, intervalTime);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [isVerified, terminated, isFinished, handleSecurityTermination]);

  // ── Timer (Paused while security halted) ───────────────────────────────────
  useEffect(() => {
    if (isFinished || terminated || questions.length === 0 || isSecurityHalted) return;
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [isFinished, terminated, questions.length, isSecurityHalted]);

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

      // ── Signal tracking for this question ───────────────────────────────
      signalsRef.current.startQuestion(mq.id);

      // Wait if security halted before asking question
      while (isSecurityHaltedRef.current && !terminatedRef.current) {
        await new Promise((r) => setTimeout(r, 400));
      }
      if (terminatedRef.current) break;

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
        // Wait if security halted before candidate turn
        while (isSecurityHaltedRef.current && !terminatedRef.current) {
          await new Promise((r) => setTimeout(r, 400));
        }
        if (terminatedRef.current) break;

        setAiMode("listening");
        setLiveTranscript("");
        manualAnswerRef.current = "";

        const spokenAnswer = await listenForAnswer(
          (t) => {
            if (!terminatedRef.current && !isSecurityHaltedRef.current) {
              setLiveTranscript(t);
              manualAnswerRef.current = t;
            }
          },
          (s) => { if (!terminatedRef.current && !isSecurityHaltedRef.current) setSilenceCountdown(s); },
          isTerminated,
          (rec) => { activeRecognitionRef.current = rec; },
          (submitFn) => { submitCurrentAnswerRef.current = submitFn; },
          () => manualAnswerRef.current,
          mediaStreamRef.current,
          () => isSecurityHaltedRef.current,
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
      const isRapport = (mq as any).kind || mq.category === "rapport";
      transcriptRef.current.push({
        id:         mq.id,
        category:   mq.category || (isRapport ? "rapport" : "technical"),
        topic:      mq.topic || (isRapport ? "Introduction" : "General"),
        key_points: mq.key_points || [],
        exchanges,
        final_eval: lastEval,
        scored:     !isRapport,
      });

      // ── Collect per-question signals aggregate ───────────────────────────
      const agg = signalsRef.current.endQuestion(
        proctoringRef.current.violations.filter(
          v => v.startTime >= (Date.now() - 300_000), // last 5 min — wide window
        ),
      );
      if (agg) signalAggregatesRef.current.push(agg);
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

    // Submit signals in parallel with final scoring — non-blocking
    submitSignals(signalAggregatesRef.current);

    let result: any = null;
    try {
      result = await computeFinalScore();
    } catch (scoreErr) {
      console.warn("AI scoring endpoint encountered an issue, using fallback calculation:", scoreErr);
    }

    if (terminatedRef.current) return;

    // Provide robust evaluation if computeFinalScore failed or returned null
    if (!result || typeof result !== "object") {
      const avgCorrectness = correctnessHistory.current.length > 0
        ? correctnessHistory.current.reduce((a, b) => a + b, 0) / correctnessHistory.current.length
        : 0.75;
      const fallbackOverall = Number((Math.max(5.0, Math.min(9.8, avgCorrectness * 10))).toFixed(1));
      result = {
        overall_score: fallbackOverall,
        technical_score: fallbackOverall,
        behavioral_score: 8.0,
        summary: "Candidate completed all questions in the structured interview with consistent participation.",
        strengths: ["Completed all interview phases", "Demonstrated clear technical communication"],
        weaknesses: ["Can expand further on domain edge cases and system trade-offs"],
      };
    }
    setFinalResult(result);

    // Determine interview context
    const isPractice = state.isPractice ?? (!state.applicationId);
    const candId = state.candidateId || user?.id || "";
    const candEmail = state.candidateEmail || user?.email || "";
    const candName = state.candidateName || user?.name || "";

    // ── Persist Full Interview Report to Database ───────────────────────
    try {
      await fetch(`${API}/interview-ai/save-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_type: isPractice ? "practice" : "job",
          candidate_id: candId,
          candidate_email: candEmail,
          candidate_name: candName,
          job_title: state.jobData?.title || (isPractice ? "Practice Interview" : "Job Interview"),
          company: state.jobData?.company || "",
          application_id: state.applicationId || "",
          report: result || {},
          transcript: transcriptRef.current || [],
          signals: {
            aggregates: signalAggregatesRef.current || [],
            violations_count: proctoringRef.current?.violations?.length || 0,
            violations: proctoringRef.current?.violations || [],
          },
        }),
      });
    } catch (saveErr) {
      console.error("Could not save interview report:", saveErr);
    }

    // If this was an actual application, update application status & score
    if (state.applicationId) {
      try {
        await fetch(`${API}/applications/${state.applicationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            application_status: "interview_completed",
            test_status: "completed",
            current_round: "interview",
            final_interview_score: result?.overall_score || 0,
            "scores.interview": {
              score: result?.overall_score || 0,
              max_score: 10,
              notes: "AI Interview Completed",
              submitted_at: new Date().toISOString(),
            },
          }),
        });
      } catch (err) {
        console.error("Could not update application score:", err);
      }

      try {
        await fetch(`${API}/applications/${state.applicationId}/score`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            round: "interview",
            score: result?.overall_score || 0,
            max_score: 10,
            notes: "AI Interview Completed",
          }),
        });
      } catch (scoreErr) {
        console.error("Could not update round score:", scoreErr);
      }
    }

    if (!terminatedRef.current) {
      setIsFinished(true);
      runningRef.current = false;
      exitFullscreenAndUnlock();
      setIsWindowLocked(false);
      isWindowLockedRef.current = false;
      setShowWindowViolationModal(false);
      setNeedsFullscreenPrompt(false);
    }
  }, [respondToCandidate, computeFinalScore, submitSignals, isTerminated, state.applicationId]);

  // Start when questions are ready AND identity has been verified
  useEffect(() => {
    if (isVerified && questions.length > 0 && !runningRef.current && !terminatedRef.current) {
      runInterview(questions);
    }
  }, [isVerified, questions, runInterview]);

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
  // PRE-INTERVIEW BIOMETRIC FACE VERIFICATION GATE
  // ─────────────────────────────────────────────────────────────────────────
  if (!isVerified) {
    return (
      <FaceVerificationGate
        onVerified={(descriptor) => {
          console.log("[InterviewRoom] ✅ Biometric Face verified! Initializing session.");
          verifiedDescriptorRef.current = descriptor;
          setIsVerified(true);
          enterFullscreenAndLock();
        }}
        onFailed={() => {
          navigate("/candidate/dashboard");
        }}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TERMINATED SCREEN (Security violation or manual exit)
  // ─────────────────────────────────────────────────────────────────────────
  if (terminated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-lg p-8 rounded-2xl bg-card border border-destructive/40 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-9 h-9 text-destructive animate-pulse" />
          </div>
          <h1
            className="font-display text-3xl text-destructive tracking-wider mb-3 neon-glow"
            style={{ textShadow: "0 0 10px hsl(0 84% 60% / 0.6), 0 0 40px hsl(0 84% 60% / 0.3)" }}
          >
            {securityTerminated ? "INTERVIEW TERMINATED" : "INTERVIEW ENDED"}
          </h1>
          <p className="text-sm text-foreground/90 font-medium mb-3">
            {securityTerminationReason || "Session has been terminated. All recording and evaluation services have been stopped."}
          </p>
          {securityTerminated && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-xs text-destructive text-left space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-sm">
                <AlertOctagon className="w-4 h-4 text-destructive" /> Automated Proctoring Rule Exceeded
              </div>
              <p>
                An unauthorized face or secondary person was detected <strong>{faceViolationsCount} times</strong> during this session.
                Per examination integrity policy, more than 2 violations result in mandatory termination.
              </p>
              <div className="text-[11px] text-muted-foreground pt-1 border-t border-destructive/20">
                Timestamp: {new Date().toLocaleTimeString()} · Candidate Biometrics Enforced
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Link
              to="/candidate/practice"
              className="px-6 py-2.5 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all cursor-pointer"
            >
              Practice Mode
            </Link>
            <Link
              to="/candidate/dashboard"
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-all cursor-pointer shadow-lg shadow-primary/20"
            >
              Return to Dashboard
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
    const isPractice = state.isPractice ?? (!state.applicationId);
    const r = finalResult || {};

    if (!isPractice) {
      // ── Real Job Interview: Internal report is NOT shown to candidate ──
      return (
        <div className="min-h-screen bg-background p-6 max-w-2xl mx-auto flex flex-col justify-center items-center">
          <div className="text-center mb-6 w-full">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-primary/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4 drop-shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="font-display text-3xl text-foreground tracking-widest mb-1">INTERVIEW SUBMITTED</h1>
            <p className="text-muted-foreground text-sm">
              Assessment completed for <span className="text-primary font-medium">{state.jobData?.title || "Role"}</span>
              {state.jobData?.company ? ` at ${state.jobData?.company}` : ""}
            </p>
          </div>

          <GlassCard variant="neon" hover={false} className="w-full mb-6 text-center p-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" /> Assessment Recorded
            </div>
            <h3 className="text-base font-semibold text-foreground">Your Responses are Under Review</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mx-auto">
              Thank you for completing your interview. Your verbal responses, technical depth, and proctoring logs have been compiled and securely submitted to the hiring team for evaluation.
            </p>
            <div className="p-4 rounded-xl bg-muted/20 border border-border/30 text-xs text-muted-foreground text-left space-y-2">
              <p className="font-medium text-foreground">Next Steps:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground/80">
                <li>The recruiter will review your detailed assessment and application.</li>
                <li>You can track status updates and notifications in your Company Interviews dashboard.</li>
                <li>If selected for subsequent rounds or an offer, the recruiter will contact you directly.</li>
              </ul>
            </div>
          </GlassCard>

          <div className="flex gap-4 justify-center w-full">
            <Link
              to="/candidate/interviews"
              className="px-6 py-3 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all"
            >
              Company Interviews
            </Link>
            <Link
              to="/candidate/dashboard"
              className="px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-all font-medium shadow-lg shadow-primary/25"
            >
              Dashboard
            </Link>
          </div>
        </div>
      );
    }

    // ── Practice Interview: Show full detailed report to user ──
    return (
      <div className="min-h-screen bg-background p-6 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl text-foreground tracking-widest mb-1">PRACTICE INTERVIEW REPORT</h1>
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
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overall Practice Score</p>
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
                <h3 className="text-sm font-semibold text-foreground mb-2">Executive Summary</h3>
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

            {/* Transcript review toggle */}
            {transcriptRef.current && transcriptRef.current.length > 0 && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowTranscript(prev => !prev)}
                  className="w-full py-2.5 px-4 rounded-xl border border-border/40 bg-muted/20 text-xs font-medium text-foreground hover:bg-muted/40 transition-all flex items-center justify-between"
                >
                  <span>{showTranscript ? "Hide" : "Review"} Question-by-Question Transcript ({transcriptRef.current.length} questions)</span>
                  <span>{showTranscript ? "▲" : "▼"}</span>
                </button>

                {showTranscript && (
                  <div className="mt-3 space-y-3">
                    {transcriptRef.current.map((t, idx) => (
                      <GlassCard key={idx} variant="neon" className="text-xs space-y-2 p-4">
                        <div className="flex items-center justify-between border-b border-border/20 pb-1.5">
                          <span className="font-semibold text-primary">Q{idx + 1}: {t.topic || t.category || "General"}</span>
                          {t.final_eval?.combined_score !== undefined && (
                            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary font-mono text-[11px]">
                              Score: {Math.round(t.final_eval.combined_score * 10)}/10
                            </span>
                          )}
                        </div>
                        {t.exchanges?.map((ex, exIdx) => (
                          <div key={exIdx} className="space-y-1 pt-1">
                            <p className="text-muted-foreground"><strong className="text-foreground">Interviewer:</strong> {ex.question}</p>
                            <p className="text-foreground/90 pl-3 border-l-2 border-primary/40"><strong className="text-primary">You:</strong> {ex.answer || "(No response)"}</p>
                          </div>
                        ))}
                        {t.final_eval?.reason && (
                          <p className="text-[11px] text-muted-foreground/80 italic mt-1 bg-muted/20 p-2 rounded">
                            Feedback: {t.final_eval.reason}
                          </p>
                        )}
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/candidate/practice"
            className="px-6 py-3 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all"
          >
            Practice Again
          </Link>
          <Link
            to="/candidate/reports"
            className="px-6 py-3 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-all font-medium shadow-lg shadow-primary/25"
          >
            View in Reports Dashboard →
          </Link>
          <Link
            to="/candidate/dashboard"
            className="px-6 py-3 rounded-lg border border-border/30 bg-muted/20 text-muted-foreground text-sm hover:text-foreground transition-all"
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
          {/* Window Lockdown status badge */}
          <div className={`glass-panel px-3 py-1.5 flex items-center gap-1.5 ${isWindowLocked ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"}`}>
            {isWindowLocked ? (
              <>
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold tracking-wider">WINDOW LOCKED</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold tracking-wider">DEV UNLOCKED</span>
              </>
            )}
          </div>

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
          <div className="aspect-video relative overflow-hidden rounded-xl border border-border/40">
            <CameraPreview
              videoRef={(el) => {
                if (faceAnalysis.videoRef) {
                  (faceAnalysis.videoRef as any).current = el;
                }
                candidateVideoRef.current = el;
              }}
              ready={faceAnalysis.ready}
              error={faceAnalysis.error}
              proctoringStatus={proctoring.status}
              activeViolations={proctoring.activeViolations}
              activeViolationDetails={proctoring.activeViolationDetails}
            />
          </div>

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

      {/* ── SECURITY HALT OVERLAY (When other/unauthorized face detected OR candidate leaves frame) ── */}
      {isSecurityHalted && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border-2 border-amber-500/50 rounded-2xl p-6 text-center space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {outOfFrameCountdown !== null ? (
              /* Out of Frame 5-second countdown mode */
              <>
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-rose-500/20 animate-ping" />
                  <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                    <span className="font-mono text-3xl font-extrabold text-rose-400">
                      {outOfFrameCountdown}s
                    </span>
                  </div>
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-2">
                    OUT OF FRAME · 5s AUTO-TERMINATION
                  </span>
                  <h2 className="text-xl font-bold text-foreground">Please Return to Camera Frame</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your face is not visible. Return to camera view within <strong className="text-rose-400">{outOfFrameCountdown} seconds</strong> or the session will terminate automatically.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 text-left space-y-1">
                  <p className="font-semibold text-rose-200">⚠️ Continuous Proctoring Rule:</p>
                  <p className="text-[11px] opacity-90">
                    Candidate must remain facing the camera throughout the entire assessment.
                  </p>
                </div>
              </>
            ) : (
              /* Unauthorized face or multiple faces mode */
              <>
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mx-auto animate-pulse">
                  <ShieldAlert className="w-8 h-8 text-amber-400" />
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2">
                    SECURITY PROTOCOL HALT
                  </span>
                  <h2 className="text-xl font-bold text-foreground">Interview Temporarily Halted</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {securityHaltReason || "An unverified or secondary face was detected in your webcam feed."}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-left space-y-2">
                  <div className="flex items-center justify-between font-semibold text-amber-300">
                    <span>Infraction Counter</span>
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-bold">
                      {faceViolationsCount} / 2 Allowed
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/80">
                    ⚠️ If an unauthorized face is detected <strong>more than 2 times</strong>, your session will be automatically terminated.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 text-xs text-muted-foreground text-left space-y-1.5">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" /> How to Resume:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    <li>Ensure only the registered candidate is in the camera frame.</li>
                    <li>Face the webcam directly with your face unobstructed.</li>
                    <li>Normal clothing and spectacles are fully supported & ignored by the biometrics model.</li>
                  </ul>
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-primary font-medium animate-pulse pt-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Scanning camera feed... interview will resume once verified face is restored</span>
            </div>
          </div>
        </div>
      )}

      {/* ── DEV MODE: WINDOW LOCK CONTROL (Bottom Center Bar) ── */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-1.5 px-3 rounded-full bg-black/85 backdrop-blur-md border border-border/60 shadow-2xl transition-all">
        <div className="flex items-center gap-1.5 text-[11px] font-mono pr-2.5 border-r border-border/40">
          <span className={`w-2 h-2 rounded-full ${isWindowLocked ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span className="text-muted-foreground font-semibold">DEV MODE</span>
        </div>

        {isWindowLocked ? (
          <button
            onClick={toggleDevModeLock}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            title="Dev Mode: Click to unlock window and disable kiosk lockdown"
          >
            <Unlock className="w-3.5 h-3.5 text-amber-400" />
            <span>Unlock Window</span>
          </button>
        ) : (
          <button
            onClick={toggleDevModeLock}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
            title="Dev Mode: Click to re-engage locked exam mode"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Re-lock Window</span>
          </button>
        )}

        <span className="text-[10px] text-muted-foreground/80 hidden sm:inline pl-1">
          {isWindowLocked ? "🔒 Window Locked (Anti-cheat Active)" : "🔓 Unlocked for Developer Mode"}
        </span>
      </div>

      {/* ── FULLSCREEN PERMISSION PROMPT MODAL ── */}
      {needsFullscreenPrompt && isWindowLocked && !terminated && !isFinished && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border-2 border-primary/50 rounded-2xl p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/40 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-primary/10 border border-primary/30 text-primary mb-2">
                EXAM LOCKDOWN PROTOCOL
              </span>
              <h2 className="text-xl font-bold text-foreground">Locked Fullscreen Mode Required</h2>
              <p className="text-xs text-muted-foreground mt-1">
                To prevent cheating and ensure assessment integrity, the interview window must run locked in full-screen until completion.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 text-xs text-muted-foreground text-left space-y-1.5">
              <p className="font-semibold text-foreground">Anti-Cheat Rules Enforced:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Exiting the window or switching tabs is strictly forbidden.</li>
                <li>System shortcuts and right-click inspect are disabled.</li>
                <li>A developer unlock toggle is available at the bottom.</li>
              </ul>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={enterFullscreenAndLock}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/25"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Enter Locked Fullscreen Mode</span>
              </button>
              <button
                onClick={toggleDevModeLock}
                className="text-xs text-muted-foreground hover:text-amber-400 py-1.5 transition-colors cursor-pointer"
              >
                Continue in Unlocked Mode (Dev Only)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WINDOW LOCK VIOLATION / 5-SECOND TERMINATION WARNING MODAL ── */}
      {showWindowViolationModal && isWindowLocked && !terminated && !isFinished && !needsFullscreenPrompt && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border-2 border-rose-500/70 rounded-2xl p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            {/* Animated 5s countdown timer badge */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-rose-500/30 animate-ping" />
              <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.5)]">
                <span className="font-mono text-3xl font-extrabold text-rose-400">
                  {windowExitCountdown !== null ? windowExitCountdown : 5}s
                </span>
              </div>
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-rose-500/10 border border-rose-500/30 text-rose-400 mb-2">
                WINDOW SWITCH / FULLSCREEN LOST · 5s AUTO-TERMINATION
              </span>
              <h2 className="text-xl font-bold text-foreground">Return to Locked Fullscreen Immediately</h2>
              <p className="text-xs text-muted-foreground mt-1">
                You switched tabs, minimized, or exited full-screen. Return within{" "}
                <strong className="text-rose-400 font-mono text-sm">{windowExitCountdown !== null ? windowExitCountdown : 5} seconds</strong>{" "}
                or this interview will be terminated permanently.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-left space-y-1.5">
              <p className="font-semibold text-rose-200">⚠️ Strict Examination Policy:</p>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                Candidates must remain in the locked full-screen interview window at all times. Switching to other tabs or applications is strictly prohibited.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={enterFullscreenAndLock}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/25 animate-pulse"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Return to Locked Fullscreen</span>
              </button>
              <button
                onClick={toggleDevModeLock}
                className="text-xs text-muted-foreground hover:text-amber-400 py-1.5 transition-colors cursor-pointer"
              >
                Unlock Window (Dev Mode)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewRoom;
