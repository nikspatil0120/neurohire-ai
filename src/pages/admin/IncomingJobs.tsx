import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Shield, Users, Building2, Activity, AlertTriangle, Brain, Server, Code, BookOpen, Briefcase, Check, X, Eye, MapPin, DollarSign, Clock, Calendar } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "System Monitor", href: "/admin/monitoring", icon: Shield },
  { label: "Recruiters", href: "/admin/recruiters", icon: Building2 },
  { label: "Candidates", href: "/admin/candidates", icon: Users },
  { label: "Incoming Jobs", href: "/admin/incoming-jobs", icon: Briefcase },
  { label: "DSA Problems", href: "/admin/dsa-problems", icon: Code },
  { label: "Aptitude Questions", href: "/admin/aptitude-questions", icon: BookOpen },
  { label: "AI Performance", href: "/admin/ai-performance", icon: Brain },
];

interface Job {
  _id: string;
  title: string;
  company: string;
  organization_name: string;
  location: string;
  salary: string;
  experience: string;
  required_skills: string[];
  key_responsibilities: string[];
  recruiter_email: string;
  recruiter_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

const IncomingJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/jobs/');
      if (response.ok) {
        const data = await response.json();
        const jobsArray = Array.isArray(data) ? data : [];
        
        // Show published jobs (status: "published" or is_active: true)
        const publishedJobs = jobsArray.filter((job: any) => 
          job.status === "published" || job.is_active === true
        );
        
        setJobs(publishedJobs);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: "published" })
      });

      if (response.ok) {
        setJobs(prev => 
          prev.map(job => 
            job._id === jobId ? { ...job, status: "approved" } : job
          )
        );
      }
    } catch (error) {
      console.error('Error approving job:', error);
    }
  };

  const handleReject = async (jobId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setJobs(prev => prev.filter(job => job._id !== jobId));
      }
    } catch (error) {
      console.error('Error rejecting job:', error);
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
              <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Jobs</h3>
              <p className="text-muted-foreground mb-4">
                Jobs submitted by recruiters will appear here for approval
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job) => (
              <GlassCard key={job._id} variant="neon" hover={true}>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">{job.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {job.organization_name} • Posted by {job.recruiter_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{job.recruiter_email}</p>
                    </div>
                    {job.status === "approved" && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/40">
                        Approved
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location || "Remote"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>{job.salary || "Competitive"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{job.experience}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Required Skills:</h4>
                    <div className="flex flex-wrap gap-2">
                      {job.required_skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/20 text-primary border border-primary/40 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Responsibilities Preview */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Key Responsibilities:</h4>
                    <ul className="text-sm text-foreground space-y-1">
                      {job.key_responsibilities.slice(0, 3).map((resp, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                      {job.key_responsibilities.length > 3 && (
                        <li className="text-muted-foreground text-xs">
                          +{job.key_responsibilities.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Actions */}
                  {job.status === "pending" && (
                    <div className="flex gap-3 pt-4 border-t border-border/30">
                      <button
                        onClick={() => handleApprove(job._id)}
                        className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </button>
                      <button
                        onClick={() => handleReject(job._id)}
                        className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                      <button
                        className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" /> View Details
                      </button>
                    </div>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default IncomingJobs;
