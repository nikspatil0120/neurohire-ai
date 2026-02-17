import { Link } from "react-router-dom";
import ParticleBackground from "@/components/ParticleBackground";
import HologramAvatar from "@/components/HologramAvatar";
import GlassCard from "@/components/GlassCard";
import WaveformAnimation from "@/components/WaveformAnimation";
import { Brain, Shield, Zap, Eye, BarChart3, Users, ArrowRight, Mic } from "lucide-react";

const features = [
  { icon: Brain, title: "AI-Powered Interviews", desc: "Real-time adaptive questioning with neural language processing" },
  { icon: Eye, title: "Emotion Detection", desc: "Live facial analysis and sentiment tracking during interviews" },
  { icon: Mic, title: "Voice Analysis", desc: "Confidence and stability metrics from vocal patterns" },
  { icon: BarChart3, title: "Deep Analytics", desc: "Comprehensive candidate scoring with predictive insights" },
  { icon: Shield, title: "Secure Environment", desc: "Tab monitoring, face detection, and anti-cheat systems" },
  { icon: Users, title: "Recruiter Portal", desc: "Full pipeline management with AI-ranked candidates" },
];

const steps = [
  { num: "01", title: "Create Job", desc: "Upload job description and configure AI interview parameters" },
  { num: "02", title: "AI Interviews", desc: "Candidates face adaptive AI questioning with real-time analysis" },
  { num: "03", title: "Smart Ranking", desc: "Get AI-ranked candidates with detailed performance reports" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      <ParticleBackground />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-border/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg tracking-widest neon-glow">NEUROHIRE</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Login
          </Link>
          <Link
            to="/login"
            className="px-5 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 transition-all duration-300 hover:shadow-[0_0_20px_hsl(185_100%_50%/0.2)]"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center py-24 px-8">
        <HologramAvatar className="mb-12 animate-fade-in" />

        <h1 className="font-display text-5xl md:text-7xl tracking-wider text-center mb-6 animate-fade-in-up" style={{ animationDelay: "0.2s", opacity: 0 }}>
          <span className="gradient-text">NEUROHIRE</span>{" "}
          <span className="text-foreground">AI</span>
        </h1>

        <p className="text-lg text-muted-foreground text-center max-w-2xl mb-10 animate-fade-in-up" style={{ animationDelay: "0.4s", opacity: 0 }}>
          Next-generation AI recruitment platform. Adaptive interviews, emotion detection,
          and predictive analytics — all in one cinematic experience.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: "0.6s", opacity: 0 }}>
          <Link
            to="/candidate/dashboard"
            className="px-8 py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 flex items-center gap-2"
          >
            Start Interview <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/recruiter/dashboard"
            className="px-8 py-3 rounded-lg border border-secondary/40 text-secondary hover:bg-secondary/10 font-semibold text-sm tracking-wide transition-all duration-300"
          >
            Recruiter Portal
          </Link>
        </div>

        <WaveformAnimation bars={30} className="mt-16 opacity-40 animate-fade-in" />
      </section>

      {/* Features */}
      <section className="relative z-10 py-24 px-8">
        <h2 className="font-display text-3xl tracking-wider text-center mb-4 gradient-text">FEATURES</h2>
        <p className="text-muted-foreground text-center mb-16 max-w-xl mx-auto">Powered by cutting-edge AI to transform your hiring pipeline</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((f, i) => (
            <GlassCard key={f.title} variant="neon" className="animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s`, opacity: 0 } as React.CSSProperties}>
              <f.icon className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-foreground font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-24 px-8">
        <h2 className="font-display text-3xl tracking-wider text-center mb-16 gradient-text">HOW IT WORKS</h2>

        <div className="flex flex-col md:flex-row gap-8 max-w-4xl mx-auto">
          {steps.map((s, i) => (
            <GlassCard key={s.num} variant="purple" hover={false} className="flex-1 text-center animate-fade-in-up" style={{ animationDelay: `${i * 0.2}s`, opacity: 0 } as React.CSSProperties}>
              <span className="font-display text-4xl gradient-text-reverse">{s.num}</span>
              <h3 className="text-foreground font-semibold mt-4 mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="relative z-10 py-24 px-8">
        <GlassCard variant="holographic" hover={false} className="max-w-4xl mx-auto text-center py-16">
          <Shield className="w-12 h-12 text-primary mx-auto mb-6" />
          <h2 className="font-display text-3xl tracking-wider mb-4 text-foreground">ENTERPRISE-GRADE SECURITY</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Real-time camera monitoring, tab-switch detection, face verification, and encrypted data channels.
            Your interview environment is locked down.
          </p>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/20 py-8 px-8 text-center">
        <p className="text-sm text-muted-foreground">© 2026 NeuroHire AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Index;
