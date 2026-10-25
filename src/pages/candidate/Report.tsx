import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Target, Building2, FileText, User, LogOut,
  TrendingUp, Star, Lightbulb, Briefcase, MessageCircle,
  Brain, Clock, CheckCircle2, ChevronRight, Award,
  Sparkles, Check, ArrowRight
} from "lucide-react";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",              href: "/candidate/dashboard",              icon: LayoutDashboard },
  { label: "Practice",               href: "/candidate/practice",               icon: Target },
  { label: "Company Interviews",     href: "/candidate/interviews",             icon: Building2 },
  { label: "Incoming Opportunities", href: "/candidate/incoming-opportunities", icon: Briefcase },
  { label: "Messages",              href: "/candidate/messages",              icon: MessageCircle },
  { label: "Reports",                href: "/candidate/reports",                icon: FileText },
  { label: "Profile",                href: "/candidate/profile",                icon: User },
  { label: "Logout",                 href: "/login",                            icon: LogOut },
];

interface PracticeReport {
  _id: string;
  interview_type: string;
  candidate_id: string;
  job_title: string;
  company?: string;
  created_at: string;
  scores: {
    overall_score?: number;
    technical_score?: number;
    behavioral_score?: number;
    technical_correctness?: number;
    technical_depth?: number;
    problem_solving?: number;
    communication_clarity?: number;
    behavioral_fit?: number;
  };
  radar_metrics?: { label: string; value: number }[];
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  transcript?: any[];
  signals?: any;
}

