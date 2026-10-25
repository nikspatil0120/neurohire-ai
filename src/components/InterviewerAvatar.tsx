import { useState, useEffect } from "react";
import { Mic, Volume2, Sparkles, UserCheck } from "lucide-react";
import WaveformAnimation from "./WaveformAnimation";

interface InterviewerAvatarProps {
  mode: "idle" | "speaking" | "listening" | "processing";
  questionText?: string;
}

export const InterviewerAvatar = ({ mode }: InterviewerAvatarProps) => {
  // Speech viseme mouth opening (0 = closed, 1 = open)
  const [mouthOpen, setMouthOpen] = useState<number>(0);

  // ── Lip Sync Cycle during speaking ─────────────────────────────────────────
  useEffect(() => {
    if (mode !== "speaking") {
      setMouthOpen(0);
      return;
    }

    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    // Simulates natural phonetic cadence of human speech (consonants vs vowels)
    const cycleMouth = () => {
      if (!isMounted || mode !== "speaking") return;

      // Randomize between open and closed/partial with natural speech durations
      setMouthOpen(prev => {
        if (prev > 0.4) {
          // Close or partial close
          return Math.random() > 0.3 ? 0 : 0.4;
        } else {
          // Open for vowel / syllable
          return Math.random() > 0.3 ? 1 : 0.7;
        }
      });

      // Conversational syllable duration ~100ms to 200ms
      const duration = 100 + Math.floor(Math.random() * 110);
      timeoutId = setTimeout(cycleMouth, duration);
    };

    cycleMouth();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [mode]);

  const isSpeaking = mode === "speaking";
  const isListening = mode === "listening";

  return (
    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center select-none shadow-2xl border border-primary/20">

      {/* ── Layer 1: Listening / Attentive Posture (Pen in hand, attentive focus) ── */}
      <img
        src="/avatars/interviewer-listening.jpg"
        alt="Alex - Listening"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          isListening ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
      />

      {/* ── Layer 2: Neutral Idle Posture (Hands on desk) ── */}
      <img
        src="/avatars/interviewer-idle.jpg"
        alt="Alex - Idle"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          mode === "idle" || mode === "processing" ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
      />

      {/* ── Layer 3: Speaking Pose - Closed Mouth Base (Hand raised in communicative gesture) ── */}
      <img
        src="/avatars/interviewer-speaking-closed.jpg"
        alt="Alex - Speaking Closed"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isSpeaking ? "opacity-100 z-10" : "opacity-0 z-0"
        }`}
      />

      {/* ── Layer 4: Speaking Pose - Open Mouth (Pixel-matched articulation) ── */}
      {isSpeaking && (
        <img
          src="/avatars/interviewer-speaking-open.jpg"
          alt="Alex - Speaking Open"
          className="absolute inset-0 w-full h-full object-cover z-20 transition-opacity duration-100 ease-in-out pointer-events-none"
          style={{
            opacity: mouthOpen,
          }}
        />
      )}

      {/* ── Dark Ambient Gradient for High-Contrast Text Overlays ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 z-20 pointer-events-none" />

      {/* ── Active Speaking Audio Glow ── */}
      {isSpeaking && (
        <div className="absolute inset-0 ring-2 ring-primary/50 ring-inset rounded-xl pointer-events-none z-30 animate-pulse" />
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

      {/* ── Top Right: Current State Badge ── */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
        {isSpeaking && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/25 backdrop-blur-md border border-primary/40 text-primary text-[11px] font-semibold tracking-wider uppercase animate-pulse">
            <Volume2 className="w-3.5 h-3.5" /> Speaking Question
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

      {/* ── Bottom: Role Tag & Audio Waveform ── */}
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
