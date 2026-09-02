import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { 
  LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, 
  Briefcase, Eye, Edit, Trash2, Globe, FileText, X, Check
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
  deleted_by_recruiter?: boolean;
  admin_deleted?: boolean;
  candidates_deleted?: boolean;
}

const JobsCreated = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState<string | null>(null);
  const [selectedDeleteTypes, setSelectedDeleteTypes] = useState<string[]>([]);

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

  const deleteJob = async (jobId: string, deleteType: string) => {
    const deleteMessages = {
      'admin': 'Delete for admin',
      'candidates': 'Delete for candidates', 
      'me': 'Delete for me'
    };

    try {
      const response = await fetch(`http://localhost:8000/api/v1/jobs/${jobId}?deleteType=${deleteType}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Job ${deleteMessages[deleteType as keyof typeof deleteMessages]} successfully`
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

  const handleDeleteClick = (jobId: string) => {
    setDeleteModalOpen(jobId);
    setSelectedDeleteTypes([]);
  };

  const handleDeleteTypeToggle = (deleteType: string) => {
    setSelectedDeleteTypes(prev => 
      prev.includes(deleteType) 
        ? prev.filter(type => type !== deleteType)
        : [...prev, deleteType]
    );
  };

  const confirmDelete = async () => {
    if (selectedDeleteTypes.length === 0 || !deleteModalOpen) return;
    
    const deleteMessages = {
      'admin': 'Delete for admin',
      'candidates': 'Delete for candidates', 
      'me': 'Delete for me'
    };
    
    // Check if all three options are selected
    const allSelected = selectedDeleteTypes.length === 3 && 
                        selectedDeleteTypes.includes('admin') && 
                        selectedDeleteTypes.includes('candidates') && 
                        selectedDeleteTypes.includes('me');
    
    if (allSelected) {
      // Complete deletion from database
      if (confirm('Are you sure you want to completely delete this job from the database? This action cannot be undone.')) {
        await deleteJob(deleteModalOpen, 'all');
        setDeleteModalOpen(null);
        setSelectedDeleteTypes([]);
      }
    } else {
      // Partial deletion with visibility logic
      const selectedMessage = selectedDeleteTypes.map(type => deleteMessages[type as keyof typeof deleteMessages]).join(', ');
      
      if (confirm(`Are you sure you want to ${selectedMessage}?`)) {
        // Delete for each selected type
        for (const deleteType of selectedDeleteTypes) {
          await deleteJob(deleteModalOpen, deleteType);
        }
        // Close modal after all deletions are complete
        setDeleteModalOpen(null);
        setSelectedDeleteTypes([]);
      }
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(null);
    setSelectedDeleteTypes([]);
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
                        onClick={() => handleDeleteClick(job._id)}
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

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground">Select Delete Option</h3>
              <button
                onClick={closeDeleteModal}
                className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-muted-foreground mb-6">
                Choose how you want to delete this job posting:
              </p>

              <div className="space-y-3">
                <label className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedDeleteTypes.includes('admin') 
                    ? 'border-red-500/50 bg-red-500/10' 
                    : 'border-border/50 hover:border-red-500/50 hover:bg-red-500/10'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedDeleteTypes.includes('admin')}
                    onChange={() => handleDeleteTypeToggle('admin')}
                    className="w-4 h-4 text-red-500 accent-red-500 rounded"
                  />
                  <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Delete for admin</div>
                    <div className="text-xs text-muted-foreground">Remove from admin view only</div>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedDeleteTypes.includes('candidates') 
                    ? 'border-orange-500/50 bg-orange-500/10' 
                    : 'border-border/50 hover:border-orange-500/50 hover:bg-orange-500/10'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedDeleteTypes.includes('candidates')}
                    onChange={() => handleDeleteTypeToggle('candidates')}
                    className="w-4 h-4 text-orange-500 accent-orange-500 rounded"
                  />
                  <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Delete for candidates</div>
                    <div className="text-xs text-muted-foreground">Remove from candidate view only</div>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer ${
                  selectedDeleteTypes.includes('me') 
                    ? 'border-blue-500/50 bg-blue-500/10' 
                    : 'border-border/50 hover:border-blue-500/50 hover:bg-blue-500/10'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedDeleteTypes.includes('me')}
                    onChange={() => handleDeleteTypeToggle('me')}
                    className="w-4 h-4 text-blue-500 accent-blue-500 rounded"
                  />
                  <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Delete for me</div>
                    <div className="text-xs text-muted-foreground">Remove from my view only</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-border/30 flex justify-end gap-3">
              <button
                onClick={closeDeleteModal}
                className="px-6 py-2 rounded-lg bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={selectedDeleteTypes.length === 0}
                className="px-6 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default JobsCreated;
