import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Target, Building2, FileText, User, LogOut, Upload, Save } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const CandidateProfile = () => {
  return (
    <DashboardLayout navItems={navItems} title="PROFILE">
      <div className="max-w-3xl space-y-6">
        {/* Progress */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Profile Completion</span>
            <span className="text-sm text-primary font-mono">72%</span>
          </div>
          <div className="h-2 rounded-full bg-muted/50">
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-primary to-neon-cyan transition-all" />
          </div>
        </GlassCard>

        {/* Form */}
        <GlassCard variant="neon" hover={false}>
          <h3 className="text-foreground font-semibold mb-6">Personal Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: "Full Name", placeholder: "John Doe" },
              { label: "Email", placeholder: "john@example.com" },
              { label: "Phone", placeholder: "+1 234 567 890" },
              { label: "Location", placeholder: "San Francisco, CA" },
            ].map((f) => (
              <div key={f.label}>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">{f.label}</label>
                <input
                  placeholder={f.placeholder}
                  className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all"
                />
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard variant="neon" hover={false}>
          <h3 className="text-foreground font-semibold mb-4">Resume</h3>
          <div className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center hover:border-primary/40 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Drag & drop your resume or click to browse</p>
            <p className="text-xs text-muted-foreground/50 mt-1">PDF, DOCX up to 5MB</p>
          </div>
        </GlassCard>

        <GlassCard variant="neon" hover={false}>
          <h3 className="text-foreground font-semibold mb-4">Skills</h3>
          <textarea
            placeholder="React, TypeScript, Python, Machine Learning..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all resize-none"
          />
        </GlassCard>

        <button className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> Save Profile
        </button>
      </div>
    </DashboardLayout>
  );
};

export default CandidateProfile;
