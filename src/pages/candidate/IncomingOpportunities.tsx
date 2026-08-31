import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Target, Building2, FileText, User, LogOut, Briefcase, Clock, Calendar, Check, X } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Incoming Opportunities", href: "/candidate/incoming-opportunities", icon: Briefcase },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

interface JobOpportunity {
  _id: string;
  title: string;
  organization_name: string;
  recruiter_name: string;
  experience: string;
  required_skills: string[];
  key_responsibilities: string[];
  status: "pending" | "accepted" | "rejected" | "published" | "draft";
  is_active: boolean;
  created_at: string;
}

const IncomingOpportunities = () => {
  const [opportunities, setOpportunities] = useState<JobOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    setIsLoading(true);
    try {
      // Fetch all active jobs (published jobs)
      const response = await fetch('http://localhost:8000/api/v1/jobs/?active_only=true');
      if (response.ok) {
        const jobs = await response.json();
        console.log('Fetched jobs:', jobs); // Debug log
        
        // Set all jobs with pending status for the candidate
        const jobsWithStatus = jobs.map((job: any) => ({
          ...job,
          status: "pending" // Default status for new opportunities
        }));
        
        setOpportunities(jobsWithStatus);
      } else {
        console.error('Failed to fetch jobs:', response.status, response.statusText);
        setOpportunities([]);
      }
    } catch (error) {
      console.error('Error loading opportunities:', error);
      setOpportunities([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async (jobId: string) => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      
      // Apply to job (this would need a backend endpoint)
      const response = await fetch(`http://localhost:8000/api/v1/applications/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          candidate_id: user.id,
          candidate_email: user.email,
          candidate_name: user.name
        })
      });

      if (response.ok) {
        // Update local status
        setOpportunities(prev => 
          prev.map(opp => 
            opp._id === jobId ? { ...opp, status: "accepted" } : opp
          )
        );
      }
    } catch (error) {
      console.error('Error applying to job:', error);
    }
  };

  const handleReject = (jobId: string) => {
    setOpportunities(prev => 
      prev.map(opp => 
        opp._id === jobId ? { ...opp, status: "rejected" } : opp
      )
    );
  };

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
              <h3 className="text-lg font-semibold text-foreground mb-2">No Opportunities Available</h3>
              <p className="text-muted-foreground mb-4">
                There are currently no job openings. Check back later for new opportunities!
              </p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid gap-6">
            {opportunities.map((opportunity) => (
              <GlassCard key={opportunity._id} variant="neon" hover={true}>
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">{opportunity.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {opportunity.organization_name} • {opportunity.recruiter_name}
                      </p>
                    </div>
                    {opportunity.status === "accepted" && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/40">
                        Applied
                      </span>
                    )}
                    {opportunity.status === "rejected" && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/40">
                        Rejected
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{opportunity.experience}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Posted: {new Date(opportunity.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Required Skills:</h4>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.required_skills.map((skill, index) => (
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
                      {opportunity.key_responsibilities.slice(0, 3).map((resp, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                      {opportunity.key_responsibilities.length > 3 && (
                        <li className="text-muted-foreground text-xs">
                          +{opportunity.key_responsibilities.length - 3} more...
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Actions */}
                  {opportunity.status === "pending" && (
                    <div className="flex gap-3 pt-4 border-t border-border/30">
                      <button
                        onClick={() => handleApply(opportunity._id)}
                        className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Apply
                      </button>
                      <button
                        onClick={() => handleReject(opportunity._id)}
                        className="px-4 py-2 rounded-lg border border-border/50 text-foreground hover:bg-muted/30 transition-all flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" /> Reject
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

export default IncomingOpportunities;
