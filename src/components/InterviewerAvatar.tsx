import { useState, useEffect, useRef } from "react";
import { Mic, Volume2, Sparkles, UserCheck } from "lucide-react";
import WaveformAnimation from "./WaveformAnimation";

interface InterviewerAvatarProps {
  mode: "idle" | "speaking" | "listening" | "processing";
  questionText?: string;
}

export const InterviewerAvatar = ({ mode, questionText }: InterviewerAvatarProps) => {
  // Lip-sync state: 0 = closed, 1 = slight open, 2 = wide open
  const [mouthState, setMouthState] = useState<number>(0);
  // Blink state
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  // Subtle head/hand micro gesture phase
  const [gesturePhase, setGesturePhase] = useState<number>(0);

  // ── Lip Sync Cycle during speaking ─────────────────────────────────────────
  useEffect(() => {
    if (mode !== "speaking") {
      setMouthState(0);
      return;
    }

    // Natural varied speech cadence (80ms - 180ms per syllable/viseme)
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const speechStep = () => {
      if (!isMounted || mode !== "speaking") return;

      // Randomize between viseme mouth open states to simulate dynamic speech
      const nextState = Math.random() > 0.35 ? (Math.random() > 0.5 ? 2 : 1) : 0;
      setMouthState(nextState);

      // Conversational hand gesture micro-oscillation while speaking
      setGesturePhase(prev => (prev + 1) % 12);

      const nextDuration = 90 + Math.floor(Math.random() * 120);
      timeoutId = setTimeout(speechStep, nextDuration);
    };

    speechStep();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [mode]);

  // ── Natural Blink Loop ─────────────────────────────────────────────────────
  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;
    let unblinkTimeout: NodeJS.Timeout;
    let isMounted = true;

    const scheduleBlink = () => {
      if (!isMounted) return;
      const delay = 2500 + Math.random() * 3500; // blink every 2.5 - 6s
      blinkTimeout = setTimeout(() => {
        if (!isMounted) return;
        setIsBlinking(true);
        unblinkTimeout = setTimeout(() => {
          if (!isMounted) return;
          setIsBlinking(false);
          scheduleBlink();
        }, 140); // natural blink duration ~140ms
      }, delay);
    };

    scheduleBlink();

    return () => {
      isMounted = false;
      clearTimeout(blinkTimeout);
      clearTimeout(unblinkTimeout);
    };
  }, []);

  // Determine active primary image
  const isSpeaking = mode === "speaking";
  const isListening = mode === "listening";

  return (
    <div className="relative w-full h-full min-h-[260px] max-h-[380px] rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center select-none shadow-2xl border border-primary/20">

      {/* ── Background & Ambient Studio Lighting ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-10 pointer-events-none" />

      {/* ── Base Layer: Listening / Idle Image ── */}
      <img
        src="/avatars/interviewer-idle.jpg"
        alt="Alex - Interviewer"
        className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-300 ${
          isSpeaking ? "opacity-0" : isListening ? "opacity-30" : "opacity-100"
        } ${isBlinking ? "brightness-95" : ""}`}
      />

      {/* ── Listening Layer: Attentive posture with pen ── */}
      <img
        src="/avatars/interviewer-listening.jpg"
        alt="Alex - Listening"
        className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-400 ${
          isListening ? "opacity-100" : "opacity-0"
        } ${isBlinking ? "brightness-95" : ""}`}
      />

      {/* ── Speaking Layer: Professional Hand Gesture & Speaking Pose ── */}
      <div
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
          isSpeaking ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{
          transform: isSpeaking
            ? `scale(${1 + (gesturePhase % 3) * 0.003}) translateY(${gesturePhase % 2 === 0 ? '-1px' : '0px'})`
            : "scale(1)",
          transition: "transform 0.4s ease-out, opacity 0.3s ease-in-out",
        }}
      >
        <img
          src="/avatars/interviewer-speaking.jpg"
          alt="Alex - Speaking"
          className={`w-full h-full object-cover object-top ${
            isBlinking ? "brightness-95" : ""
          }`}
        />

        {/* Dynamic Lip Sync Viseme Layer for Open/Closed Mouth Articulation */}
        {isSpeaking && (
          <div
            className="absolute z-10 pointer-events-none transition-all duration-75"
            style={{
              top: "33.5%",
              left: "48.2%",
              width: "4.2%",
              height: "2.6%",
              transform: "translate(-50%, -50%)",
              opacity: mouthState === 0 ? 0.35 : mouthState === 1 ? 0.75 : 1,
            }}
          >
            {/* Organic speech articulation shadow & viseme depth */}
            <div
              className={`w-full h-full rounded-full bg-stone-900/40 backdrop-blur-[0.5px] transition-transform duration-75 ${
                mouthState === 2 ? "scale-y-125 scale-x-110" : mouthState === 1 ? "scale-y-95" : "scale-y-50 opacity-0"
              }`}
            />
          </div>
        )}
      </div>

      {/* ── Realistic Natural Eye Blink Simulation ── */}
      {isBlinking && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            top: "23.8%",
            left: "48.3%",
            width: "8.5%",
            height: "1.6%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="w-full h-full bg-[#a37c64]/90 rounded-full blur-[0.6px]" />
        </div>
      )}

      {/* ── Active Speaking Glow & Audio Reactive Vignette ── */}
      {isSpeaking && (
        <div className="absolute inset-0 ring-2 ring-primary/40 ring-inset rounded-xl pointer-events-none animate-pulse" />
      )}

      {/* ── Top Badges ── */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-white tracking-wide flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-primary" /> Alex · Senior Interviewer
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        {isSpeaking && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/20 backdrop-blur-md border border-primary/40 text-primary text-[11px] font-semibold tracking-wider uppercase animate-pulse">
            <Volume2 className="w-3.5 h-3.5" /> Speaking
          </div>
        )}
        {isListening && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[11px] font-semibold tracking-wider uppercase">
            <Mic className="w-3.5 h-3.5 animate-pulse" /> Listening to you
          </div>
        )}
        {mode === "processing" && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-amber-300 text-[11px] font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 animate-spin" /> Evaluating
          </div>
        )}
      </div>

      {/* ── Bottom Waveform & Name Placard Overlay ── */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white">
          <p className="text-[11px] font-medium tracking-wider text-slate-300">
            Tech Lead & Technical Recruiter
          </p>
        </div>

        {isSpeaking && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/20 backdrop-blur-md border border-primary/30">
            <WaveformAnimation bars={14} className="h-4" />
          </div>
        )}
      </div>
    </div>
  );
};
