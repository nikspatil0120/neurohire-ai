import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard,
  FilePlus,
  Database,
  BarChart2,
  MessageCircle,
  LogOut,
  Briefcase,
  Users,
  User,
  Globe,
  FileText,
  Edit,
  Trash2,
  X,
  Check,
  FolderKanban,
  CheckCircle2,
  Calendar,
  Clock,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Building2,
  ExternalLink,
  BrainCircuit,
  Code2,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import RecruiterCalendarCard, { RecruiterApplication } from "@/components/recruiter/RecruiterCalendarCard";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",        href: "/recruiter/dashboard",     icon: LayoutDashboard },
  { label: "Create Job",       href: "/recruiter/create-job",    icon: FilePlus },
  { label: "Jobs Created",     href: "/recruiter/jobs-created",  icon: Briefcase },
  { label: "Applicants",       href: "/recruiter/applicants",    icon: Users },
  { label: "Question DB",      href: "/recruiter/questions",     icon: Database },
  { label: "Reports",          href: "/recruiter/rankings",      icon: BarChart2 },
  { label: "Messages",         href: "/recruiter/messages",      icon: MessageCircle },
  { label: "Profile Settings", href: "/recruiter/profile",       icon: User },
  { label: "Logout",           href: "/login",                   icon: LogOut },
];

interface Job {
  _id: string;
  title: string;
  experience: string;
  required_skills: string[];
  key_responsibilities: string[];
  status: string;
  is_active: boolean;
  end_date?: string;
  created_at: string;
  organization_name: string;
  applications?: number;
}

const isExpired = (job: Job) => {
  if (job.status === "expired") return true;
  if (job.end_date) {
    try {
      return new Date() > new Date(job.end_date);
    } catch {
      return false;
    }
  }
  return false;
};

