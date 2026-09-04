import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut,
  Briefcase, Users, User, Globe, FileText, Edit, Trash2, X, Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",      href: "/recruiter/dashboard",   icon: LayoutDashboard },
  { label: "Create Job",     href: "/recruiter/create-job",  icon: FilePlus },
  { label: "Question DB",    href: "/recruiter/questions",   icon: Database },
  { label: "Rankings",       href: "/recruiter/rankings",    icon: Trophy },
  { label: "Messages",       href: "/recruiter/messages",    icon: MessageCircle },
  { label: "Profile Settings", href: "/recruiter/profile",  icon: User },
  { label: "Logout",         href: "/login",                 icon: LogOut },
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
    try { return new Date() > new Date(job.end_date); } catch { return false; }
  }
  return false;
};

const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);
  const [selectedDeleteTypes, setSelectedDeleteTypes] = useState<string[]>([]);

  const getRecruiterEmail = () => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").email || ""; }
    catch { return ""; }
  };

  const loadData = async () => {
    setLoading(true);
    const email = getRecruiterEmail();
    if (!email) { setLoading(false); return; }

    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch(`${API}/jobs/recruiter/${encodeURIComponent(email)}`),
        fetch(`${API}/applications/recruiter/${encodeURIComponent(email)}`),
      ]);

      let jobsList: Job[] = [];
      if (jobsRes.ok) {
        const d = await jobsRes.json();
        jobsList = d.jobs || [];
        setJobs(jobsList);
      }

      if (appsRes.ok) {
        const d = await appsRes.json();
        const apps: any[] = d.applications || [];
        // count applications per job_id
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

  useEffect(() => { loadData(); }, []);

  const activeJobsCount = jobs.filter(
    (j) => j.status === "published" && j.is_active && !isExpired(j)
  ).length;

  const totalCandidates = Object.values(appCounts).reduce((a, b) => a + b, 0);

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
      toast({ title: "Success", description: `Job ${newStatus === "published" ? "published" : "saved as draft"}` });
      loadData();
    } catch {
      toast({ title: "Error", description: "Failed to update job status", variant: "destructive" });
    }
  };

  const deleteJob = async (jobId: string, deleteType: string) => {
    try {
      const res = await fetch(`${API}/jobs/${jobId}?deleteType=${deleteType}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Success", description: "Job deleted" });
      loadData();
    } catch {
      toast({ title: "Error", description: "Failed to delete job", variant: "destructive" });
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout navItems={navItems} title="RECRUITER DASHBOARD">
      <div className="space-y-8">

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
          {[
            { label: "Active Jobs",      value: loading ? "..." : activeJobsCount.toString(),  icon: Briefcase, color: "text-primary" },
            { label: "Total Candidates", value: loading ? "..." : totalCandidates.toString(),  icon: Users,     color: "text-secondary" },
          ].map((s) => (
            <GlassCard key={s.label} variant="neon">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className={`text-3xl font-display mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color} opacity-40`} />
              </div>
            </GlassCard>
          ))}
        </div>

        {/* ── Jobs list ── */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <Briefcase className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No jobs created yet. Post your first job above.</p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job) => {
              const expired = isExpired(job);
              const appCount = appCounts[job._id] || 0;

              return (
                <GlassCard key={job._id} variant="neon" hover>
                  <div className="space-y-4">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-1">{job.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {job.organization_name} • {job.experience}
                        </p>
                      </div>

                      {/* Status + ongoing/expired tags */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          job.status === "published"
                            ? "bg-green-500/20 text-green-400 border-green-500/40"
                            : "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                        }`}>
                          {job.status === "published" ? "Published" : "Draft"}
                        </span>

                        {job.status === "published" && (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            expired
                              ? "bg-red-500/20 text-red-400 border-red-500/40"
                              : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                          }`}>
                            {expired ? "Expired" : "Ongoing"}
                          </span>
                        )}

                        {/* Candidates applied tag */}
                        <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-secondary/20 text-secondary border border-secondary/40">
                          <Users className="w-3 h-3" />
                          {appCount} {appCount === 1 ? "Candidate" : "Candidates"}
                        </span>
                      </div>
                    </div>

                    {/* Skills */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Required Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {job.required_skills.map((skill, i) => (
                          <span key={i} className="px-2 py-1 bg-primary/20 text-primary border border-primary/40 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Responsibilities */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Key Responsibilities:</p>
                      <ul className="text-sm text-foreground space-y-1">
                        {job.key_responsibilities.slice(0, 3).map((r, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                        {job.key_responsibilities.length > 3 && (
                          <li className="text-muted-foreground text-xs">+{job.key_responsibilities.length - 3} more...</li>
                        )}
                      </ul>
                    </div>

                    {/* Footer actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/30 flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">
                        Created: {new Date(job.created_at).toLocaleDateString()}
                        {job.end_date && (
                          <> • Ends: {new Date(job.end_date).toLocaleDateString()}</>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStatus(job._id, job.status)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                            job.status === "draft"
                              ? "bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30"
                          }`}
                        >
                          {job.status === "draft"
                            ? <><Globe className="w-4 h-4" /> Publish</>
                            : <><FileText className="w-4 h-4" /> Draft</>}
                        </button>
                        <button
                          onClick={() => navigate(`/recruiter/edit-job/${job._id}`)}
                          className="p-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setDeleteModalOpen(job._id); setSelectedDeleteTypes([]); }}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Delete modal ── */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground">Select Delete Option</h3>
              <button onClick={() => setDeleteModalOpen(null)} className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { key: "admin",      label: "Delete for admin",      sub: "Remove from admin view only",     color: "red" },
                { key: "candidates", label: "Delete for candidates",  sub: "Remove from candidate view only", color: "orange" },
                { key: "me",         label: "Delete for me",          sub: "Remove from my view only",        color: "blue" },
              ].map(({ key, label, sub, color }) => (
                <label key={key} className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedDeleteTypes.includes(key)
                    ? `border-${color}-500/50 bg-${color}-500/10`
                    : `border-border/50 hover:border-${color}-500/50`
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedDeleteTypes.includes(key)}
                    onChange={() => setSelectedDeleteTypes((prev) =>
                      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
                    )}
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
              <button onClick={() => setDeleteModalOpen(null)} className="px-5 py-2 rounded-lg bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-colors text-sm">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={!selectedDeleteTypes.length}
                className="px-5 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
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
