import { cn } from "@/lib/utils";

interface WaveformAnimationProps {
  bars?: number;
  className?: string;
  color?: "cyan" | "purple";
}

const WaveformAnimation = ({ bars = 20, className, color = "cyan" }: WaveformAnimationProps) => {
  return (
    <div className={cn("flex items-end gap-[2px] h-12", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full",
            color === "cyan" ? "bg-primary" : "bg-secondary"
          )}
          style={{
            height: "100%",
            animation: `waveform 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  );
};

export default WaveformAnimation;
