import { cn } from "@/lib/utils";

const HologramAvatar = ({ className }: { className?: string }) => {
  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer ring */}
      <div className="absolute w-64 h-64 rounded-full border border-primary/20 animate-spin-slow" />
      <div className="absolute w-72 h-72 rounded-full border border-secondary/10 animate-spin-slow" style={{ animationDirection: "reverse", animationDuration: "30s" }} />
      
      {/* Core */}
      <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm flex items-center justify-center pulse-glow">
        <div className="w-36 h-36 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center">
            {/* AI Brain icon */}
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-primary neon-glow" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2a8 8 0 0 0-8 8c0 3.4 2.1 6.3 5 7.5V20h6v-2.5c2.9-1.2 5-4.1 5-7.5a8 8 0 0 0-8-8z" />
              <path d="M9 22h6M12 2v4M8 6l2 2M16 6l-2 2M7 12h2M15 12h2M10 16h4" />
            </svg>
          </div>
        </div>
      </div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/60"
          style={{
            top: `${20 + Math.sin(i * 1.05) * 40}%`,
            left: `${20 + Math.cos(i * 1.05) * 40}%`,
            animation: `float 3s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
};

export default HologramAvatar;
