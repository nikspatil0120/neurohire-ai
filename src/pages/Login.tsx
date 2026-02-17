import { useState } from "react";
import { Link } from "react-router-dom";
import ParticleBackground from "@/components/ParticleBackground";
import GlassCard from "@/components/GlassCard";
import { Brain, Chrome } from "lucide-react";
import { cn } from "@/lib/utils";

const roles = ["Candidate", "Recruiter", "Admin"] as const;

const Login = () => {
  const [selectedRole, setSelectedRole] = useState<typeof roles[number]>("Candidate");

  return (
    <div className="min-h-screen bg-background flex">
      <ParticleBackground />

      {/* Left side – animated brain */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
        <div className="relative">
          <div className="w-80 h-80 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center animate-fade-in">
            <div className="w-60 h-60 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center pulse-glow">
              <Brain className="w-24 h-24 text-primary neon-glow" />
            </div>
          </div>
          {/* Neural connections */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/60"
              style={{
                top: `${50 + Math.sin(i * 0.785) * 45}%`,
                left: `${50 + Math.cos(i * 0.785) * 45}%`,
                animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Right side – login form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md animate-fade-in-up">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="font-display text-sm tracking-widest neon-glow">NEUROHIRE AI</span>
          </Link>

          <GlassCard variant="neon" hover={false} className="p-8">
            <h2 className="font-display text-2xl tracking-wider mb-2 text-foreground">SIGN IN</h2>
            <p className="text-sm text-muted-foreground mb-8">Access your NeuroHire portal</p>

            {/* Role selector */}
            <div className="flex gap-2 mb-8">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300",
                    selectedRole === role
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
                  )}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Email */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Email</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_15px_hsl(185_100%_50%/0.1)] transition-all"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_15px_hsl(185_100%_50%/0.1)] transition-all"
                />
              </div>
            </div>

            <button className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 mb-4">
              Sign In
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/30" /></div>
              <div className="relative flex justify-center text-xs text-muted-foreground"><span className="px-3 bg-card">or</span></div>
            </div>

            <button className="w-full py-3 rounded-lg border border-border/50 text-foreground text-sm flex items-center justify-center gap-3 hover:bg-muted/30 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_20px_hsl(185_100%_50%/0.1)]">
              <Chrome className="w-5 h-5" />
              Continue with Google
            </button>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Login;
