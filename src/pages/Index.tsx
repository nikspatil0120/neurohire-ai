import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ParticleBackground from "@/components/ParticleBackground";
import GlassCard from "@/components/GlassCard";
import UserProfile from "@/components/UserProfile";
import { useAuth } from "@/contexts/AuthContext";
import {
  Brain,
  Shield,
  Zap,
  Eye,
  BarChart3,
  Users,
  ArrowRight,
  Code2,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Sun,
  Moon,
  ChevronRight,
  Target,
  Search,
} from "lucide-react";

const features = [
  {
    icon: Code2,
    title: "Technical Interviews",
    desc: "Multi-language sandboxed coding challenges in Python, Java, C++, JS with automated test case validation and aptitude tests.",
  },
  {
    icon: Users,
    title: "Behavioral Interviews",
    desc: "Structured soft skills assessment evaluating communication clarity, situational problem-solving, and role readiness.",
  },
  {
    icon: Eye,
    title: "Real-Time Multimodal Analysis",
    desc: "Live analysis of voice tone, emotional state, and facial expressions during candidate interview sessions.",
  },
  {
    icon: Brain,
    title: "Adaptive Questioning",
    desc: "Intelligent question engine that dynamically adjusts difficulty and asks follow-ups based on real-time candidate answers.",
  },
  {
    icon: Target,
    title: "Aptitude & Reasoning",
    desc: "Comprehensive quantitative, logical, and verbal evaluations with automated scoring and instant feedback.",
  },
  {
    icon: BarChart3,
    title: "Recruiter Pipeline & Analytics",
    desc: "Unified review of code submissions, multimodal interview recordings, proctoring alerts, and applicant rankings.",
  },
];

const steps = [
  {
    num: "01",
    title: "Practice & Assess",
    desc: "Candidates solve algorithmic coding problems, take timed aptitude modules, and prepare with AI mock interviews.",
  },
  {
    num: "02",
    title: "Take Proctored Rounds",
    desc: "Complete assigned company coding challenges and adaptive AI interviews under live integrity monitoring.",
  },
  {
    num: "03",
    title: "Recruiter Review & Decision",
    desc: "Hiring teams inspect verified code executions, interview feedback, and performance breakdowns to make confident hiring decisions.",
  },
];

