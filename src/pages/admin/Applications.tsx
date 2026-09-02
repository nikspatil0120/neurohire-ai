import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, Shield, Users, Building2, Brain, Code, BookOpen, Briefcase,
  Search, Filter, ChevronDown, Clock, Calendar, RefreshCw, Eye, X,
  CheckCircle, XCircle, AlertCircle, Mail,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",          href: "/admin/dashboard",          icon: LayoutDashboard },
  { label: "System Monitor",     href: "/admin/monitoring",         icon: Shield },
  { label: "Recruiters",         href: "/admin/recruiters",         icon: Building2 },
  { label: "Candidates",         href: "/admin/candidates",         icon: Users },
  { label: "Incoming Jobs",      href: "/admin/incoming-jobs",      icon: Briefcase },
  { label: "Applications",       href: "/admin/applications",       icon: Users },
  { label: "DSA Problems",       href: "/admin/dsa-problems",       icon: Code },
  { label: "Aptitude Questions", href: "/admin/aptitude-questions", icon: BookOpen },
  { label: "AI Performance",     href: "/admin/ai-performance",     icon: Brain },
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
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  applied:           { label: "Applied",           color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  test_pending:      { label: "Test Pending",      color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40" },
  test_started:      { label: "Test Started",      color: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  test_completed:    { label: "Test Completed",    color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
  interview_pending: { label: "Interview Pending", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40" },
  selected:          { label: "Selected",          color: "bg-green-500/20 text-green-400 border-green-500/40" },
  rejected:          { label: "Rejected",          color: "bg-red-500/20 text-red-400 border-red-500/40" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-muted/20 text-muted-foreground border-border/30" };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>{cfg.label}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
const AdminApplications = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [filtered,     setFiltered]     = useState<Application[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [selectedApp,  setSelectedApp]  = useState<Application | null>(null);
  const [showDetail,   setShowDetail]   = useState(false);

  // Filters
  const [searchQuery,     setSearchQuery]     = useState("");
  const [filterJobId,     setFilterJobId]     = useState(searchParams.get("job_id") || "all");
  const [filterRecruiter, setFilterRecruiter] = useState("all");
  const [filterStatus,    setFilterStatus]    = useState("all");

  // Unique options for filter dropdowns
  const [jobOptions,       setJobOptions]       = useState<{ id: string; title: string }[]>([]);
  const [recruiterOptions, setRecruiterOptions] = useState<string[]>([]);

  useEffect(() => { loadApplications(); }, []);

  // Re-apply job_id filter if URL param changes
  useEffect(() => {
    const jid = searchParams.get("job_id");
    if (jid) setFilterJobId(jid);
  }, [searchParams]);

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/applications/admin/all?limit=500`);
      if (!res.ok) throw new Error("Failed to load applications");
      const data = await res.json();
      const apps: Application[] = data.applications || [];
      setApplications(apps);

      // Build filter options
      const jobMap = new Map<string, string>();
      const recSet = new Set<string>();
      for (const a of apps) {
        if (!jobMap.has(a.job_id)) jobMap.set(a.job_id, a.job_title);
        if (a.recruiter_email) recSet.add(a.recruiter_email);
      }
      setJobOptions(Array.from(jobMap.entries()).map(([id, title]) => ({ id, title })));
      setRecruiterOptions(Array.from(recSet));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let r = [...applications];
    const q = searchQuery.toLowerCase().trim();
    if (q) r = r.filter(a =>
      a.candidate_name.toLowerCase().includes(q) ||
      a.candidate_email.toLowerCase().includes(q) ||
      a.job_title.toLowerCase().includes(q) ||
      a.organization_name.toLowerCase().includes(q)
    );
    if (filterJobId     !== "all") r = r.filter(a => a.job_id         === filterJobId);
    if (filterRecruiter !== "all") r = r.filter(a => a.recruiter_email === filterRecruiter);
    if (filterStatus    !== "all") r = r.filter(a => a.application_status === filterStatus);
    setFiltered(r);
  }, [searchQuery, filterJobId, filterRecruiter, filterStatus, applications]);

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const stats = {
    total:    applications.length,
    applied:  applications.filter(a => a.application_status === "applied").length,
    selected: applications.filter(a => a.application_status === "selected").length,
    rejected: applications.filter(a => a.application_status === "rejected").length,
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="ALL APPLICATIONS">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="ALL APPLICATIONS">
      <div className="space-y-6">

        {/* Stats */}
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

        {/* Filters */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search candidate, email, job, company..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm" />
            </div>

            {/* Job filter */}
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select value={filterJobId} onChange={e => setFilterJobId(e.target.value)}
                className="pl-9 pr-8 py-2.5 rounded-lg bg-muted/30 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50 appearance-none cursor-pointer min-w-[180px]">
                <option value="all">All Jobs</option>
                {jobOptions.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* Recruiter filter */}
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select value={filterRecruiter} onChange={e => setFilterRecruiter(e.target.value)}
                className="pl-9 pr-8 py-2.5 rounded-lg bg-muted/30 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50 appearance-none cursor-pointer min-w-[200px]">
                <option value="all">All Recruiters</option>
                {recruiterOptions.map(r => <option key={r} value={r}>{r}</option>)}
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

            <button onClick={loadApplications}
              className="px-4 py-2.5 rounded-lg bg-muted/30 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4" />Refresh
            </button>
          </div>
        </GlassCard>

        {/* Table */}
        {filtered.length === 0 ? (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-40" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {applications.length === 0 ? "No Applications Yet" : "No Matching Results"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {applications.length === 0 ? "Applications from candidates will appear here." : "Try adjusting your filters."}
              </p>
            </div>
          </GlassCard>
        ) : (
          <GlassCard variant="neon" hover={false}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    {["Candidate","Job","Recruiter","Selected Slot","Applied","Status",""].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
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
                            <span className="text-xs font-bold text-primary">{(app.candidate_name||"?")[0].toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{app.candidate_name||"Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{app.candidate_email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Job */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{app.job_title}</p>
                        <p className="text-xs text-muted-foreground">{app.organization_name}</p>
                      </td>

                      {/* Recruiter */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">{app.recruiter_email}</p>
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

                      {/* Date */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground">{new Date(app.applied_at).toLocaleDateString()}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3"><StatusBadge status={app.application_status} /></td>

                      {/* Detail */}
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
            <p className="text-xs text-muted-foreground mt-4 px-4">
              Showing {filtered.length} of {applications.length} application{applications.length !== 1 ? "s" : ""}
            </p>
          </GlassCard>
        )}
      </div>

      {/* ═══ Detail Modal ═══ */}
      {showDetail && selectedApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-background rounded-2xl max-w-lg w-full border border-border/30" onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground">Application Details</h3>
              <button onClick={() => setShowDetail(false)} className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Candidate */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/40">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-primary">{(selectedApp.candidate_name||"?")[0].toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedApp.candidate_name||"Unknown"}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Mail className="w-3.5 h-3.5"/>{selectedApp.candidate_email}</p>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Job</p>
                  <p className="text-sm font-medium text-foreground">{selectedApp.job_title}</p>
                  <p className="text-xs text-muted-foreground">{selectedApp.organization_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Recruiter</p>
                  <p className="text-xs text-foreground break-all">{selectedApp.recruiter_email}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Selected Slot</p>
                  {selectedApp.slot_label && <p className="text-xs text-primary font-medium">{selectedApp.slot_label}</p>}
                  <p className="text-sm font-medium text-foreground">{selectedApp.slot_date}</p>
                  <p className="text-sm text-muted-foreground">{selectedApp.slot_start_time}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Applied On</p>
                  <p className="text-sm font-medium text-foreground">{new Date(selectedApp.applied_at).toLocaleDateString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Current Round</p>
                  <p className="text-sm font-medium text-foreground capitalize">{selectedApp.current_round||"—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Test Status</p>
                  <p className="text-sm font-medium text-foreground capitalize">{selectedApp.test_status||"—"}</p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/40">
                <span className="text-sm text-muted-foreground">Application Status</span>
                <StatusBadge status={selectedApp.application_status} />
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminApplications;
