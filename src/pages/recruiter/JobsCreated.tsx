import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { 
  LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, 
  Briefcase, Eye, Edit, Trash2, Globe, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Create Job", href: "/recruiter/create-job", icon: FilePlus },
  { label: "Jobs Created", href: "/recruiter/jobs-created", icon: Briefcase },
  { label: "Question DB", href: "/recruiter/questions", icon: Database },
  { label: "Rankings", href: "/recruiter/rankings", icon: Trophy },
  { label: "Messages", href: "/recruiter/messages", icon: MessageCircle },
  { label: "Logout", href: "/login", icon: LogOut },
];

interface Job {
  _id: string;
  title: string;
  experience: string; // Backend uses 'experience' as string like "2+ years"
  required_skills: string[];
  key_responsibilities: string[];
  status: "draft" | "published";
  created_at: string;
  recruiter_name: string;
  organization_name: string;
}

const JobsCreated = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      console.log('[JobsCreated] User from localStorage:', userStr);
      
      if (!userStr) {
        console.log('[JobsCreated] No user found in localStorage');
        setJobs([]);
        return;
      }

      const user = JSON.parse(userStr);
      console.log('[JobsCreated] Parsed user:', user);
      console.log('[JobsCreated] Fetching jobs for recruiter email:', user.email);
      
      // Backend endpoint uses recruiter_email, not recruiter_id
      const apiUrl = `http://localhost:8000/api/v1/jobs/recruiter/${user.email}`;
      console.log('[JobsCreated] API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('[JobsCreated] Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('[JobsCreated] Endpoint not found (404), trying alternative endpoint');
          // Try alternative endpoint - get all jobs
          const allJobsResponse = await fetch('http://localhost:8000/api/v1/jobs/');
          if (allJobsResponse.ok) {
            const allData = await allJobsResponse.json();
            console.log('[JobsCreated] All jobs response:', allData);
            const jobsArray = Array.isArray(allData) ? allData : (allData.jobs || []);
            // Filter by recruiter_id on frontend
            const userJobs = jobsArray.filter((job: any) => job.recruiter_id === user.id);
            console.log('[JobsCreated] Filtered user jobs:', userJobs);
            setJobs(Array.isArray(userJobs) ? userJobs : []);
            return;
          }
          setJobs([]);
          return;
        }
        throw new Error('Failed to load jobs');
      }

      const data = await response.json();
      console.log('[JobsCreated] Jobs data received:', data);
      console.log('[JobsCreated] Data type:', typeof data, 'Is array:', Array.isArray(data));
      
      // Handle different response formats - ensure we always set an array
      let jobsArray: Job[] = [];
      if (Array.isArray(data)) {
        jobsArray = data;
      } else if (data && typeof data === 'object') {
        // Check for common response structures
        if (Array.isArray(data.jobs)) {
          jobsArray = data.jobs;
        } else if (Array.isArray(data.data)) {
          jobsArray = data.data;
        } else if (Array.isArray(data.items)) {
          jobsArray = data.items;
        } else if (data.success && Array.isArray(data.jobs)) {
          // Backend format: { success: true, count: n, jobs: [...] }
          jobsArray = data.jobs;
        }
      }
      
      console.log('[JobsCreated] Final jobs array:', jobsArray);
      setJobs(jobsArray);
      
    } catch (error) {
      console.error('[JobsCreated] Error loading jobs:', error);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (jobId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "draft" ? "published" : "draft";
      const response = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Job ${newStatus === "published" ? "published" : "saved as draft"} successfully`
        });
        loadJobs(); // Reload jobs
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive"
      });
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Job deleted successfully"
        });
        loadJobs();
      } else {
        throw new Error('Failed to delete job');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} title="JOBS CREATED">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="JOBS CREATED">
      <div className="space-y-6">
        {jobs.length === 0 ? (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Jobs Created Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first job posting to get started</p>
              <button
                onClick={() => navigate('/recruiter/create-job')}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                Create Job
              </button>
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
                        {job.organization_name} • {job.experience}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        job.status === "published" 
                          ? "bg-green-500/20 text-green-400 border border-green-500/40" 
                          : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                      }`}>
                        {job.status === "published" ? "Published" : "Draft"}
                      </span>
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
                  <div className="flex items-center justify-between pt-4 border-t border-border/30">
                    <span className="text-xs text-muted-foreground">
                      Created: {new Date(job.created_at).toLocaleDateString()}
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
                        {job.status === "draft" ? (
                          <><Globe className="w-4 h-4" /> Publish</>
                        ) : (
                          <><FileText className="w-4 h-4" /> Save as Draft</>
                        )}
                      </button>
                      <button
                        onClick={() => navigate(`/recruiter/edit-job/${job._id}`)}
                        className="p-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all"
                        title="Edit Job"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteJob(job._id)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all"
                        title="Delete Job"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default JobsCreated;