const Report = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<PracticeReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<PracticeReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openQuestionIdx, setOpenQuestionIdx] = useState<number | null>(null);

  useEffect(() => {
    loadReports();
  }, [user?.id]);

  const loadReports = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/interview-ai/practice-reports?candidate_id=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        const list: PracticeReport[] = data.reports || [];
        setReports(list);
        if (list.length > 0) {
          setSelectedReport(list[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load practice reports:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Stats calculation across all practice sessions
  const totalSessions = reports.length;
  const avgScore = totalSessions > 0
    ? (reports.reduce((acc, r) => acc + (r.scores?.overall_score || 0), 0) / totalSessions).toFixed(1)
    : "—";
  const bestScore = totalSessions > 0
    ? Math.max(...reports.map(r => r.scores?.overall_score || 0)).toFixed(1)
    : "—";

  // Active report metrics
  const activeScores = selectedReport?.scores || {};
  const radarMetrics = selectedReport?.radar_metrics || [
    { label: "Technical", value: Math.round(((activeScores.technical_score ?? 7) / 10) * 100) },
    { label: "Depth", value: Math.round(((activeScores.technical_depth ?? 7) / 10) * 100) },
    { label: "Problem Solving", value: Math.round(((activeScores.problem_solving ?? 7) / 10) * 100) },
    { label: "Communication", value: Math.round(((activeScores.communication_clarity ?? 7) / 10) * 100) },
    { label: "Behavioral", value: Math.round(((activeScores.behavioral_score ?? 7) / 10) * 100) },
  ];

  return (
    <DashboardLayout navItems={navItems} title="PRACTICE PERFORMANCE REPORTS">
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── Top Summary Header ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <GlassCard variant="neon" hover={false} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Practice Sessions</p>
                <p className="text-2xl font-display font-bold text-foreground">{totalSessions}</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="neon" hover={false} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Avg Score</p>
                <p className="text-2xl font-display font-bold text-cyan-400">{avgScore} <span className="text-xs font-normal text-muted-foreground">/ 10</span></p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="neon" hover={false} className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Highest Score</p>
                <p className="text-2xl font-display font-bold text-green-400">{bestScore} <span className="text-xs font-normal text-muted-foreground">/ 10</span></p>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="neon" hover={false} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Ready to Practice?</p>
              <p className="text-xs text-foreground/80 mt-0.5">Sharpen skills with Alex</p>
            </div>
            <Link
              to="/candidate/practice"
              className="px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              Start <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </GlassCard>
        </div>

        {/* ── Main Content Area ── */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : reports.length === 0 ? (
          /* Empty State */
          <GlassCard variant="neon" hover={false} className="p-12 text-center max-w-xl mx-auto my-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <Brain className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-xl font-display text-foreground font-semibold mb-2">No Practice Reports Yet</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              You haven't completed any practice AI interviews yet. Take a realistic mock interview in Practice Mode to evaluate your technical depth, receive personalized AI recommendations, and track your performance over time.
            </p>
            <Link
              to="/candidate/practice"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
            >
              <Target className="w-4 h-4" /> Start Your First Practice Round
            </Link>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left: Session History List (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Past Sessions ({reports.length})
                </span>
                <span className="text-[11px] text-muted-foreground">Practice Mode</span>
              </div>

              <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
                {reports.map((rep) => {
                  const isSelected = selectedReport?._id === rep._id;
                  const dateStr = new Date(rep.created_at).toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric"
                  });
                  const timeStr = new Date(rep.created_at).toLocaleTimeString(undefined, {
                    hour: "2-digit", minute: "2-digit"
                  });

                  return (
                    <div
                      key={rep._id}
                      onClick={() => { setSelectedReport(rep); setOpenQuestionIdx(null); }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-primary/15 border-primary/50 shadow-md shadow-primary/10"
                          : "bg-muted/15 border-border/30 hover:bg-muted/25 hover:border-border/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {rep.job_title || "Practice Interview"}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground/70" /> {dateStr} at {timeStr}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`inline-block px-2.5 py-1 rounded-lg font-mono text-xs font-bold ${
                            (rep.scores?.overall_score || 0) >= 8
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : (rep.scores?.overall_score || 0) >= 6
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}>
                            {rep.scores?.overall_score ?? "—"}/10
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Session Detailed Report (8 cols) */}
            {selectedReport && (
              <div className="lg:col-span-8 space-y-5">

                {/* Session Hero Header */}
                <GlassCard variant="neon" hover={false} className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary/15 text-primary border border-primary/30 mb-2">
                        <Sparkles className="w-3 h-3" /> Practice Evaluation
                      </div>
                      <h2 className="text-2xl font-display font-bold text-foreground">
                        {selectedReport.job_title}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        <span>Completed on {new Date(selectedReport.created_at).toLocaleString()}</span>
                        <span>•</span>
                        <span>{selectedReport.transcript?.length || 0} Questions Evaluated</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-center px-5 py-3 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/40">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Overall Score</p>
                        <p className="text-4xl font-display font-bold text-primary neon-glow mt-0.5">
                          {selectedReport.scores?.overall_score ?? "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">out of 10</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Radar & Score Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* Skill Radar Chart */}
                  <GlassCard variant="neon" hover={false} className="p-5 flex flex-col items-center justify-center">
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2 self-start">
                      <Star className="w-4 h-4 text-primary" /> Skill Dimension Radar
                    </h3>

                    <div className="w-full aspect-square max-w-[260px] relative flex items-center justify-center">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {/* Pentagon Grid Rings */}
                        {[1, 0.75, 0.5, 0.25].map((scale, i) => (
                          <polygon
                            key={i}
                            points={radarMetrics.map((_, j) => {
                              const angle = (j * 2 * Math.PI) / radarMetrics.length - Math.PI / 2;
                              return `${100 + 75 * scale * Math.cos(angle)},${100 + 75 * scale * Math.sin(angle)}`;
                            }).join(" ")}
                            fill="none"
                            stroke="hsl(185, 40%, 20%)"
                            strokeWidth="0.75"
                          />
                        ))}

                        {/* Metric Value Polygon */}
                        <polygon
                          points={radarMetrics.map((s, j) => {
                            const angle = (j * 2 * Math.PI) / radarMetrics.length - Math.PI / 2;
                            const r = Math.max(10, Math.min(100, s.value)) * 0.75;
                            return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                          }).join(" ")}
                          fill="hsl(185, 100%, 50%, 0.2)"
                          stroke="hsl(185, 100%, 50%)"
                          strokeWidth="2"
                          className="drop-shadow-[0_0_8px_hsl(185_100%_50%/0.6)]"
                        />

                        {/* Labels */}
                        {radarMetrics.map((s, j) => {
                          const angle = (j * 2 * Math.PI) / radarMetrics.length - Math.PI / 2;
                          const x = 100 + 92 * Math.cos(angle);
                          const y = 100 + 92 * Math.sin(angle);
                          return (
                            <text
                              key={j}
                              x={x}
                              y={y}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              className="fill-foreground text-[8px] font-medium"
                            >
                              {s.label}
                            </text>
                          );
                        })}
                      </svg>
                    </div>
                  </GlassCard>

                  {/* Score Breakdown Progress Bars */}
                  <GlassCard variant="neon" hover={false} className="p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-cyan-400" /> Competency Breakdown
                      </h3>

                      <div className="space-y-3.5">
                        {[
                          { label: "Technical Score",    value: activeScores.technical_score },
                          { label: "Behavioral Score",   value: activeScores.behavioral_score },
                          { label: "Technical Accuracy", value: activeScores.technical_correctness },
                          { label: "Technical Depth",    value: activeScores.technical_depth },
                          { label: "Problem Solving",    value: activeScores.problem_solving },
                          { label: "Communication",      value: activeScores.communication_clarity },
                        ].map(({ label, value }) => {
                          const scoreVal = value ?? 0;
                          const pct = Math.min(100, (scoreVal / 10) * 100);
                          return (
                            <div key={label} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{label}</span>
                                <span className="font-mono text-foreground font-semibold">
                                  {value !== undefined ? value : "—"} / 10
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* AI Executive Summary */}
                {selectedReport.summary && (
                  <GlassCard variant="neon" hover={false} className="p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400" /> AI Executive Summary
                    </h3>
                    <p className="text-sm text-foreground/85 leading-relaxed bg-muted/10 p-3.5 rounded-xl border border-border/20">
                      {selectedReport.summary}
                    </p>
                  </GlassCard>
                )}

                {/* Strengths & Areas to Improve Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <GlassCard variant="neon" hover={false} className="p-5">
                    <h3 className="text-sm font-semibold text-green-400 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Demonstrated Strengths
                    </h3>
                    <ul className="space-y-2">
                      {(selectedReport.strengths || []).length > 0 ? (
                        selectedReport.strengths?.map((s, i) => (
                          <li key={i} className="text-xs text-foreground/90 flex items-start gap-2 bg-green-500/5 p-2 rounded-lg border border-green-500/15">
                            <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-muted-foreground italic">None recorded</li>
                      )}
                    </ul>
                  </GlassCard>

                  <GlassCard variant="neon" hover={false} className="p-5">
                    <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" /> Areas for Improvement
                    </h3>
                    <ul className="space-y-2">
                      {(selectedReport.weaknesses || []).length > 0 ? (
                        selectedReport.weaknesses?.map((w, i) => (
                          <li key={i} className="text-xs text-foreground/90 flex items-start gap-2 bg-amber-500/5 p-2 rounded-lg border border-amber-500/15">
                            <span className="text-amber-400 shrink-0 mt-0.5 font-bold">→</span>
                            <span>{w}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-xs text-muted-foreground italic">None recorded</li>
                      )}
                    </ul>
                  </GlassCard>
                </div>

                {/* Question-by-Question Transcript */}
                {selectedReport.transcript && selectedReport.transcript.length > 0 && (
                  <GlassCard variant="neon" hover={false} className="p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" /> Question-by-Question Performance ({selectedReport.transcript.length})
                    </h3>

                    <div className="space-y-2.5">
                      {selectedReport.transcript.map((item: any, idx: number) => {
                        const isOpen = openQuestionIdx === idx;
                        const score = item.final_eval?.combined_score !== undefined
                          ? Math.round(item.final_eval.combined_score * 10)
                          : null;

                        return (
                          <div
                            key={idx}
                            className="border border-border/30 rounded-xl overflow-hidden bg-muted/10 transition-colors"
                          >
                            <button
                              type="button"
                              onClick={() => setOpenQuestionIdx(isOpen ? null : idx)}
                              className="w-full p-3.5 text-left flex items-center justify-between gap-3 hover:bg-muted/20 transition-all"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-medium text-foreground truncate">
                                  {item.topic || item.category || `Question ${idx + 1}`}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 flex-shrink-0">
                                {score !== null && (
                                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                                    score >= 8 ? "bg-green-500/20 text-green-400" :
                                    score >= 6 ? "bg-primary/20 text-primary" : "bg-amber-500/20 text-amber-400"
                                  }`}>
                                    {score}/10
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
                              </div>
                            </button>

                            {isOpen && (
                              <div className="p-4 border-t border-border/20 space-y-3 bg-muted/5 text-xs">
                                {item.exchanges?.map((ex: any, exIdx: number) => (
                                  <div key={exIdx} className="space-y-1.5">
                                    <div className="p-2.5 rounded-lg bg-muted/20 text-muted-foreground">
                                      <strong className="text-foreground">Alex:</strong> {ex.question}
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-primary/10 border-l-2 border-primary text-foreground/90 pl-3">
                                      <strong className="text-primary">Your Answer:</strong> {ex.answer || "(No response recorded)"}
                                    </div>
                                  </div>
                                ))}

                                {item.final_eval && (
                                  <div className="mt-2 p-3 rounded-lg bg-card border border-border/30 space-y-1.5">
                                    <div className="flex gap-4 text-[11px] text-muted-foreground">
                                      <span>Correctness: <strong className="text-foreground">{Math.round((item.final_eval.correctness_score ?? 0) * 10)}/10</strong></span>
                                      <span>Depth: <strong className="text-foreground">{Math.round((item.final_eval.depth_score ?? 0) * 10)}/10</strong></span>
                                      <span>Completeness: <strong className="text-foreground">{Math.round((item.final_eval.completeness_score ?? 0) * 10)}/10</strong></span>
                                    </div>
                                    {item.final_eval.reason && (
                                      <p className="text-[11px] text-muted-foreground/90 italic pt-1 border-t border-border/10">
                                        Feedback: {item.final_eval.reason}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}

              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Report;
