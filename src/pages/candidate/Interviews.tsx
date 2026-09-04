import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, Target, Building2, FileText, User, LogOut, Briefcase,
  Clock, Calendar, Check, X, AlertCircle, ChevronRight, Building,
  AlignLeft, BookOpen, Code, Users, ClockIcon,
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

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  applied:           { label: "Applied",           color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  test_pending:      { label: "Test Pending",      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
  test_started:      { label: "Test Started",      color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  test_completed:    { label: "Test Completed",    color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
  interview_pending: { label: "Interview Pending", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" },
  selected:          { label: "Selected 🎉",       color: "bg-green-500/20 text-green-400 border-green-500/40" },
  rejected:          { label: "Rejected",          color: "bg-red-500/20 text-red-400 border-red-500/40" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-muted/20 text-muted-foreground border-border/30" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

interface Application {
  _id: string;
  job_id: string;
  job_title: string;
  organization_name: string;
  recruiter_email: string;
  slot_id: string;
  slot_date: string;
  slot_start_time: string;
  slot_label: string;
  application_status: string;
  current_round: string;
  test_status: string;
  applied_at: string;
  // enriched fields
  company_logo?: string;
  description?: string;
  experience?: string;
  vacancies?: number | null;
  required_skills?: string[];
  key_responsibilities?: string[];
  start_date?: string;
  end_date?: string;
  aptitude_priority?: number;
  aptitude_duration?: number;
  aptitude_threshold?: number;
  coding_priority?: number;
  aptitude_questions?: any[];
  coding_problems?: any[];
}

// ─────────────────────────────────────────────────────────────────────────────
const Interviews = () => {
  const { toast } = useToast();

  const [applications,  setApplications]  = useState<Application[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [selectedApp,   setSelectedApp]   = useState<Application | null>(null);
  const [showModal,     setShowModal]     = useState(false);
  const [withdrawing,   setWithdrawing]   = useState(false);

  const getUser = () => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  };

  // ── Load applications + enrich with job details ──────────────────────────────
  useEffect(() => { loadApplications(); }, []);

  const loadApplications = async () => {
    const user = getUser();
    if (!user.id) { setIsLoading(false); return; }

    setIsLoading(true);
    try {
      const res = await fetch(`${API}/applications/candidate/${user.id}`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const apps: Application[] = data.applications || [];

      // Enrich each application with the job's details + recruiter logo
      const enriched = await Promise.all(apps.map(async (app) => {
        try {
          const [jobRes, infoRes] = await Promise.all([
            fetch(`${API}/jobs/${app.job_id}`),
            app.recruiter_email
              ? fetch(`${API}/users/recruiter-info/${app.recruiter_email}`)
              : Promise.resolve(null),
          ]);

          const job    = jobRes.ok  ? await jobRes.json()  : {};
          const info   = infoRes && infoRes.ok ? await infoRes.json() : {};

          return {
            ...app,
            description:        job.description        || "",
            experience:         job.experience         || "",
            vacancies:          job.vacancies          ?? null,
            required_skills:    job.required_skills    || [],
            key_responsibilities: job.key_responsibilities || [],
            start_date:         job.start_date,
            end_date:           job.end_date,
            aptitude_priority:  job.aptitude_priority,
            aptitude_duration:  job.aptitude_duration,
            aptitude_threshold: job.aptitude_threshold,
            coding_priority:    job.coding_priority,
            aptitude_questions: job.aptitude_questions || [],
            coding_problems:    job.coding_problems    || [],
            company_logo:       info.logo              || "",
            organization_name:  app.organization_name  || info.organization_name || job.organization_name || "",
          };
        } catch {
          return app;
        }
      }));

      setApplications(enriched);
    } catch (err) {
      console.error("loadApplications error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Withdraw ─────────────────────────────────────────────────────────────────
  const withdrawApplication = async (appId: string) => {
    if (!window.confirm("Are you sure you want to withdraw your application? This cannot be undone.")) return;
    setWithdrawing(true);
    try {
      const res = await fetch(`${API}/applications/${appId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to withdraw");

      setApplications(prev => prev.filter(a => a._id !== appId));
      setShowModal(false);
      toast({ title: "Withdrawn", description: "Your application has been withdrawn", duration: 4000 });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const scheduledCount = applications.filter(a =>
    ["applied","test_pending","test_started","interview_pending"].includes(a.application_status)
  ).length;
  const completedCount = applications.filter(a =>
    ["test_completed","selected","rejected"].includes(a.application_status)
  ).length;
  const selectedCount  = applications.filter(a => a.application_status === "selected").length;
  const successRate    = completedCount > 0 ? Math.round((selectedCount / completedCount) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="COMPANY INTERVIEWS">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="COMPANY INTERVIEWS">
      <div className="space-y-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard variant="neon">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Scheduled / Active</p>
            <p className="text-3xl font-display mt-1 text-primary">{scheduledCount}</p>
          </GlassCard>
          <GlassCard variant="neon">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
            <p className="text-3xl font-display mt-1 text-foreground">{completedCount}</p>
          </GlassCard>
          <GlassCard variant="neon">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</p>
            <p className="text-3xl font-display mt-1 gradient-text">{successRate}%</p>
          </GlassCard>
        </div>

        {/* ── Cards grid ── */}
        {applications.length === 0 ? (
          <GlassCard variant="neon">
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Interviews Scheduled</h3>
              <p className="text-sm text-muted-foreground">
                Jobs you apply for in Incoming Opportunities will appear here.
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {applications.map((app) => (
              <div key={app._id} onClick={() => { setSelectedApp(app); setShowModal(true); }}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 bg-gradient-to-br from-primary/10 to-secondary/10 border border-border/30 hover:border-primary/50">

                {/* 65% — logo */}
                <div className={`h-[65%] flex flex-col items-center justify-center p-4 relative ${app.company_logo ? "bg-white/10" : "bg-gradient-to-br from-primary/20 to-secondary/20"}`}>
                  {app.company_logo
                    ? <img src={app.company_logo} alt={app.organization_name}
                        className="w-20 h-20 rounded-full object-cover shadow-lg"
                        onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                    : null}
                  <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg ${app.company_logo ? "hidden" : ""}`}>
                    <Building className="w-10 h-10 text-white" />
                  </div>
                  {/* Status badge top-right */}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={app.application_status} />
                  </div>
                </div>

                {/* 12% — org name */}
                <div className="h-[12%] flex items-center justify-center px-2 bg-background/80 border-t border-border/20">
                  <p className="text-xs font-semibold text-foreground text-center line-clamp-1">{app.organization_name}</p>
                </div>

                {/* 23% — job title + slot */}
                <div className="h-[23%] flex flex-col items-center justify-center p-2 bg-background/50 gap-0.5">
                  <p className="text-xs font-medium text-primary text-center line-clamp-1">{app.job_title}</p>
                  <p className="text-[10px] text-muted-foreground text-center line-clamp-1">
                    {app.slot_label ? `${app.slot_label} · ` : ""}{app.slot_date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          DETAIL MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showModal && selectedApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}>
          <div className="bg-background rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border/30"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/30 p-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                {selectedApp.company_logo
                  ? <img src={selectedApp.company_logo} alt={selectedApp.organization_name}
                      className="w-14 h-14 rounded-full object-cover shadow-lg"
                      onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                  : null}
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg ${selectedApp.company_logo ? "hidden" : ""}`}>
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedApp.organization_name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{selectedApp.job_title}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">

              {/* Application status banner */}
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                selectedApp.application_status === "selected"
                  ? "bg-green-500/10 border-green-500/30"
                  : selectedApp.application_status === "rejected"
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-primary/10 border-primary/30"
              }`}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">Application Status</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Applied on {new Date(selectedApp.applied_at).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={selectedApp.application_status} />
              </div>

              {/* Slot info */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/20 border border-border/40">
                <ClockIcon className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Your Scheduled Slot</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedApp.slot_label ? `${selectedApp.slot_label} · ` : ""}
                    {selectedApp.slot_date} at {selectedApp.slot_start_time}
                  </p>
                </div>
              </div>

              {/* Job meta */}
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {selectedApp.experience && (
                  <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{selectedApp.experience}</div>
                )}
                {selectedApp.vacancies != null && (
                  <div className="flex items-center gap-1.5"><Users className="w-4 h-4" />{selectedApp.vacancies} vacanc{selectedApp.vacancies === 1 ? "y" : "ies"}</div>
                )}
                {selectedApp.end_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Closes {new Date(selectedApp.end_date).toLocaleDateString()}
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedApp.description && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <AlignLeft className="w-4 h-4 text-primary" />About the Role
                  </h3>
                  <p className="text-sm text-foreground/80 leading-relaxed">{selectedApp.description}</p>
                </div>
              )}

              {/* Rounds */}
              {(selectedApp.aptitude_priority != null || selectedApp.coding_priority != null) && (
                <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Interview Rounds</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.aptitude_priority != null && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-sm">
                        <BookOpen className="w-4 h-4 text-orange-400" />
                        <span className="font-medium text-foreground">Aptitude</span>
                        <span className="text-muted-foreground">· P{selectedApp.aptitude_priority}</span>
                        {selectedApp.aptitude_duration != null && <span className="text-muted-foreground">· {selectedApp.aptitude_duration} min</span>}
                      </div>
                    )}
                    {selectedApp.coding_priority != null && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
                        <Code className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-foreground">Coding</span>
                        <span className="text-muted-foreground">· P{selectedApp.coding_priority}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-sm">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      <span className="font-medium text-foreground">Interview</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Required Skills */}
              {selectedApp.required_skills && selectedApp.required_skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.required_skills.map((s, i) => (
                      <span key={`skill-${i}`} className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded-lg text-sm">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Key Responsibilities */}
              {selectedApp.key_responsibilities && selectedApp.key_responsibilities.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Key Responsibilities</h3>
                  <ul className="space-y-1.5">
                    {selectedApp.key_responsibilities.map((r, i) => (
                      <li key={`resp-${i}`} className="flex items-start gap-3 text-foreground">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        <span className="text-sm">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-border/30 flex gap-3">
                {selectedApp.application_status === "test_pending" && (
                  <button className="flex-1 py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_hsl(185_100%_50%/0.3)] transition-all">
                    <ChevronRight className="w-4 h-4" /> Start Test
                  </button>
                )}
                {!["selected","rejected"].includes(selectedApp.application_status) && (
                  <button
                    disabled={withdrawing}
                    onClick={() => withdrawApplication(selectedApp._id)}
                    className="px-5 py-3 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {withdrawing
                      ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <X className="w-4 h-4" />}
                    Withdraw Application
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Interviews;
