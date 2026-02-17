import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import WaveformAnimation from "@/components/WaveformAnimation";
import { Brain, Camera, Clock, AlertTriangle, Mic, BarChart3, TrendingUp, X } from "lucide-react";
import { Link } from "react-router-dom";

const InterviewRoom = () => {
  const [terminated, setTerminated] = useState(false);

  if (terminated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-glitch">
          <AlertTriangle className="w-20 h-20 text-destructive mx-auto mb-6" />
          <h1 className="font-display text-4xl text-destructive tracking-wider mb-4 neon-glow" style={{ textShadow: "0 0 10px hsl(0 84% 60% / 0.6), 0 0 40px hsl(0 84% 60% / 0.3)" }}>
            INTERVIEW TERMINATED
          </h1>
          <p className="text-muted-foreground mb-8">Session ended due to policy violation</p>
          <Link to="/candidate/dashboard" className="px-6 py-3 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Top bar */}
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
            <span className="font-display text-primary">3/10</span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-foreground">24:35</span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Difficulty</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i <= 2 ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
          <button onClick={() => setTerminated(true)} className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main interview grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* AI Avatar */}
        <GlassCard variant="neon" hover={false} className="aspect-video flex items-center justify-center relative scan-line">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4 pulse-glow">
              <Brain className="w-12 h-12 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">AI Interviewer Active</p>
          </div>
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary animate-glow-pulse" />
            <WaveformAnimation bars={12} className="h-6" />
          </div>
        </GlassCard>

        {/* Candidate Camera */}
        <GlassCard variant="neon" hover={false} className="aspect-video flex items-center justify-center relative">
          <div className="text-center">
            <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Candidate Camera Feed</p>
          </div>
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-destructive animate-glow-pulse" />
            <span className="text-xs text-muted-foreground">LIVE</span>
          </div>
        </GlassCard>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Emotion Graph */}
        <GlassCard variant="neon" hover={false}>
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="w-3 h-3" /> Emotion Analysis
          </h4>
          <div className="space-y-2">
            {[
              { label: "Confidence", value: 78, color: "bg-primary" },
              { label: "Calm", value: 65, color: "bg-neon-purple" },
              { label: "Engaged", value: 82, color: "bg-primary" },
              { label: "Stress", value: 25, color: "bg-destructive" },
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

        {/* Confidence Meter */}
        <GlassCard variant="neon" hover={false} className="flex flex-col items-center justify-center">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Confidence</h4>
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(222, 30%, 14%)" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(185, 100%, 50%)"
                strokeWidth="6"
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

        {/* Voice Stability */}
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

      {/* Transcript */}
      <GlassCard variant="neon" hover={false}>
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Live Transcript</h4>
        <div className="space-y-3 max-h-32 overflow-y-auto scrollbar-hidden">
          <div className="flex gap-3">
            <span className="text-xs text-primary font-mono shrink-0">AI:</span>
            <p className="text-sm text-foreground">Can you explain the difference between microservices and monolithic architecture?</p>
          </div>
          <div className="flex gap-3">
            <span className="text-xs text-secondary font-mono shrink-0">YOU:</span>
            <p className="text-sm text-muted-foreground">Sure, microservices break down an application into smaller, independent services that communicate via APIs...</p>
          </div>
          <div className="flex gap-3 items-center">
            <span className="text-xs text-primary font-mono shrink-0">AI:</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-pulse" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-pulse" style={{ animationDelay: "0.2s" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-pulse" style={{ animationDelay: "0.4s" }} />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default InterviewRoom;
