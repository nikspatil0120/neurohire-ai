import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, Save, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Create Job", href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB", href: "/recruiter/questions", icon: Database },
  { label: "Rankings", href: "/recruiter/rankings", icon: Trophy },
  { label: "Messages", href: "/recruiter/messages", icon: MessageCircle },
  { label: "Logout", href: "/login", icon: LogOut },
];

const CreateJob = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    experience: "",
    requiredSkills: "",
    keyResponsibilities: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get recruiter info from localStorage
  const getRecruiterInfo = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return {
          id: user.id || '',
          email: user.email || '',
          name: user.name || user.full_name || '',
          organization: user.organization_name || ''
        };
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    return {
      id: '',
      email: '',
      name: '',
      organization: ''
    };
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Job title is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.experience.trim()) {
      toast({
        title: "Validation Error",
        description: "Experience required is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.requiredSkills.trim()) {
      toast({
        title: "Validation Error",
        description: "Required skills are required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.keyResponsibilities.trim()) {
      toast({
        title: "Validation Error",
        description: "Key responsibilities are required",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const recruiterInfo = getRecruiterInfo();

      // Parse skills and responsibilities
      const skillsArray = formData.requiredSkills
        .split(',')
        .map(skill => skill.trim())
        .filter(skill => skill.length > 0);

      const responsibilitiesArray = formData.keyResponsibilities
        .split(/[,\n]/)
        .map(resp => resp.trim())
        .filter(resp => resp.length > 0);

      // Prepare request payload
      const payload = {
        title: formData.title.trim(),
        experience: formData.experience.trim(),
        required_skills: skillsArray,
        key_responsibilities: responsibilitiesArray,
        recruiter_id: recruiterInfo.id,  // MongoDB _id
        recruiter_email: recruiterInfo.email,
        recruiter_name: recruiterInfo.name,
        organization_name: recruiterInfo.organization
      };

      console.log('Submitting job:', payload);

      // Make API call
      const response = await fetch('http://localhost:8000/api/v1/jobs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Job posting created successfully",
          duration: 3000
        });

        // Clear form
        setFormData({
          title: "",
          experience: "",
          requiredSkills: "",
          keyResponsibilities: ""
        });

        // Optional: Navigate to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/recruiter/dashboard');
        }, 2000);
      } else {
        throw new Error(data.detail || 'Failed to create job');
      }
    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create job posting",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems} title="CREATE JOB">
      <div className="max-w-3xl space-y-6">
        <GlassCard variant="neon" hover={false}>
          <h3 className="text-foreground font-semibold mb-6">Job Details</h3>
          <div className="space-y-4">
            {/* Job Title */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Senior Frontend Developer" 
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" 
              />
            </div>

            {/* Experience Required */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Experience Required <span className="text-red-500">*</span>
              </label>
              <input 
                type="text"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="e.g., 3-5 years in React and TypeScript" 
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" 
              />
            </div>

            {/* Required Skills */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Required Skills <span className="text-red-500">*</span>
              </label>
              <textarea 
                name="requiredSkills"
                value={formData.requiredSkills}
                onChange={handleChange}
                placeholder="e.g., React.js, TypeScript, Node.js, REST APIs, Git, Agile methodologies"
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all resize-none" 
              />
              <p className="text-xs text-muted-foreground mt-1">Enter skills separated by commas</p>
            </div>

            {/* Key Responsibilities */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Key Responsibilities <span className="text-red-500">*</span>
              </label>
              <textarea 
                name="keyResponsibilities"
                value={formData.keyResponsibilities}
                onChange={handleChange}
                placeholder="e.g., Develop and maintain frontend applications, Collaborate with design team, Write clean and maintainable code, Conduct code reviews"
                rows={6}
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all resize-none" 
              />
              <p className="text-xs text-muted-foreground mt-1">Enter responsibilities separated by commas or new lines</p>
            </div>
          </div>
        </GlassCard>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Creating Job...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Create Job
            </>
          )}
        </button>
      </div>
    </DashboardLayout>
  );
};

export default CreateJob;
