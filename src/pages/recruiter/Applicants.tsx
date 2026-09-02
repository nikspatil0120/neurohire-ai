import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut,
  Briefcase, Users, Search, Filter, Calendar, Clock, ChevronDown,
  Mail, User, Briefcase as BriefcaseIcon, CheckCircle, XCircle,
  AlertCircle, RefreshCw, Eye, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",    href: "/recruiter/dashboard",   icon: LayoutDashboard },
  { label: "Create Job",   href: "/recruiter/create-job",  icon: FilePlus },
  { label: "Jobs Created", href: "/recruiter/jobs-created",icon: Briefcase },
  { label: "Applicants",   href: "/recruiter/applicants",  icon: Users },
  { label: "Question DB",  href: "/recruiter/questions",   icon: Database },
  { label: "Rankings",     href: "/recruiter/rankings",    icon: Trophy },
  { label: "Messages",     href: "/recruiter/messages",    icon: MessageCircle },
  { label: "Logout",       href: "/login",                 icon: LogOut },
];

interface Application {
  _id: string;
  candidate_id: string;
  candidate_email: string;
  candidate_name: string;
  job_id: string;
  job_title: string;
  recruiter_email: string;
  organization_name: string;
  slot_id: string;
  slot_date: string;
  slot_start_time: string;
  slot_label: string;
  application_status: string;
  current_round: string;
  test_status: string;
  applied_at: string;
  created_at: string;
  updated_at: string;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  applied:           { label: "Applied",           color: "bg-blue-500/20 text-blue-400 border-blue-500/40",    icon: <CheckCircle className="w-3.5 h-3.5" /> },
  test_pending:      { label: "Test Pending",      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  test_started:      { label: "Test Started",      color: "bg-orange-500/20 text-orange-400 border-orange-500/40", icon: <RefreshCw className="w-3.5 h-3.5" /> },
  test_completed:    { label: "Test Completed",    color: "bg-purple-500/20 text-purple-400 border-purple-500/40", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  interview_pending: { label: "Interview Pending", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",    icon: <AlertCircle className="w-3.5 h-3.5" /> },
  selected:          { label: "Selected",          color: "bg-green-500/20 text-green-400 border-green-500/40", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected:          { label: "Rejected",          color: "bg-red-500/20 text-red-400 border-red-500/40",       icon: <XCircle className="w-3.5 h-3.5" /> },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-muted/20 text-muted-foreground border-border/30", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const Applicants = () => {
  const { toast } = useToast();

  const [applications,  setApplications]  = useState<Application[]>([]);
  const [filtered,      setFiltered]      = useState<Application[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [selectedApp,   setSelectedApp]   = useState<Application | null>(null);
  const [showDetail,    setShowDetail]    = useState(false);
  const [updatingStatus,setUpdatingStatus]= useState(false);

  // Filters
  const [searchQuery,   setSearchQuery]   = useState("");
  const [filterJob,     setFilterJob]     = useState("all");
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [jobOptions,    setJobOptions]    = useState<{ id: string; title: string }[]>([]);

  // ── Load ─────────────────────────────────────────────────────────────────────
  useEffect(() => { loadApplications(); }, []);

  const getRecruiterEmail = () => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").email || ""; } catch { return ""; }
  };

  const loadApplications = async () => {
    const email = getRecruiterEmail();
    if (!email) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/applications/recruiter/${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("Failed to load applications");
      const data = await res.json();
      const apps: Application[] = data.applications || [];
      setApplications(apps);
      setFiltered(apps);

      // Build unique job options for filter
      const seen = new Map<string, string>();
      for (const a of apps) { if (!seen.has(a.job_id)) seen.set(a.job_id, a.job_title); }
      setJobOptions(Array.from(seen.entries()).map(([id, title]) => ({ id, title })));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let result = [...applications];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.candidate_name.toLowerCase().includes(q) ||
        a.candidate_email.toLowerCase().includes(q) ||
        a.job_title.toLowerCase().includes(q)
      );
    }
    if (filterJob !== "all")    result = result.filter(a => a.job_id === filterJob);
    if (filterStatus !== "all") result = result.filter(a => a.application_status === filterStatus);
    setFiltered(result);
  }, [searchQuery, filterJob, filterStatus, applications]);

  // ── Update status ─────────────────────────────────────────────────────────────
  const updateStatus = async (appId: string, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API}/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const data = await res.json();
      const updated = data.application;

      setApplications(prev => prev.map(a => a._id === appId ? { ...a, application_status: newStatus, ...updated } : a));
      if (selectedApp?._id === appId) setSelectedApp(prev => prev ? { ...prev, application_status: newStatus } : prev);
      toast({ title: "Updated", description: `Status changed to ${STATUS_CONFIG[newStatus]?.label || newStatus}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const stats = {
    total:    applications.length,
    applied:  applications.filter(a => a.application_status === "applied").length,
    selected: applications.filter(a => a.application_status === "selected").length,
    rejected: applications.filter(a => a.application_status === "rejected").length,
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="APPLICANTS">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="APPLICANTS">
      <div className="space-y-6">

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total",    value: stats.total,    color: "text-foreground" },
            { label: "Applied",  value: stats.applied,  color: "text-blue-400" },
            { label: "Selected", value: stats.selected, color: "text-green-400" },
            { label: "Rejected", value: stats.rejected, color: "text-red-400" },
          ].map(s => (
            <GlassCard key={s.label} variant="neon" hover={false}>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </GlassCard>
          ))}
        </div>

        {/* ── Filters ── */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search by candidate, email or job..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all text-sm" />
            </div>

            {/* Job filter */}
            <div className="relative">
              <BriefcaseIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select value={filterJob} onChange={e => setFilterJob(e.target.value)}
                className="pl-9 pr-8 py-2.5 rounded-lg bg-muted/30 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50 appearance-none cursor-pointer min-w-[160px]">
                <option value="all">All Jobs</option>
                {jobOptions.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="pl-9 pr-8 py-2.5 rounded-lg bg-muted/30 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50 appearance-none cursor-pointer min-w-[160px]">
                <option value="all">All Statuses</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            <button onClick={loadApplications} className="px-4 py-2.5 rounded-lg bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4" />Refresh
            </button>
          </div>
        </GlassCard>

        {/* ── Table ── */}
        {filtered.length === 0 ? (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-40" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {applications.length === 0 ? "No Applicants Yet" : "No Matching Results"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {applications.length === 0 ? "Candidates who apply to your jobs will appear here." : "Try adjusting your search or filters."}
              </p>
            </div>
          </GlassCard>
        ) : (
          <GlassCard variant="neon" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    {["Candidate","Job","Selected Slot","Applied","Status","Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filtered.map(app => (
                    <tr key={app._id} className="hover:bg-muted/10 transition-colors">
                      {/* Candidate */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">{(app.candidate_name || "?")[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{app.candidate_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{app.candidate_email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Job */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{app.job_title}</p>
                      </td>

                      {/* Slot */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <div>
                            {app.slot_label && <p className="text-xs font-medium text-foreground">{app.slot_label}</p>}
                            <p className="text-xs">{app.slot_date}</p>
                            <p className="text-xs">{app.slot_start_time}</p>
                          </div>
                        </div>
                      </td>

                      {/* Applied date */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">{new Date(app.applied_at).toLocaleDateString()}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3"><StatusBadge status={app.application_status} /></td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelectedApp(app); setShowDetail(true); }}
                          className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4 px-4">Showing {filtered.length} of {applications.length} application{applications.length !== 1 ? "s" : ""}</p>
          </GlassCard>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          APPLICATION DETAIL MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showDetail && selectedApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-background rounded-2xl max-w-lg w-full border border-border/30" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground">Application Details</h3>
              <button onClick={() => setShowDetail(false)} className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Candidate */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/40">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-primary">{(selectedApp.candidate_name || "?")[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedApp.candidate_name || "Unknown"}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="w-3.5 h-3.5" />{selectedApp.candidate_email}</p>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Job Applied For</p>
                  <p className="text-sm font-medium text-foreground">{selectedApp.job_title}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Applied On</p>
                  <p className="text-sm font-medium text-foreground">{new Date(selectedApp.applied_at).toLocaleDateString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Selected Slot</p>
                  {selectedApp.slot_label && <p className="text-xs text-primary font-medium">{selectedApp.slot_label}</p>}
                  <p className="text-sm font-medium text-foreground">{selectedApp.slot_date}</p>
                  <p className="text-sm text-muted-foreground">{selectedApp.slot_start_time}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Current Round</p>
                  <p className="text-sm font-medium text-foreground capitalize">{selectedApp.current_round || "—"}</p>
                </div>
              </div>

              {/* Current status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Status</span>
                <StatusBadge status={selectedApp.application_status} />
              </div>

              {/* Status update */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <button key={key} disabled={updatingStatus || selectedApp.application_status === key}
                      onClick={() => updateStatus(selectedApp._id, key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                        selectedApp.application_status === key
                          ? `${cfg.color} opacity-100`
                          : "bg-muted/20 border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}>
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Applicants;