const Index = () => {
  const { isAuthenticated } = useAuth();

  // Cinematic Intro Animation Stages:
  // 'student_center' (0-2s) -> 'glide_left' (2-2.8s) -> 'netflix_flash' (2.8-4.2s) -> 'settled'
  const [introStage, setIntroStage] = useState<"student_center" | "glide_left" | "netflix_flash" | "settled">("student_center");

  // Theme toggle state (Light by default, persisted in localStorage upon user choice)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neurohire-theme");
      if (saved) return saved === "dark";
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("neurohire-theme", next ? "dark" : "light");
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    // Stage 1 -> Stage 2 (Student starts in center, then glides to left)
    const t1 = setTimeout(() => {
      setIntroStage("glide_left");
    }, 2000);

    // Stage 2 -> Stage 3 (Netflix-style Flash Reveal)
    const t2 = setTimeout(() => {
      setIntroStage("netflix_flash");
    }, 2800);

    // Stage 3 -> Stage 4 (Settled landing page)
    const t3 = setTimeout(() => {
      setIntroStage("settled");
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleReplayIntro = () => {
    setIntroStage("student_center");
    setTimeout(() => setIntroStage("glide_left"), 2000);
    setTimeout(() => setIntroStage("netflix_flash"), 2800);
    setTimeout(() => setIntroStage("settled"), 4500);
  };

  const handleSkipIntro = () => {
    setIntroStage("settled");
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20">
      <ParticleBackground />

      {/* ═══════════════════════════════════════════════════════════════════
          CINEMATIC INTRO OVERLAY (Runs when introStage !== 'settled')
      ═══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {introStage !== "settled" && (
          <motion.div
            key="cinematic-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-2xl overflow-hidden"
          >
            {/* Skip Intro Button */}
            <button
              type="button"
              onClick={handleSkipIntro}
              className="absolute top-6 right-8 px-4 py-1.5 rounded-full border border-border/60 bg-card/60 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all z-50 backdrop-blur-md"
            >
              Skip Intro ➔
            </button>

            {/* STAGE 1 & 2: Student searching in center, then gliding to left */}
            {(introStage === "student_center" || introStage === "glide_left") && (
              <motion.div
                key="student-intro-card"
                initial={{ scale: 0.85, opacity: 0, y: 30 }}
                animate={
                  introStage === "student_center"
                    ? { scale: 1, opacity: 1, y: 0, x: 0 }
                    : { scale: 0.65, opacity: 0.2, x: -450, y: -80, filter: "blur(6px)" }
                }
                transition={{
                  duration: introStage === "student_center" ? 0.9 : 0.8,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative flex flex-col items-center"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-primary/40 p-1.5 bg-gradient-to-b from-primary/30 to-card/60">
                  <img
                    src="/student-search.jpg"
                    alt="Student searching job opportunities"
                    className="w-[380px] sm:w-[480px] md:w-[540px] rounded-xl object-cover"
                  />
                  {/* Subtle search radar badge */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-border/60 text-xs font-semibold flex items-center gap-2 text-foreground">
                    <Search className="w-3.5 h-3.5 text-primary animate-pulse" />

                  </div>
                </div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-5 text-sm sm:text-base font-medium text-muted-foreground tracking-wide text-center"
                >

                </motion.p>
              </motion.div>
            )}

            {/* STAGE 3: Netflix-Style Flash Reveal of NeuroHire AI Logo */}
            {introStage === "netflix_flash" && (
              <div className="relative flex flex-col items-center justify-center">
                {/* Radial Glow Burst Flash behind logo */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 2.5, 3], opacity: [0, 0.8, 0] }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-primary via-secondary to-neon-cyan blur-3xl pointer-events-none"
                />

                {/* White / Cyan Center Light Streak Flash */}
                <motion.div
                  initial={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: [0, 1, 0], scaleX: [0, 1.8, 2.5] }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="absolute h-1 w-full max-w-2xl bg-white shadow-[0_0_50px_hsl(185_100%_70%)] pointer-events-none"
                />

                {/* Logo Explosive Zoom-In */}
                <motion.div
                  initial={{ scale: 0.25, opacity: 0, filter: "brightness(2.5) contrast(1.5)" }}
                  animate={{
                    scale: [0.25, 1.15, 1],
                    opacity: [0, 1, 1],
                    filter: ["brightness(2.5)", "brightness(1.4)", "brightness(1)"],
                  }}
                  transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex flex-col items-center"
                >
                  <img
                    src="/neurohire-symbol.png"
                    alt="NeuroHire AI Symbol"
                    className="w-[140px] sm:w-[180px] md:w-[210px] object-contain drop-shadow-[0_0_50px_hsl(var(--primary)/0.7)]"
                  />
                  <span className="mt-4 font-display text-2xl sm:text-3xl font-extrabold tracking-widest text-foreground">
                    NEUROHIRE <span className="gradient-text">AI</span>
                  </span>
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="mt-3 flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Next-Gen AI Hiring & Technical Assessment</span>
                  </motion.div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════
          PERMANENT NAVIGATION BAR
      ═══════════════════════════════════════════════════════════════════ */}
      <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 py-4 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/neurohire-symbol.png"
              alt="NeuroHire Logo"
              className="h-9 w-auto object-contain transition-transform group-hover:scale-105 drop-shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
            />
            <span className="font-display text-base font-bold tracking-wider text-foreground">
              NEUROHIRE <span className="text-primary font-semibold">AI</span>
            </span>
          </Link>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground font-medium">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#security" className="hover:text-foreground transition-colors">Security</a>
          <Link to="/candidate/practice" className="hover:text-primary transition-colors flex items-center gap-1 text-primary/90">
            Practice Lab <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Replay Intro Button */}
          <button
            type="button"
            onClick={handleReplayIntro}
            title="Replay cinematic intro"
            className="p-2 rounded-lg border border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>

          {isAuthenticated ? (
            <UserProfile />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg border border-border/60 text-foreground hover:bg-muted/40 text-xs font-semibold uppercase tracking-wider transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold uppercase tracking-wider transition-all shadow-sm shadow-primary/30 hidden sm:inline-flex"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO SECTION: Student Visual with Live Floating Badges + Headline
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 px-6 sm:px-10 py-12 lg:py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Column: Headlines & Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/25">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Powered Technical Interviews with Multimodal Analysis</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Intelligent Recruitment with <br />
              <span className="gradient-text">Multimodal AI Interviews</span>.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              <strong className="text-foreground font-semibold">NeuroHire AI</strong> is an intelligent recruitment platform that conducts AI-powered technical interviews with multimodal analysis. The system evaluates candidates through:
            </p>

            {/* 4 Core System Evaluation Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-left">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card/70 border border-border/60 hover:border-primary/40 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <Code2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Technical interviews</span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Coding problems, aptitude tests</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card/70 border border-border/60 hover:border-primary/40 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Behavioral interviews</span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Soft skills assessment</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card/70 border border-border/60 hover:border-primary/40 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Real-time multimodal analysis</span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Facial expressions</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card/70 border border-border/60 hover:border-primary/40 transition-colors">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Adaptive questioning</span>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Difficulty adjusts based on performance</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
              <Link
                to="/login"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm tracking-wide hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group"
              >
                Start Practice Assessment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/candidate/practice"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-border/80 hover:border-primary/50 bg-card/60 hover:bg-muted/30 text-foreground font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                <Code2 className="w-4 h-4 text-primary" />
                Explore Practice Lab
              </Link>
            </div>
          </div>

          {/* Right Column: Hero Visual with Student & Authentic System Badges (5 cols) */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            {/* Ambient Back Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-secondary/20 to-transparent blur-3xl rounded-3xl -z-10" />

            <div className="relative rounded-2xl overflow-hidden border border-border/80 shadow-2xl bg-card/40 p-2">
              <img
                src="/student-search.jpg"
                alt="Student preparing for technical evaluations"
                className="w-full h-auto rounded-xl object-cover hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES SECTION
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="features" className="relative z-10 py-20 px-6 sm:px-10 border-t border-border/30 bg-muted/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Intelligent Platform</span>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Built for Modern Technical Recruitment
            </h2>
            <p className="text-sm text-muted-foreground">
              Eliminate resume screening bottlenecks with objective, real-time AI assessments and secure proctored environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <GlassCard key={f.title} variant="default" className="p-6 hover:border-primary/40 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="relative z-10 py-20 px-6 sm:px-10 max-w-6xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Process Flow</span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            How NeuroHire AI Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <GlassCard key={s.num} variant="default" className="p-6 text-center space-y-3">
              <span className="inline-block font-display text-3xl font-extrabold text-primary/70">{s.num}</span>
              <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECURITY & PROCTORING BANNER
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="security" className="relative z-10 py-16 px-6 sm:px-10 max-w-5xl mx-auto">
        <GlassCard variant="default" className="p-8 sm:p-12 text-center border-primary/30 bg-gradient-to-br from-primary/5 via-card/80 to-card">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-5">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
            Anti-Cheat & Proctoring Engine
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
            Real-time camera presence detection, tab-switch monitoring, automated code analysis, and encrypted streams protect assessment integrity so top talent stands out fairly.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/login"
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
            >
              Get Started Now
            </Link>
          </div>
        </GlassCard>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-border/30 py-8 px-6 sm:px-10 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/neurohire-symbol.png" alt="NeuroHire AI Symbol" className="h-7 w-auto object-contain" />
            <span className="font-display text-sm font-bold tracking-wider text-foreground">
              NEUROHIRE <span className="text-primary font-semibold">AI</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 NeuroHire AI. Built with precision for modern hiring.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">Login</Link>
            <Link to="/candidate/practice" className="hover:text-foreground">Practice Lab</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

