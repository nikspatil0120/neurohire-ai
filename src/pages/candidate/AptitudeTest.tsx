import { useState } from "react";
import GlassCard from "@/components/GlassCard";
import { Clock, ArrowRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

const AptitudeTest = () => {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <span className="font-display text-sm tracking-widest text-foreground">APTITUDE TEST</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <span className="font-display text-sm text-primary">Q5</span>
            <span className="text-xs text-muted-foreground">/ 20</span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-foreground">18:42</span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1 rounded-full bg-muted/30 mb-8">
        <div className="h-full w-[25%] rounded-full bg-gradient-to-r from-primary to-neon-cyan transition-all" />
      </div>

      {/* Question */}
      <div className="max-w-3xl mx-auto">
        <GlassCard variant="neon" hover={false} className="mb-6">
          <p className="text-foreground text-lg">
            If a train travels 360 km in 4 hours, and then increases its speed by 20 km/h for the next 3 hours, what is the total distance covered?
          </p>
        </GlassCard>

        <div className="space-y-3 mb-8">
          {["870 km", "930 km", "990 km", "1050 km"].map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                "w-full p-4 rounded-lg text-left transition-all duration-300 border",
                selected === i
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-muted/20 border-border/30 text-foreground hover:border-primary/20 hover:bg-muted/30"
              )}
            >
              <span className="font-mono text-sm mr-3 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          ))}
        </div>

        <button className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 flex items-center justify-center gap-2">
          Next Question <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AptitudeTest;
