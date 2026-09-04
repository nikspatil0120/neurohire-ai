import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, FilePlus, Database, BarChart2,
  MessageCircle, LogOut, User, Briefcase, Users,
  X, Download, ChevronDown, ChevronUp,
} from "lucide-react";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",        href: "/recruiter/dashboard",  icon: LayoutDashboard },
  { label: "Create Job",       href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB",      href: "/recruiter/questions",  icon: Database },
  { label: "Reports",          href: "/recruiter/rankings",   icon: BarChart2 },
  { label: "Messages",         href: "/recruiter/messages",   icon: MessageCircle },
  { label: "Profile Settings", href: "/recruiter/profile",    icon: User },
  { label: "Logout",           href: "/login",                icon: LogOut },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Job {
  _id: string;
  title: string;
  description: string;
  experience: string;
  vacancies: number | null;
  required_skills: string[];
  key_responsibilities: string[];
  organization_name: string;
  status: string;
  is_active: boolean;
  end_date?: string;
  start_date?: string;
  created_at: string;
  aptitude_priority?: number | null;
  coding_priority?: number | null;
  aptitude_threshold?: number | null;
  coding_threshold?: number | null;
}

interface ScoreEntry {
  score: number;
  max_score: number;
  notes?: string;
}

interface Application {
  _id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  application_status: string;
  scores?: {
    aptitude?: ScoreEntry;
    coding?: ScoreEntry;
    interview?: ScoreEntry;
  };
}

interface RoundCol {
  key: "aptitude" | "coding" | "interview";
  label: string;
  threshold: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getRounds = (job: Job): RoundCol[] => {
  const rounds: { key: "aptitude" | "coding" | "interview"; label: string; priority: number; threshold: number | null }[] = [];

  if (job.aptitude_priority != null) {
    rounds.push({ key: "aptitude", label: "Aptitude", priority: job.aptitude_priority, threshold: job.aptitude_threshold ?? null });
  }
  if (job.coding_priority != null) {
    rounds.push({ key: "coding", label: "Technical", priority: job.coding_priority, threshold: job.coding_threshold ?? null });
  }
  // Interview is always present — highest priority number (last)
  rounds.push({ key: "interview", label: "Interview", priority: 99, threshold: null });

  rounds.sort((a, b) => a.priority - b.priority);
  return rounds.map(({ key, label, threshold }) => ({ key, label, threshold }));
};

const totalScore = (app: Application, rounds: RoundCol[]): number =>
  rounds.reduce((sum, r) => sum + (app.scores?.[r.key]?.score ?? 0), 0);

const scoreCell = (app: Application, round: RoundCol) => {
  const entry = app.scores?.[round.key];
  if (!entry) return { display: "Not appeared yet", color: "text-muted-foreground", bg: "" };

  const pct = round.key === "interview"
    ? entry.score  // interview score is already 0-100
    : entry.max_score > 0 ? Math.round((entry.score / entry.max_score) * 100) : 0;

  const passed = round.threshold == null || pct >= round.threshold;
  return {
    display: round.key === "interview"
      ? `${entry.score}/100`
      : `${entry.score}/${entry.max_score}`,
    color: passed ? "text-green-400" : "text-red-400",
    bg: passed ? "bg-green-500/10" : "bg-red-500/10",
  };
};

// ── PDF Print ─────────────────────────────────────────────────────────────────

const printReport = (job: Job, rounds: RoundCol[], rows: Application[]) => {
  const formatScore = (app: Application, round: RoundCol) => {
    const entry = app.scores?.[round.key];
    if (!entry) return "Not appeared yet";
    return round.key === "interview" ? `${entry.score}/100` : `${entry.score}/${entry.max_score}`;
  };

  const roundHeaders = rounds.map(r => `<th style="padding:8px 12px;border:1px solid #ddd;background:#f0f0f0">${r.label}${r.threshold != null ? ` (cutoff ${r.threshold}%)` : ""}</th>`).join("");
  const roundDataCols = (app: Application) => rounds.map(r => {
    const entry = app.scores?.[r.key];
    if (!entry) return `<td style="padding:8px 12px;border:1px solid #ddd;color:#888">Not appeared yet</td>`;
    const pct = r.key === "interview" ? entry.score : entry.max_score > 0 ? Math.round((entry.score / entry.max_score) * 100) : 0;
    const passed = r.threshold == null || pct >= r.threshold;
    return `<td style="padding:8px 12px;border:1px solid #ddd;color:${passed ? "#15803d" : "#dc2626"};background:${passed ? "#f0fdf4" : "#fef2f2"}">${r.key === "interview" ? `${entry.score}/100` : `${entry.score}/${entry.max_score}`}</td>`;
  }).join("");

  const tableRows = rows.map((app, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"}">
      <td style="padding:8px 12px;border:1px solid #ddd">${i + 1}</td>
      <td style="padding:8px 12px;border:1px solid #ddd"><strong>${app.candidate_name}</strong><br/><span style="font-size:12px;color:#666">${app.candidate_email}</span></td>
      ${roundDataCols(app)}
      <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold">${totalScore(app, rounds)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Candidate Report – ${job.title}</title>
  <style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{font-size:22px;margin-bottom:4px}h2{font-size:16px;color:#444;margin:0 0 16px}table{border-collapse:collapse;width:100%}th{text-align:left}@media print{body{margin:16px}}</style>
  </head><body>
  <h1>${job.title}</h1>
  <h2>${job.organization_name}</h2>
  <table style="margin-bottom:24px;font-size:13px">
    <tr><td style="padding:3px 12px 3px 0;color:#555;width:140px">Experience</td><td>${job.experience}</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#555">Vacancies</td><td>${job.vacancies ?? "—"}</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#555">Status</td><td>${job.status}</td></tr>
    ${job.start_date ? `<tr><td style="padding:3px 12px 3px 0;color:#555">Start Date</td><td>${new Date(job.start_date).toLocaleDateString()}</td></tr>` : ""}
    ${job.end_date ? `<tr><td style="padding:3px 12px 3px 0;color:#555">End Date</td><td>${new Date(job.end_date).toLocaleDateString()}</td></tr>` : ""}
    <tr><td style="padding:3px 12px 3px 0;color:#555">Skills</td><td>${job.required_skills.join(", ")}</td></tr>
    ${job.description ? `<tr><td style="padding:3px 12px 3px 0;color:#555;vertical-align:top">Description</td><td>${job.description}</td></tr>` : ""}
  </table>
  <h2 style="font-size:15px;margin-bottom:8px">Candidate Report (sorted by total score)</h2>
  <table>
    <thead><tr>
      <th style="padding:8px 12px;border:1px solid #ddd;background:#f0f0f0">#</th>
      <th style="padding:8px 12px;border:1px solid #ddd;background:#f0f0f0">Candidate</th>
      ${roundHeaders}
      <th style="padding:8px 12px;border:1px solid #ddd;background:#f0f0f0">Total</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <p style="font-size:11px;color:#888;margin-top:24px">Generated on ${new Date().toLocaleString()}</p>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
};

// ── Component ─────────────────────────────────────────────────────────────────

const Reports = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const email = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").email || ""; } catch { return ""; }
  })();

  useEffect(() => {
    if (!email) return;
    fetch(`${API}/jobs/recruiter/${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(d => {
        const published = (d.jobs || []).filter((j: Job) => j.status === "published");
        setJobs(published);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [email]);

  const openJob = async (job: Job) => {
    setSelectedJob(job);
    setApplications([]);
    setAppsLoading(true);
    try {
      const res = await fetch(`${API}/applications/recruiter/${encodeURIComponent(email)}?job_id=${job._id}`);
      const d = await res.json();
      setApplications(d.applications || []);
    } catch (e) {
      console.error(e);
    } finally {
      setAppsLoading(false);
    }
  };

  const closeModal = () => { setSelectedJob(null); setApplications([]); };

  const rounds = selectedJob ? getRounds(selectedJob) : [];

  const sortedApps = [...applications].sort((a, b) => {
    const ta = totalScore(a, rounds);
    const tb = totalScore(b, rounds);
    return sortDir === "desc" ? tb - ta : ta - tb;
  });

  return (
    <DashboardLayout navItems={navItems} title="CANDIDATE REPORTS">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <BarChart2 className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No published jobs found. Publish a job to see candidate reports.</p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid gap-4">
            {jobs.map(job => {
              const expired = job.end_date ? new Date() > new Date(job.end_date) : false;
              return (
                <GlassCard
                  key={job._id}
                  variant="neon"
                  hover
                  className="cursor-pointer"
                  onClick={() => openJob(job)}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-primary opacity-60 shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.organization_name} • {job.experience}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {job.vacancies != null && (
                        <span className="px-2 py-0.5 rounded-full text-xs border border-border/40 text-muted-foreground">
                          {job.vacancies} vacancies
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${
                        expired
                          ? "bg-red-500/20 text-red-400 border-red-500/40"
                          : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                      }`}>
                        {expired ? "Expired" : "Ongoing"}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary/20 text-secondary border border-secondary/40">
                        <Users className="w-3 h-3" /> View Report
                      </span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-5xl my-6">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border/30">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{selectedJob.title}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{selectedJob.organization_name} • {selectedJob.experience}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => printReport(selectedJob, rounds, sortedApps)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all text-sm"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button onClick={closeModal} className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Job details strip */}
            <div className="px-6 py-3 border-b border-border/20 flex flex-wrap gap-4 text-xs text-muted-foreground bg-muted/5">
              {selectedJob.vacancies != null && <span>Vacancies: <strong className="text-foreground">{selectedJob.vacancies}</strong></span>}
              {selectedJob.start_date && <span>Start: <strong className="text-foreground">{new Date(selectedJob.start_date).toLocaleDateString()}</strong></span>}
              {selectedJob.end_date && <span>End: <strong className="text-foreground">{new Date(selectedJob.end_date).toLocaleDateString()}</strong></span>}
              <span>Skills: <strong className="text-foreground">{selectedJob.required_skills.join(", ")}</strong></span>
              {rounds.map(r => r.threshold != null && (
                <span key={r.key}>{r.label} cutoff: <strong className="text-foreground">{r.threshold}%</strong></span>
              ))}
            </div>

            {/* Table */}
            <div className="p-6">
              {appsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : sortedApps.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground text-sm">No candidates have applied for this job yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground uppercase tracking-wider">#</th>
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground uppercase tracking-wider">Candidate</th>
                        {rounds.map(r => (
                          <th key={r.key} className="text-left py-3 px-3 text-xs text-muted-foreground uppercase tracking-wider">
                            {r.label}
                            {r.threshold != null && (
                              <span className="block text-[10px] normal-case font-normal text-muted-foreground/60">cutoff {r.threshold}%</span>
                            )}
                          </th>
                        ))}
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground uppercase tracking-wider">
                          <button
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                          >
                            Total {sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedApps.map((app, i) => {
                        const tot = totalScore(app, rounds);
                        return (
                          <tr key={app._id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-3 text-muted-foreground">{i + 1}</td>
                            <td className="py-3 px-3">
                              <p className="text-foreground font-medium">{app.candidate_name}</p>
                              <p className="text-xs text-muted-foreground">{app.candidate_email}</p>
                            </td>
                            {rounds.map(r => {
                              const cell = scoreCell(app, r);
                              return (
                                <td key={r.key} className={`py-3 px-3 rounded`}>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${cell.color} ${cell.bg}`}>
                                    {cell.display}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="py-3 px-3 font-display font-semibold text-foreground">{tot}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Reports;
