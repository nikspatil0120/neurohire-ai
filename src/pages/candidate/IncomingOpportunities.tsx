import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, Target, Building2, FileText, User, LogOut, Briefcase,
  DollarSign, Clock, Calendar, Check, X, Building, Users,
  AlignLeft, BookOpen, Code, ChevronRight, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",             href: "/candidate/dashboard",             icon: LayoutDashboard },
  { label: "Practice",              href: "/candidate/practice",              icon: Target },
  { label: "Company Interviews",    href: "/candidate/interviews",            icon: Building2 },
  { label: "Incoming Opportunities",href: "/candidate/incoming-opportunities",icon: Briefcase },
  { label: "Reports",               href: "/candidate/reports",               icon: FileText },
  { label: "Profile",               href: "/candidate/profile",               icon: User },
  { label: "Logout",                href: "/login",                           icon: LogOut },
];

interface JobOpportunity {
  _id: string;
  id?: string;
  title: string;
  description: string;
  organization_name: string;
  company: string;
  location: string;
  salary: string;
  experience: string;
  vacancies?: number | null;
  required_skills: string[];
  key_responsibilities: string[];
  start_date?: string;
  end_date?: string;
  status: string;
  created_at: string;
  company_logo: string;
  recruiter_email: string;
  aptitude_priority?: number;
  aptitude_duration?: number;
  aptitude_threshold?: number;
  coding_priority?: number;
  aptitude_questions?: any[];
  coding_problems?: any[];
}

