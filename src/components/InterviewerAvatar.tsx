import { useEffect, useRef } from "react";
import { Mic, Volume2, Sparkles, UserCheck } from "lucide-react";
import WaveformAnimation from "./WaveformAnimation";

interface InterviewerAvatarProps {
  mode: "idle" | "speaking" | "listening" | "processing";
  questionText?: string;
}

export const InterviewerAvatar = ({ mode }: InterviewerAvatarProps) => {
  const speakingVideoRef = useRef<HTMLVideoElement>(null);
  const listeningVideoRef = useRef<HTMLVideoElement>(null);

  const isSpeaking = mode === "speaking";
  const isListening = mode === "listening";

  // Manage video playback in sync with speech mode
  useEffect(() => {
    if (isSpeaking) {
      if (speakingVideoRef.current) {
        speakingVideoRef.current.currentTime = 0;
        speakingVideoRef.current.play().catch(() => {});
      }
      if (listeningVideoRef.current) {
        listeningVideoRef.current.pause();
      }
    } else {
      if (speakingVideoRef.current) {
        speakingVideoRef.current.pause();
      }
      if (listeningVideoRef.current) {
        listeningVideoRef.current.play().catch(() => {});
      }
    }
  }, [isSpeaking]);

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center select-none shadow-2xl border border-primary/20">

      {/* ── Video 1: Listening & Attentive Loop (Closed mouth, pen in hand, listening nod) ── */}
      <video
        ref={listeningVideoRef}
        src="/avatars/interviewer-listening.mp4"
        loop
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isSpeaking ? "opacity-0 z-0" : "opacity-100 z-10"
        }`}
      />

      {/* ── Video 2: Active Speaking Loop (Lip articulation, communicative hand gestures) ── */}
      <video
        ref={speakingVideoRef}
        src="/avatars/interviewer-speaking.mp4"
        loop
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isSpeaking ? "opacity-100 z-20" : "opacity-0 z-0"
        }`}
      />

      {/* ── Ambient Studio Contrast Gradient ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-30 pointer-events-none" />

      {/* ── Active Speaking Audio Glow ── */}
      {isSpeaking && (
        <div className="absolute inset-0 ring-2 ring-primary/60 ring-inset rounded-xl pointer-events-none z-30 animate-pulse" />
      )}

      {/* ── Top Left: Interviewer Identity Badge ── */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-white/10 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-semibold text-white tracking-wide flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-primary" /> Alex · Senior Interviewer
          </span>
        </div>
      </div>

      {/* ── Top Right: Real-Time Mode Indicator ── */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        {isSpeaking && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/25 backdrop-blur-md border border-primary/40 text-primary text-[11px] font-semibold tracking-wider uppercase animate-pulse">
            <Volume2 className="w-3.5 h-3.5" /> Asking Question
          </div>
        )}
        {isListening && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-emerald-400 text-[11px] font-semibold tracking-wider uppercase">
            <Mic className="w-3.5 h-3.5 animate-pulse" /> Listening To You
          </div>
        )}
        {mode === "processing" && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-amber-300 text-[11px] font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 animate-spin" /> Evaluating Answer
          </div>
        )}
      </div>

      {/* ── Bottom Overlay: Role Tag & Audio Waveform ── */}
      <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
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
