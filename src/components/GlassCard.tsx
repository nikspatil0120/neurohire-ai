import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "neon" | "purple" | "holographic";
  hover?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const GlassCard = ({ children, className, variant = "default", hover = true, style, onClick }: GlassCardProps) => {
  const variants = {
    default: "glass-panel",
    neon: "glass-panel neon-border",
    purple: "glass-panel neon-border-purple",
    holographic: "glass-panel holographic-border",
  };

  return (
    <div
      className={cn(
        variants[variant],
        "p-6 transition-all duration-300",
        hover && "hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10 hover:border-primary/40",
        onClick && "cursor-pointer",
        className
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default GlassCard;