interface ApplicationRecord {
  _id: string;
  job_id: string;
  application_status: string;
  applied_at: string;
}

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    applied:           "bg-blue-500/20 text-blue-400 border-blue-500/40",
    test_pending:      "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    test_started:      "bg-orange-500/20 text-orange-400 border-orange-500/40",
    test_completed:    "bg-purple-500/20 text-purple-400 border-purple-500/40",
    interview_pending: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
    selected:          "bg-green-500/20 text-green-400 border-green-500/40",
    rejected:          "bg-red-500/20 text-red-400 border-red-500/40",
  };
  const label: Record<string, string> = {
    applied: "Applied", test_pending: "Test Pending", test_started: "Test Started",
    test_completed: "Test Completed", interview_pending: "Interview Pending",
    selected: "Selected 🎉", rejected: "Rejected",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[status] || "bg-muted/20 text-muted-foreground border-border/30"}`}>
      {label[status] || status}
    </span>
  );
};

// ── Validity helpers ──────────────────────────────────────────────────────────
const isJobExpired = (job: JobOpportunity) =>
  !!job.end_date && new Date() > new Date(job.end_date);

const jobValidity = (job: JobOpportunity): string => {
  if (!job.end_date) return "";
  const diff = Math.ceil((new Date(job.end_date).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "Expired";
  if (diff === 0) return "Closes today";
  return `${diff} day${diff !== 1 ? "s" : ""} left`;
};

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";

// ─────────────────────────────────────────────────────────────────────────────
const IncomingOpportunities = () => {
  const { toast } = useToast();

  const [opportunities, setOpportunities] = useState<JobOpportunity[]>([]);
  const [applications,  setApplications]  = useState<Record<string, ApplicationRecord>>({});
  const [isLoading,     setIsLoading]     = useState(true);
  const [selectedJob,   setSelectedJob]   = useState<JobOpportunity | null>(null);
  const [showJobModal,  setShowJobModal]  = useState(false);
  const [applying,      setApplying]      = useState(false);
  const [withdrawing,   setWithdrawing]   = useState(false);

  const getUser = () => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  };

  // ── Load data ─────────────────────────────────────────────────────────────────
  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = getUser();
      const [jobsRes, appsRes] = await Promise.all([
        fetch(`${API}/jobs/?active_only=true`),
        user.id ? fetch(`${API}/applications/candidate/${user.id}`) : Promise.resolve(null),
      ]);

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        const raw: JobOpportunity[] = Array.isArray(data) ? data : [];

        const enriched = await Promise.all(raw.map(async (job) => {
          if (job.recruiter_email) {
            try {
              const r = await fetch(`${API}/users/recruiter-info/${job.recruiter_email}`);
              if (r.ok) {
                const info = await r.json();
                return { ...job, company_logo: info.logo || "", organization_name: job.organization_name || info.organization_name || "" };
              }
            } catch { /* ignore */ }
          }
          return { ...job, company_logo: "" };
        }));

        setOpportunities(enriched);
      }

      if (appsRes && appsRes.ok) {
        const appsData = await appsRes.json();
        const map: Record<string, ApplicationRecord> = {};
        for (const a of (appsData.applications || [])) map[a.job_id] = a;
        setApplications(map);
      }
    } catch (err) {
      console.error("loadData error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Apply directly (no slot) ──────────────────────────────────────────────────
  const applyForJob = async (job: JobOpportunity) => {
    const user = getUser();
    if (!user.id) return toast({ title: "Error", description: "Please log in to apply", variant: "destructive" });

    const jobId = job._id || job.id;
    if (applications[jobId!]) {
      toast({ title: "Already Applied", description: "You have already applied for this job", variant: "destructive" });
      return;
    }

    setApplying(true);
    try {
      const res = await fetch(`${API}/applications/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          candidate_id: user.id,
          candidate_email: user.email,
          candidate_name: user.name || user.full_name || "",
          slot_id: "",   // no slot selection
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to apply");

      setApplications(prev => ({ ...prev, [jobId!]: data.application }));
      toast({ title: "Applied!", description: `Successfully applied to ${job.title}`, duration: 4000 });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to apply", variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  // ── Withdraw ──────────────────────────────────────────────────────────────────
  const withdrawApplication = async (appId: string, jobId: string) => {
    if (!window.confirm("Are you sure you want to withdraw your application? This cannot be undone.")) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`${API}/applications/${appId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to withdraw");

      setApplications(prev => { const n = { ...prev }; delete n[jobId]; return n; });
      setShowJobModal(false);
      toast({ title: "Withdrawn", description: "Your application has been withdrawn", duration: 4000 });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="INCOMING OPPORTUNITIES">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="INCOMING OPPORTUNITIES">
      <div className="space-y-6">
        {opportunities.length === 0 ? (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Opportunities Yet</h3>
              <p className="text-muted-foreground">Published jobs will appear here</p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {opportunities.map((job) => {
              const jobId   = job._id || job.id || "";
              const app     = applications[jobId];
              const expired = isJobExpired(job);
              return (
                <div key={jobId} onClick={() => { setSelectedJob(job); setShowJobModal(true); }}
                  className={`aspect-square rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 border ${
                    expired ? "opacity-60 border-border/20 bg-muted/10" : "bg-gradient-to-br from-primary/10 to-secondary/10 border-border/30 hover:border-primary/50"
                  }`}>

                  {/* 65% — logo */}
                  <div className={`h-[65%] flex flex-col items-center justify-center p-4 relative ${job.company_logo ? "bg-white/10" : "bg-gradient-to-br from-primary/20 to-secondary/20"}`}>
                    {job.company_logo
                      ? <img src={job.company_logo} alt={job.organization_name} className="w-20 h-20 rounded-full object-cover shadow-lg"
                          onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                      : null}
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg ${job.company_logo ? "hidden" : ""}`}>
                      <Building className="w-10 h-10 text-white" />
                    </div>
                    {app && (
                      <div className="absolute top-2 right-2"><StatusBadge status={app.application_status} /></div>
                    )}
                    {expired && !app && (
                      <div className="absolute top-2 right-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted/40 text-muted-foreground border border-border/40">Expired</span>
                      </div>
                    )}
                  </div>

                  {/* 12% — org name */}
                  <div className="h-[12%] flex items-center justify-center px-2 bg-background/80 border-t border-border/20">
                    <p className="text-xs font-semibold text-foreground text-center line-clamp-1">{job.organization_name || job.company}</p>
                  </div>

                  {/* 23% — title + validity */}
                  <div className="h-[23%] flex flex-col items-center justify-center p-2 bg-background/50 gap-0.5">
                    <p className="text-xs font-medium text-primary text-center line-clamp-1">{job.title}</p>
                    <p className={`text-[10px] text-center leading-tight ${expired ? "text-red-400" : "text-muted-foreground"}`}>
                      {job.start_date
                        ? new Date(job.start_date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })
                        : "—"}
                      {" – "}
                      {job.end_date
                        ? new Date(job.end_date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })
                        : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ JOB DETAIL MODAL ═══ */}
      {showJobModal && selectedJob && (() => {
        const jobId  = selectedJob._id || selectedJob.id || "";
        const app    = applications[jobId];
        const expired = isJobExpired(selectedJob);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowJobModal(false)}>
            <div className="bg-background rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border/30"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/30 p-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {selectedJob.company_logo
                    ? <img src={selectedJob.company_logo} alt={selectedJob.organization_name}
                        className="w-14 h-14 rounded-full object-cover shadow-lg"
                        onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                    : null}
                  <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg ${selectedJob.company_logo ? "hidden" : ""}`}>
                    <Building className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{selectedJob.organization_name || selectedJob.company}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{selectedJob.location || "Remote"}</p>
                  </div>
                </div>
                <button onClick={() => setShowJobModal(false)}
                  className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <X className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">

                {/* Title + meta */}
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-3">{selectedJob.title}</h1>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{selectedJob.experience}</div>
                    <div className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" />{selectedJob.salary || "Competitive"}</div>
                    {selectedJob.vacancies != null && (
                      <div className="flex items-center gap-1.5"><Users className="w-4 h-4" />{selectedJob.vacancies} vacanc{selectedJob.vacancies === 1 ? "y" : "ies"}</div>
                    )}
                  </div>
                </div>

                {/* Validity period */}
                {(selectedJob.start_date || selectedJob.end_date) && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-1">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />Validity
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {selectedJob.start_date && (
                        <div className="flex items-center gap-1.5 text-green-400">
                          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                          Opens: {fmtDate(selectedJob.start_date)}
                        </div>
                      )}
                      {selectedJob.end_date && (
                        <div className={`flex items-center gap-1.5 ${expired ? "text-red-400" : "text-amber-400"}`}>
                          <AlertCircle className="w-4 h-4" />
                          {expired ? "Closed" : "Closes"}: {fmtDate(selectedJob.end_date)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedJob.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <AlignLeft className="w-4 h-4 text-primary" />About the Role
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">{selectedJob.description}</p>
                  </div>
                )}

                {/* Rounds */}
                {(selectedJob.aptitude_priority != null || selectedJob.coding_priority != null) && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Interview Rounds</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.aptitude_priority != null && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-sm">
                          <BookOpen className="w-4 h-4 text-orange-400" />
                          <span className="text-foreground font-medium">Aptitude</span>
                          <span className="text-muted-foreground">· Priority {selectedJob.aptitude_priority}</span>
                          {selectedJob.aptitude_duration != null && <span className="text-muted-foreground">· {selectedJob.aptitude_duration} min</span>}
                        </div>
                      )}
                      {selectedJob.coding_priority != null && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
                          <Code className="w-4 h-4 text-blue-400" />
                          <span className="text-foreground font-medium">Coding</span>
                          <span className="text-muted-foreground">· Priority {selectedJob.coding_priority}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-sm">
                        <Building2 className="w-4 h-4 text-purple-400" />
                        <span className="text-foreground font-medium">Interview</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Skills */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.required_skills.map((s, i) => (
                      <span key={`skill-${i}`} className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded-lg text-sm">{s}</span>
                    ))}
                  </div>
                </div>

                {/* Responsibilities */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Key Responsibilities</h3>
                  <ul className="space-y-1.5">
                    {selectedJob.key_responsibilities.map((r, i) => (
                      <li key={`resp-${i}`} className="flex items-start gap-3 text-foreground">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-sm">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ── Action area ── */}
                <div className="pt-4 border-t border-border/30">
                  {app ? (
                    /* Already applied */
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-foreground">Application Submitted</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Applied: {new Date(app.applied_at).toLocaleDateString()}
                          </p>
                          {(selectedJob.start_date || selectedJob.end_date) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Validity: {selectedJob.start_date ? fmtDate(selectedJob.start_date) : "—"}
                              {" → "}
                              {selectedJob.end_date ? fmtDate(selectedJob.end_date) : "—"}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0"><StatusBadge status={app.application_status} /></div>
                      </div>

                      {/* Withdraw button (hidden if expired or final status) */}
                      {!expired && !["selected","rejected"].includes(app.application_status) && (
                        <button disabled={withdrawing}
                          onClick={() => withdrawApplication(app._id, jobId)}
                          className="w-full py-2.5 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                          {withdrawing
                            ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <X className="w-4 h-4" />}
                          Withdraw Application
                        </button>
                      )}
                    </div>
                  ) : expired ? (
                    /* Expired, not applied */
                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border border-border/40 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-muted-foreground" />
                      <span className="text-muted-foreground">Application period has closed</span>
                    </div>
                  ) : (
                    /* Apply button */
                    <button disabled={applying}
                      onClick={() => applyForJob(selectedJob)}
                      className="w-full py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-60 disabled:cursor-not-allowed">
                      {applying
                        ? <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />Applying...</>
                        : <><ChevronRight className="w-4 h-4" /> Apply Now</>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
};

export default IncomingOpportunities;
