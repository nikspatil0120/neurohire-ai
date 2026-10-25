import React, { useState } from "react";
import GlassCard from "@/components/GlassCard";
import {
  X, CheckCircle2, AlertTriangle, ShieldCheck,
  Brain, Lightbulb, Clock, User, Mail, Briefcase,
  ChevronDown, ChevronUp, Star, TrendingUp, Check
} from "lucide-react";

interface AIReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: any;
  candidateName?: string;
  candidateEmail?: string;
  jobTitle?: string;
}

export const AIReportModal: React.FC<AIReportModalProps> = ({
  isOpen,
  onClose,
  report,
  candidateName,
  candidateEmail,
  jobTitle,
}) => {
  const [openQuestionIdx, setOpenQuestionIdx] = useState<number | null>(null);

  if (!isOpen || !report) return null;

  const scores = report.scores || {};
  const overall = scores.overall_score ?? "—";
  const numOverall = typeof overall === "number" ? overall : parseFloat(overall) || 0;

  // Recommendation pill
  const recommendation =
    numOverall >= 8.0 ? { label: "Strong Candidate", color: "bg-green-500/20 text-green-400 border-green-500/40" } :
    numOverall >= 6.5 ? { label: "Recommended", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" } :
    numOverall >= 5.0 ? { label: "Borderline / Needs Review", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" } :
    { label: "Not Recommended", color: "bg-red-500/20 text-red-400 border-red-500/40" };

  const signals = report.signals || {};
  const violationsCount = signals.violations_count ?? (signals.violations?.length || 0);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/30 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">AI Technical Interview Report</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${recommendation.color}`}>
                  {recommendation.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {candidateName || report.candidate_name || "Candidate"} • {jobTitle || report.job_title || "Position"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">

          {/* Top Info Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Overall Score */}
            <GlassCard variant="neon" hover={false} className="text-center p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Overall AI Score</p>
              <p className="text-4xl font-display font-bold text-primary neon-glow mt-1">
                {overall}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">out of 10 (Gemini 3-run Avg)</p>
            </GlassCard>

            {/* Candidate Details */}
            <GlassCard variant="neon" hover={false} className="p-4 space-y-1.5 text-xs">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Candidate</p>
              <p className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                {candidateName || report.candidate_name || "Applicant"}
              </p>
              <p className="text-muted-foreground flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {candidateEmail || report.candidate_email || "N/A"}
              </p>
              <p className="text-muted-foreground flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {report.created_at ? new Date(report.created_at).toLocaleString() : "Recently Completed"}
              </p>
            </GlassCard>

            {/* Proctoring Signals */}
            <GlassCard variant="neon" hover={false} className="p-4 text-xs space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Proctoring & Integrity</p>
              <div className="flex items-center gap-2 mt-1">
                {violationsCount === 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/40">
                    <ShieldCheck className="w-3 h-3" /> Clean Session
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    <AlertTriangle className="w-3 h-3" /> {violationsCount} Flag{violationsCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <p className="text-muted-foreground text-[11px] pt-1">
                Face visibility, gaze adherence & window switches verified.
              </p>
            </GlassCard>
          </div>

          {/* Competency Breakdown */}
          <GlassCard variant="neon" hover={false} className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Evaluation Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "Technical Score",    value: scores.technical_score },
                { label: "Behavioral Score",   value: scores.behavioral_score },
                { label: "Technical Accuracy", value: scores.technical_correctness },
                { label: "Technical Depth",    value: scores.technical_depth },
                { label: "Problem Solving",    value: scores.problem_solving },
                { label: "Communication",      value: scores.communication_clarity },
              ].map(({ label, value }) => {
                const val = value ?? 0;
                const pct = Math.min(100, (val / 10) * 100);
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono text-foreground font-semibold">{value ?? "—"} / 10</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Executive Summary */}
          {report.summary && (
            <GlassCard variant="neon" hover={false} className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" /> AI Executive Summary
              </h3>
              <p className="text-sm text-foreground/85 leading-relaxed bg-muted/10 p-3 rounded-xl border border-border/20">
                {report.summary}
              </p>
            </GlassCard>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GlassCard variant="neon" hover={false} className="p-4">
              <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Key Strengths
              </h4>
              <ul className="space-y-1.5">
                {(report.strengths || []).length > 0 ? (
                  report.strengths.map((s: string, i: number) => (
                    <li key={i} className="text-xs text-foreground/90 flex items-start gap-1.5">
                      <Check className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                      <span>{s}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-muted-foreground italic">None noted</li>
                )}
              </ul>
            </GlassCard>

            <GlassCard variant="neon" hover={false} className="p-4">
              <h4 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" /> Areas to Probe / Improve
              </h4>
              <ul className="space-y-1.5">
                {(report.weaknesses || []).length > 0 ? (
                  report.weaknesses.map((w: string, i: number) => (
                    <li key={i} className="text-xs text-foreground/90 flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold shrink-0">→</span>
                      <span>{w}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-muted-foreground italic">None noted</li>
                )}
              </ul>
            </GlassCard>
          </div>

          {/* Full Q&A Transcript */}
          {report.transcript && report.transcript.length > 0 && (
            <GlassCard variant="neon" hover={false} className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" /> Interview Q&A Transcript ({report.transcript.length} Questions)
              </h3>
              <div className="space-y-2">
                {report.transcript.map((item: any, idx: number) => {
                  const isOpen = openQuestionIdx === idx;
                  const score = item.final_eval?.combined_score !== undefined
                    ? Math.round(item.final_eval.combined_score * 10)
                    : null;

                  return (
                    <div key={idx} className="border border-border/30 rounded-xl overflow-hidden bg-muted/10">
                      <button
                        type="button"
                        onClick={() => setOpenQuestionIdx(isOpen ? null : idx)}
                        className="w-full p-3 text-left flex items-center justify-between gap-3 hover:bg-muted/20 transition-all text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded bg-primary/20 text-primary flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-medium text-foreground truncate">
                            {item.topic || item.category || `Question ${idx + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {score !== null && (
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-primary/20 text-primary">
                              {score}/10
                            </span>
                          )}
                          <span className="text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="p-3 border-t border-border/20 space-y-2 bg-muted/5 text-xs">
                          {item.exchanges?.map((ex: any, exIdx: number) => (
                            <div key={exIdx} className="space-y-1">
                              <p className="text-muted-foreground"><strong className="text-foreground">Alex:</strong> {ex.question}</p>
                              <p className="text-foreground/90 pl-3 border-l-2 border-primary/40"><strong className="text-primary">Candidate:</strong> {ex.answer || "(No response recorded)"}</p>
                            </div>
                          ))}
                          {item.final_eval?.reason && (
                            <p className="text-[11px] text-muted-foreground/80 italic pt-1 border-t border-border/10">
                              AI Feedback: {item.final_eval.reason}
                            </p>
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

        {/* Footer */}
        <div className="p-4 border-t border-border/30 bg-muted/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