const getRoleTheme = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("ai") || t.includes("ml") || t.includes("machine learning") || t.includes("data science") || t.includes("deep learning")) {
    return {
      icon: BrainCircuit,
      badge: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      accent: "from-purple-500/10 via-purple-500/5 to-transparent",
      ring: "hover:border-purple-500/40",
      pill: "bg-purple-500/10 text-purple-300 border-purple-500/30",
    };
  }
  if (t.includes("data") || t.includes("sql") || t.includes("database") || t.includes("analytics")) {
    return {
      icon: Database,
      badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      accent: "from-cyan-500/10 via-cyan-500/5 to-transparent",
      ring: "hover:border-cyan-500/40",
      pill: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    };
  }
  if (t.includes("dev") || t.includes("engineer") || t.includes("code") || t.includes("software") || t.includes("frontend") || t.includes("backend") || t.includes("fullstack") || t.includes("java") || t.includes("python") || t.includes("react")) {
    return {
      icon: Code2,
      badge: "bg-primary/15 text-primary border-primary/30",
      accent: "from-primary/10 via-primary/5 to-transparent",
      ring: "hover:border-primary/40",
      pill: "bg-primary/10 text-primary border-primary/30",
    };
  }
  return {
    icon: Briefcase,
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    accent: "from-blue-500/10 via-blue-500/5 to-transparent",
    ring: "hover:border-blue-500/40",
    pill: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  };
};

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<RecruiterApplication[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});

  const toggleExpand = (jobId: string) => {
    setExpandedJobs((prev) => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "expired">("all");

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);
  const [selectedDeleteTypes, setSelectedDeleteTypes] = useState<string[]>([]);

  const getRecruiterEmail = () => {
    if (user?.email) return user.email;
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").email || "";
    } catch {
      return "";
    }
  };

  const loadData = async () => {
    setLoading(true);
    const email = getRecruiterEmail();
    if (!email) {
      setLoading(false);
      return;
    }

    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch(`${API}/jobs/recruiter/${encodeURIComponent(email)}`),
        fetch(`${API}/applications/recruiter/${encodeURIComponent(email)}`),
      ]);

      if (jobsRes.ok) {
        const d = await jobsRes.json();
        setJobs(d.jobs || []);
      }

      if (appsRes.ok) {
        const d = await appsRes.json();
        const apps: RecruiterApplication[] = d.applications || [];
        setApplications(apps);

        // Count applications per job_id
        const counts: Record<string, number> = {};
        for (const app of apps) {
          counts[app.job_id] = (counts[app.job_id] || 0) + 1;
        }
        setAppCounts(counts);
      }
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.email]);

  // Derived Metrics
  const activeJobs = useMemo(
    () => jobs.filter((j) => j.status === "published" && j.is_active && !isExpired(j)),
    [jobs]
  );
  const activeJobsCount = activeJobs.length;

  const draftJobsCount = useMemo(
    () => jobs.filter((j) => j.status === "draft").length,
    [jobs]
  );

  const expiredJobsCount = useMemo(
    () => jobs.filter((j) => isExpired(j)).length,
    [jobs]
  );

  const totalCandidates = applications.length;

  const scheduledInterviewsCount = useMemo(
    () => applications.filter((app) => Boolean(app.slot_date)).length,
    [applications]
  );

  // Pipeline Funnel counts
  const pipelineStats = useMemo(() => {
    const applied = applications.filter((a) => a.application_status === "applied").length;
    const test = applications.filter((a) =>
      ["test_pending", "test_started", "test_completed"].includes(a.application_status)
    ).length;
    const interview = applications.filter((a) =>
      ["interview_pending"].includes(a.application_status) || Boolean(a.slot_date)
    ).length;
    const selected = applications.filter((a) => a.application_status === "selected").length;
    return { applied, test, interview, selected };
  }, [applications]);

  // Filtered Jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const expired = isExpired(job);
      const matchesSearch =
        searchQuery === "" ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.required_skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === "active") {
        return job.status === "published" && job.is_active && !expired;
      }
      if (statusFilter === "draft") {
        return job.status === "draft";
      }
      if (statusFilter === "expired") {
        return expired;
      }
      return true;
    });
  }, [jobs, searchQuery, statusFilter]);

  // ── Job actions ───────────────────────────────────────────────────────────
  const toggleStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === "draft" ? "published" : "draft";
    try {
      const res = await fetch(`${API}/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast({
        title: "Success",
        description: `Job ${newStatus === "published" ? "published" : "saved as draft"}`,
      });
      loadData();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    }
  };

  const deleteJob = async (jobId: string, deleteType: string) => {
    try {
      const res = await fetch(`${API}/jobs/${jobId}?deleteType=${deleteType}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast({ title: "Success", description: "Job deleted" });
      loadData();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!selectedDeleteTypes.length || !deleteModalOpen) return;
    const allSelected = ["admin", "candidates", "me"].every((t) => selectedDeleteTypes.includes(t));
    if (allSelected) {
      if (!confirm("Completely delete this job from the database? This cannot be undone.")) return;
      await deleteJob(deleteModalOpen, "all");
    } else {
      if (!confirm(`Delete for: ${selectedDeleteTypes.join(", ")}?`)) return;
      for (const t of selectedDeleteTypes) await deleteJob(deleteModalOpen, t);
    }
    setDeleteModalOpen(null);
    setSelectedDeleteTypes([]);
  };

  const recruiterName = user?.name || "Recruiter";
  const firstName = recruiterName.split(" ")[0];
  const orgName = jobs[0]?.organization_name || "Company Portal";

  return (
    <DashboardLayout navItems={navItems} title="RECRUITER DASHBOARD">
      <div className="space-y-6 w-full pb-10">

        {/* ── 1. Hero / Welcome Banner ── */}
        <GlassCard
          variant="neon"
          className="relative overflow-hidden p-6 border-primary/30 bg-gradient-to-r from-primary/15 via-card/80 to-card/95"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                // <span>Recruiter Command Hub • {orgName}</span>
              </div> */}
              <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-wide">
                Welcome back, {firstName} 👋
              </h2>
              {/* <p className="text-sm text-muted-foreground leading-relaxed">
                Track live hiring pipelines, manage candidate evaluations, and review scheduled AI & technical interview sessions in real time.
              </p> */}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                to="/recruiter/create-job"
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/25 flex items-center gap-2 hover:scale-[1.02]"
              >
                <FilePlus className="w-4 h-4" />
                Post New Job
              </Link>
              <Link
                to="/recruiter/applicants"
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-foreground bg-card/60 hover:bg-card border border-border/60 hover:border-border transition-all flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-primary" />
                Applicants ({totalCandidates})
              </Link>
            </div>
          </div>
        </GlassCard>

        {/* ── 2. Top Metrics Cards Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Total Jobs */}
          <GlassCard
            variant="default"
            onClick={() => navigate("/recruiter/jobs-created")}
            className="hover:border-blue-500/40 cursor-pointer p-5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Jobs Created</p>
                <p className="text-3xl font-display font-bold mt-1.5 text-foreground">
                  {loading ? "..." : jobs.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeJobsCount} Active • {draftJobsCount} Drafts
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                <FolderKanban className="w-6 h-6" />
              </div>
            </div>
          </GlassCard>

          {/* Card 2: Active Pipelines */}
          <GlassCard
            variant="default"
            onClick={() => { setStatusFilter("active"); }}
            className="hover:border-emerald-500/40 cursor-pointer p-5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Jobs</p>
                <p className="text-3xl font-display font-bold mt-1.5 text-emerald-500 dark:text-emerald-400">
                  {loading ? "..." : activeJobsCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Accepting candidates</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                <Globe className="w-6 h-6" />
              </div>
            </div>
          </GlassCard>

          {/* Card 3: Total Candidates */}
          <GlassCard
            variant="default"
            onClick={() => navigate("/recruiter/applicants")}
            className="hover:border-primary/40 cursor-pointer p-5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Candidates</p>
                <p className="text-3xl font-display font-bold mt-1.5 text-foreground">
                  {loading ? "..." : totalCandidates}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Across all pipelines</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </GlassCard>

          {/* Card 4: Scheduled Sessions 
          <GlassCard
            variant="default"
            onClick={() => navigate("/recruiter/applicants")}
            className="hover:border-amber-500/40 cursor-pointer p-5 transition-all"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Interviews Booked</p>
                <p className="text-3xl font-display font-bold mt-1.5 text-amber-500 dark:text-amber-400">
                  {loading ? "..." : scheduledInterviewsCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Scheduled candidate slots</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <Calendar className="w-6 h-6" />
              </div>
            </div>
          </GlassCard> */}
        </div>

        {/* ── 3. Main 2-Column Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column (2 Cols): Job Postings & Live Pipelines ── */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard variant="default" className="p-6 border-border/50">
              
              {/* Header with Title and Search/Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                      Your Openings
                  </h2>
                  
                </div>

                <Link
                  to="/recruiter/create-job"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors self-start sm:self-auto"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  New Job
                </Link>
              </div>

              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by job title, skill, or role..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-lg bg-muted/20 border border-border/50 focus:border-primary/60 focus:outline-none text-foreground placeholder:text-muted-foreground transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-muted/20 rounded-lg border border-border/40 overflow-x-auto">
                  {(
                    [
                      { key: "all", label: `All (${jobs.length})` },
                      { key: "active", label: `Active (${activeJobsCount})` },
                      { key: "draft", label: `Draft (${draftJobsCount})` },
                      { key: "expired", label: `Expired (${expiredJobsCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusFilter(tab.key)}
                      className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-all ${
                        statusFilter === tab.key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jobs List */}
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-36 rounded-xl bg-muted/15 animate-pulse border border-border/30"
                    />
                  ))}
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border/60 bg-muted/5">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary mb-3">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-semibold text-foreground">
                    {searchQuery ? "No matching jobs found" : "No job postings yet"}
                  </h4>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                    {searchQuery
                      ? "Try adjusting your search query or reset the status filter to see all jobs."
                      : "Create your first job posting to start receiving candidates and scheduling AI interviews."}
                  </p>
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                      }}
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-muted/30 hover:bg-muted/50 text-foreground border border-border transition-colors"
                    >
                      Reset Filters
                    </button>
                  ) : (
                    <Link
                      to="/recruiter/create-job"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                      Create Job Post
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredJobs.map((job) => {
                    const expired = isExpired(job);
                    const appCount = appCounts[job._id] || 0;
                    const isExpanded = expandedJobs[job._id] || false;
                    const theme = getRoleTheme(job.title);
                    const RoleIcon = theme.icon;

                    // Pipeline breakdown for this specific job
                    const jobApps = applications.filter((a) => a.job_id === job._id);
                    const inTestCount = jobApps.filter((a) =>
                      ["test_pending", "test_started", "test_completed"].includes(a.application_status)
                    ).length;
                    const inInterviewCount = jobApps.filter((a) =>
                      a.application_status === "interview_pending" || Boolean(a.slot_date)
                    ).length;

                    // Clean responsibilities: ignore empty or "None"
                    const cleanResponsibilities = (job.key_responsibilities || []).filter(
                      (r) => r && r.trim().toLowerCase() !== "none" && r.trim() !== ""
                    );

                    return (
                      <div
                        key={job._id}
                        className={cn(
                          "rounded-2xl p-6 border border-border/60 bg-gradient-to-b from-card/90 via-card/60 to-card/40 backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 space-y-5 group relative overflow-hidden",
                          theme.ring
                        )}
                      >
                        {/* Subtle decorative top glow border */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Top Header Row */}
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex items-start gap-3.5">
                            {/* Role Avatar */}
                            <div
                              className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm transition-transform duration-300 group-hover:scale-105 shrink-0",
                                theme.badge
                              )}
                            >
                              <RoleIcon className="w-6 h-6" />
                            </div>

                            {/* Title & Metadata */}
                            <div className="space-y-1">
                              <h4 className="text-xl font-display font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
                                {job.title}
                              </h4>
                              <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                                  <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  {job.organization_name || "Company"}
                                </span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/40 text-foreground/80 font-medium border border-border/50">
                                  <GraduationCap className="w-3 h-3 text-primary" />
                                  {job.experience || "Any experience"}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(job.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status Pill & Candidate Pill */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Status Badge with Glowing Indicator Dot */}
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm",
                                job.status === "published" && !expired
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : job.status === "draft"
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  job.status === "published" && !expired
                                    ? "bg-emerald-400 animate-pulse"
                                    : job.status === "draft"
                                    ? "bg-amber-400"
                                    : "bg-rose-400"
                                )}
                              />
                              {job.status === "published" && !expired
                                ? "Published"
                                : job.status === "draft"
                                ? "Draft"
                                : "Expired"}
                            </span>

                            {/* Ongoing / Expired lifecycle badge */}
                            {job.status === "published" && (
                              <span
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-xs font-medium border",
                                  expired
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                    : "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                                )}
                              >
                                {expired ? "Expired" : "Ongoing"}
                              </span>
                            )}

                            {/* Interactive Candidate Pill */}
                            <button
                              type="button"
                              onClick={() => navigate(`/recruiter/applicants?jobId=${job._id}`)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:scale-[1.02] transition-all shadow-sm"
                              title="Click to view applicants in this pipeline"
                            >
                              <Users className="w-3.5 h-3.5 text-primary" />
                              <span>
                                {appCount} {appCount === 1 ? "Candidate" : "Candidates"}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Mini Pipeline Activity Strip */}
                        {appCount > 0 ? (
                          <div className="p-3 rounded-xl bg-muted/20 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-semibold text-foreground/90 flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                                Pipeline Activity:
                              </span>
                              <span className="text-muted-foreground">
                                <strong className="text-foreground">{appCount}</strong> Total
                              </span>
                              <span>•</span>
                              <span className="text-amber-400/90 font-medium">
                                <strong>{inTestCount}</strong> In Test
                              </span>
                              <span>•</span>
                              <span className="text-cyan-400/90 font-medium">
                                <strong>{inInterviewCount}</strong> Interviewing
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigate(`/recruiter/applicants?jobId=${job._id}`)}
                              className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 self-start sm:self-auto"
                            >
                              Review Pipeline
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="px-3.5 py-2 rounded-xl bg-muted/10 border border-border/30 text-[11px] text-muted-foreground flex items-center justify-between">
                            <span>Hiring pipeline open — awaiting candidate submissions.</span>
                            <span className="text-[10px] text-primary font-medium">Ready for applicants</span>
                          </div>
                        )}

                        {/* Required Competencies */}
                        {job.required_skills && job.required_skills.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-primary" />
                                Required Competencies
                              </span>
                              <span className="text-[10px] lowercase font-normal">{job.required_skills.length} skills</span>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                              {job.required_skills.slice(0, 5).map((skill, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-primary/5 hover:bg-primary/10 text-foreground/90 border border-primary/20 transition-colors max-w-[240px] truncate"
                                  title={skill}
                                >
                                  {skill}
                                </span>
                              ))}
                              {job.required_skills.length > 5 && (
                                <span className="px-2.5 py-1 rounded-lg text-xs font-medium text-muted-foreground bg-muted/30 border border-border/50">
                                  +{job.required_skills.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Key Responsibilities */}
                        {cleanResponsibilities.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-border/30">
                            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <span>Key Responsibilities</span>
                              {cleanResponsibilities.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(job._id)}
                                  className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1 capitalize"
                                >
                                  {isExpanded ? (
                                    <>
                                      Show less <ChevronUp className="w-3 h-3" />
                                    </>
                                  ) : (
                                    <>
                                      +{cleanResponsibilities.length - 2} more <ChevronDown className="w-3 h-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            <ul className="text-xs text-foreground/85 space-y-1.5">
                              {(isExpanded ? cleanResponsibilities : cleanResponsibilities.slice(0, 2)).map(
                                (r, i) => (
                                  <li key={i} className="flex items-start gap-2.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/70 mt-1.5 shrink-0" />
                                    <span className="leading-relaxed">{r}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Footer Bar: Timeline & Actions */}
                        <div className="pt-3 border-t border-border/40 flex items-center justify-between flex-wrap gap-3">
                          {/* Timeline details */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            {job.end_date ? (
                              expired ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-medium">
                                  <AlertCircle className="w-3 h-3" />
                                  Closed on {new Date(job.end_date).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                                  <Clock className="w-3.5 h-3.5 text-primary" />
                                  Closes {new Date(job.end_date).toLocaleDateString()}
                                </span>
                              )
                            ) : (
                              <span className="text-muted-foreground text-xs">Open indefinite</span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            {/* Primary View Pipeline Action */}
                            <button
                              type="button"
                              onClick={() => navigate(`/recruiter/applicants?jobId=${job._id}`)}
                              className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25 transition-all flex items-center gap-1.5 hover:scale-[1.02]"
                            >
                              <Users className="w-3.5 h-3.5" />
                              View Pipeline
                            </button>

                            {/* Publish / Draft Toggle */}
                            <button
                              type="button"
                              onClick={() => job.status !== "expired" && toggleStatus(job._id, job.status)}
                              disabled={job.status === "expired"}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border",
                                job.status === "expired"
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20 opacity-60 cursor-not-allowed"
                                  : job.status === "draft"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                              )}
                              title={
                                job.status === "draft"
                                  ? "Make role public for candidates"
                                  : job.status === "published"
                                  ? "Revert to draft"
                                  : "Job has expired"
                              }
                            >
                              {job.status === "expired" ? (
                                <>
                                  <FileText className="w-3.5 h-3.5" /> Expired
                                </>
                              ) : job.status === "draft" ? (
                                <>
                                  <Globe className="w-3.5 h-3.5" /> Publish
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3.5 h-3.5" /> Draft
                                </>
                              )}
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => navigate(`/recruiter/edit-job/${job._id}`)}
                              className="p-2 rounded-xl bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground border border-border/50 transition-all hover:scale-105"
                              title="Edit Role Details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteModalOpen(job._id);
                                setSelectedDeleteTypes([]);
                              }}
                              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all hover:scale-105"
                              title="Delete Job"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                </div>
              )}
            </GlassCard>
          </div>

          {/* ── Right Column (1 Col): Calendar & Recruiter Intelligence ── */}
          <div className="space-y-6">

            {/* 1. Recruiter Calendar Schedule */}
            <RecruiterCalendarCard applications={applications} jobs={jobs} />

            {/* 2. Candidate Pipeline Funnel */}
            <GlassCard variant="default" className="p-5 space-y-4 border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Pipeline Breakdown</h3>
                    <p className="text-[11px] text-muted-foreground">Candidate status distribution</p>
                  </div>
                </div>
                <Link
                  to="/recruiter/applicants"
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3 pt-1">
                {[
                  {
                    label: "Screening / Applied",
                    count: pipelineStats.applied,
                    color: "bg-blue-500",
                    percent: totalCandidates > 0 ? (pipelineStats.applied / totalCandidates) * 100 : 0,
                  },
                  {
                    label: "Aptitude & Technical Tests",
                    count: pipelineStats.test,
                    color: "bg-amber-500",
                    percent: totalCandidates > 0 ? (pipelineStats.test / totalCandidates) * 100 : 0,
                  },
                  {
                    label: "Interview Scheduled / Pending",
                    count: pipelineStats.interview,
                    color: "bg-cyan-500",
                    percent: totalCandidates > 0 ? (pipelineStats.interview / totalCandidates) * 100 : 0,
                  },
                  {
                    label: "Selected / Hired",
                    count: pipelineStats.selected,
                    color: "bg-emerald-500",
                    percent: totalCandidates > 0 ? (pipelineStats.selected / totalCandidates) * 100 : 0,
                  },
                ].map((stage) => (
                  <div key={stage.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground/80 font-medium">{stage.label}</span>
                      <span className="font-semibold text-foreground">{stage.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${stage.color} transition-all duration-500`}
                        style={{ width: `${Math.min(100, Math.max(0, stage.percent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* 3. Quick Recruiter Actions */}
            <GlassCard variant="default" className="p-5 space-y-3 border-border/50">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Recruiter Quick Tools
              </h3>

              <div className="space-y-2">
                <Link
                  to="/recruiter/create-job"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/10 hover:bg-primary/5 hover:border-primary/30 transition-all text-xs font-medium text-foreground group"
                >
                  <span className="flex items-center gap-2.5">
                    <FilePlus className="w-4 h-4 text-primary" />
                    Create New Job Posting
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>

                <Link
                  to="/recruiter/questions"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/10 hover:bg-primary/5 hover:border-primary/30 transition-all text-xs font-medium text-foreground group"
                >
                  <span className="flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-secondary" />
                    Browse Question Bank
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-secondary transition-colors" />
                </Link>

                <Link
                  to="/recruiter/rankings"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/10 hover:bg-primary/5 hover:border-primary/30 transition-all text-xs font-medium text-foreground group"
                >
                  <span className="flex items-center gap-2.5">
                    <BarChart2 className="w-4 h-4 text-amber-500" />
                    Candidate Reports & Rankings
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
                </Link>

                <Link
                  to="/recruiter/profile"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/10 hover:bg-primary/5 hover:border-primary/30 transition-all text-xs font-medium text-foreground group"
                >
                  <span className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Organization & Profile Settings
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              </div>
            </GlassCard>

          </div>
        </div>

      </div>

      {/* ── Multi-Target Delete Modal ── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground">Select Delete Option</h3>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(null)}
                className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { key: "admin", label: "Delete for admin", sub: "Remove from admin view only", color: "red" },
                { key: "candidates", label: "Delete for candidates", sub: "Remove from candidate view only", color: "orange" },
                { key: "me", label: "Delete for me", sub: "Remove from my view only", color: "blue" },
              ].map(({ key, label, sub, color }) => (
                <label
                  key={key}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                    selectedDeleteTypes.includes(key)
                      ? `border-${color}-500/50 bg-${color}-500/10`
                      : `border-border/50 hover:border-${color}-500/50`
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDeleteTypes.includes(key)}
                    onChange={() =>
                      setSelectedDeleteTypes((prev) =>
                        prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
                      )
                    }
                    className="w-4 h-4 rounded"
                  />
                  <Trash2 className={`w-5 h-5 text-${color}-400`} />
                  <div>
                    <p className="font-medium text-foreground text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="p-6 border-t border-border/30 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(null)}
                className="px-5 py-2 rounded-lg bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!selectedDeleteTypes.length}
                className="px-5 py-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
              >
                <Check className="w-4 h-4" /> Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default RecruiterDashboard;
