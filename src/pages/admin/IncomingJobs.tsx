import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, Shield, Users, Building2, Brain, Code, BookOpen, Briefcase,
  X, MapPin, DollarSign, Clock, Calendar, Building, AlignLeft, ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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

interface Job {
  _id: string;
  title: string;
  company: string;
  organization_name: string;
  location: string;
  salary: string;
  experience: string;
  description?: string;
  vacancies?: number | null;
  required_skills: string[];
  key_responsibilities: string[];
  recruiter_email: string;
  recruiter_name: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  company_logo: string;
  applications: number;
  aptitude_threshold?: number | null;
  aptitude_duration?: number | null;
  aptitude_priority?: number | null;
  coding_priority?: number | null;
  aptitude_questions?: any[];
  coding_problems?: any[];
}

const IncomingJobs = () => {
  const navigate = useNavigate();
  const [jobs,         setJobs]         = useState<Job[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [selectedJob,  setSelectedJob]  = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);

  useEffect(() => { loadJobs(); }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API}/jobs/?user_type=admin`);
      if (response.ok) {
        const data = await response.json();
        const raw = (Array.isArray(data) ? data : []).filter(
          (job: any) => job.status === "published" || job.is_active === true
        );

        const enriched = await Promise.all(raw.map(async (job: any) => {
          if (job.recruiter_email) {
            try {
              const r = await fetch(`${API}/users/recruiter-info/${job.recruiter_email}`);
              if (r.ok) {
                const info = await r.json();
                return { ...job, company_logo: info.logo || "", organization_name: job.organization_name || info.organization_name || "Unknown" };
              }
            } catch { /* ignore */ }
          }
          return { ...job, company_logo: job.company_logo || "", organization_name: job.organization_name || "Unknown" };
        }));

        setJobs(enriched);
      }
    } catch (err) {
      console.error("Error loading jobs:", err);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="INCOMING JOBS">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="INCOMING JOBS">
      <div className="space-y-6">
        {jobs.length === 0 ? (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Published Jobs</h3>
              <p className="text-muted-foreground">Jobs published by recruiters will appear here.</p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {jobs.map((job) => (
              <div key={job._id} onClick={() => { setSelectedJob(job); setShowJobModal(true); }}
                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform duration-200 bg-gradient-to-br from-primary/10 to-secondary/10 border border-border/30 hover:border-primary/50 relative">

                {/* 62% â€” logo */}
                <div className={`h-[62%] flex flex-col items-center justify-center p-4 ${job.company_logo ? "bg-white/10" : "bg-gradient-to-br from-primary/20 to-secondary/20"}`}>
                  {job.company_logo
                    ? <img src={job.company_logo} alt={job.organization_name} className="w-16 h-16 rounded-full object-cover shadow-lg"
                        onError={e => { e.currentTarget.style.display="none"; e.currentTarget.nextElementSibling?.classList.remove("hidden"); }} />
                    : null}
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg ${job.company_logo ? "hidden" : ""}`}>
                    <Building className="w-8 h-8 text-white" />
                  </div>
                  {/* Applicant count badge */}
                  {job.applications > 0 && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                      {job.applications} applied
                    </div>
                  )}
                </div>

                {/* 10% â€” org name */}
                <div className="h-[10%] flex items-center justify-center px-2 bg-background/80 border-t border-border/20">
                  <p className="text-xs font-semibold text-foreground text-center line-clamp-1">{job.organization_name}</p>
                </div>

                {/* 28% â€” title + meta */}
                <div className="h-[28%] flex flex-col items-center justify-center p-2 bg-background/50 gap-0.5">
                  <p className="text-xs font-medium text-primary text-center line-clamp-1">{job.title}</p>
                  <p className="text-[10px] text-muted-foreground">{job.experience}</p>
                  {job.end_date && (
                    <p className="text-[10px] text-amber-400">
                      Closes {new Date(job.end_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* â•â•â• Job Detail Modal â•â•â• */}
      {showJobModal && selectedJob && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowJobModal(false)}>
          <div className="bg-background rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border/30" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border/30 p-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                {selectedJob.company_logo
                  ? <img src={selectedJob.company_logo} alt={selectedJob.organization_name} className="w-14 h-14 rounded-full object-cover shadow-lg"
                      onError={e=>{e.currentTarget.style.display="none";e.currentTarget.nextElementSibling?.classList.remove("hidden");}} />
                  : null}
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg ${selectedJob.company_logo?"hidden":""}`}>
                  <Building className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedJob.organization_name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Posted by {selectedJob.recruiter_name} Â· {selectedJob.recruiter_email}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowJobModal(false)} className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-3">{selectedJob.title}</h1>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{selectedJob.experience}</div>
                  <div className="flex items-center gap-1.5"><DollarSign className="w-4 h-4" />{selectedJob.salary || "Competitive"}</div>
                  <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{new Date(selectedJob.created_at).toLocaleDateString()}</div>
                  {selectedJob.vacancies != null && <div className="flex items-center gap-1.5"><Users className="w-4 h-4" />{selectedJob.vacancies} vacanc{selectedJob.vacancies===1?"y":"ies"}</div>}
                  {selectedJob.end_date && <div className="flex items-center gap-1.5 text-amber-400"><Calendar className="w-4 h-4" />Closes {new Date(selectedJob.end_date).toLocaleDateString()}</div>}
                </div>
              </div>

              {/* Applicant count + link */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold text-foreground">{selectedJob.applications} Application{selectedJob.applications !== 1 ? "s" : ""}</p>
                    <p className="text-xs text-muted-foreground">Total candidates who applied</p>
                  </div>
                </div>
                <button onClick={() => { setShowJobModal(false); navigate(`/admin/applications?job_id=${selectedJob._id}`); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all text-sm">
                  <ExternalLink className="w-3.5 h-3.5" />View Applicants
                </button>
              </div>

              {/* Description */}
              {selectedJob.description && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5"><AlignLeft className="w-4 h-4 text-primary"/>About the Role</h3>
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
                        <span className="font-medium text-foreground">Aptitude</span>
                        <span className="text-muted-foreground">Â· P{selectedJob.aptitude_priority}</span>
                        {selectedJob.aptitude_duration != null && <span className="text-muted-foreground">Â· {selectedJob.aptitude_duration}min</span>}
                        {selectedJob.aptitude_threshold != null && <span className="text-muted-foreground">Â· Pass: {selectedJob.aptitude_threshold}{selectedJob.aptitude_questions?.length?`/${selectedJob.aptitude_questions.length}`:""}</span>}
                      </div>
                    )}
                    {selectedJob.coding_priority != null && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
                        <Code className="w-4 h-4 text-blue-400" />
                        <span className="font-medium text-foreground">Coding</span>
                        <span className="text-muted-foreground">Â· P{selectedJob.coding_priority}</span>
                        {selectedJob.coding_problems?.length != null && <span className="text-muted-foreground">Â· {selectedJob.coding_problems.length} problem{selectedJob.coding_problems.length!==1?"s":""}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Skills */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.required_skills.map((s, i) => (
                    <span key={i} className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded-lg text-sm">{s}</span>
                  ))}
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Key Responsibilities</h3>
                <ul className="space-y-1.5">
                  {selectedJob.key_responsibilities.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-foreground">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      <span className="text-sm">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default IncomingJobs;
