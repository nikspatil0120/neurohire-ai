import GlassCard from "@/components/GlassCard";
import { Clock, Play, Send, CheckCircle, XCircle, Brain } from "lucide-react";

const TechnicalCoding = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-primary" />
          <span className="font-display text-sm tracking-widest text-foreground">CODING CHALLENGE</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-foreground">42:15</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-100px)]">
        {/* Problem */}
        <div className="flex flex-col gap-4">
          <GlassCard variant="neon" hover={false} className="flex-1 overflow-auto">
            <h3 className="text-foreground font-semibold mb-3">Two Sum</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Given an array of integers <code className="text-primary">nums</code> and an integer <code className="text-primary">target</code>,
              return indices of the two numbers that add up to target.
            </p>
            <div className="bg-muted/30 rounded-lg p-3 mb-3">
              <p className="text-xs text-muted-foreground mb-1">Example:</p>
              <code className="text-sm text-foreground font-mono">Input: nums = [2,7,11,15], target = 9</code>
              <br />
              <code className="text-sm text-primary font-mono">Output: [0,1]</code>
            </div>
          </GlassCard>

          {/* Test Cases */}
          <GlassCard variant="neon" hover={false}>
            <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Test Cases</h4>
            <div className="space-y-2">
              {[
                { input: "[2,7,11,15], 9", expected: "[0,1]", passed: true },
                { input: "[3,2,4], 6", expected: "[1,2]", passed: true },
                { input: "[3,3], 6", expected: "[0,1]", passed: false },
              ].map((tc, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  {tc.passed ? <CheckCircle className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  <span className="text-muted-foreground font-mono text-xs">{tc.input}</span>
                  <span className="text-foreground font-mono text-xs ml-auto">{tc.expected}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Code Editor */}
        <div className="flex flex-col gap-4">
          <GlassCard variant="neon" hover={false} className="flex-1">
            <pre className="text-sm font-mono text-foreground h-full">
              <code>{`function twoSum(nums, target) {
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    
    map.set(nums[i], i);
  }
  
  return [];
}`}</code>
            </pre>
          </GlassCard>

          {/* AI Evaluation Meter */}
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">AI Evaluation</span>
              <span className="text-xs text-primary font-mono">Analyzing...</span>
            </div>
            <div className="h-2 rounded-full bg-muted/30">
              <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-primary to-secondary animate-glow-pulse" />
            </div>
          </GlassCard>

          <div className="flex gap-3">
            <button className="flex-1 py-3 rounded-lg border border-border/50 text-foreground text-sm flex items-center justify-center gap-2 hover:bg-muted/30 transition-all">
              <Play className="w-4 h-4" /> Run
            </button>
            <button className="flex-1 py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all">
              <Send className="w-4 h-4" /> Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicalCoding;
