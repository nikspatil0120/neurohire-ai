import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, Upload, Save } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Create Job", href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB", href: "/recruiter/questions", icon: Database },
  { label: "Rankings", href: "/recruiter/rankings", icon: Trophy },
  { label: "Messages", href: "/recruiter/messages", icon: MessageCircle },
  { label: "Logout", href: "/login", icon: LogOut },
];

const CreateJob = () => {
  return (
    <DashboardLayout navItems={navItems} title="CREATE JOB">
      <div className="max-w-3xl space-y-6">
        <GlassCard variant="neon" hover={false}>
          <h3 className="text-foreground font-semibold mb-6">Job Details</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Job Title</label>
              <input placeholder="Senior Frontend Developer" className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Job Description</label>
              <div className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer">
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Upload JD (PDF, DOCX)</p>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="neon" hover={false}>
          <h3 className="text-foreground font-semibold mb-6">Interview Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Duration (min)</label>
              <input type="number" defaultValue={45} className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Difficulty</label>
              <div className="flex gap-2">
                {["Easy", "Medium", "Hard", "Adaptive"].map((d) => (
                  <button key={d} className="flex-1 py-2 rounded-lg text-xs bg-muted/30 border border-border/30 text-muted-foreground hover:border-primary/30 hover:text-primary transition-all">
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="purple" hover={false}>
          <h3 className="text-foreground font-semibold mb-4">Termination Logic</h3>
          <p className="text-sm text-muted-foreground mb-4">Configure when the AI should automatically end the interview</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Max Warnings</label>
              <input type="number" defaultValue={3} className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-all" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Min Score Threshold</label>
              <input type="number" defaultValue={20} className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-all" />
            </div>
          </div>
        </GlassCard>

        <button className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> Create Job
        </button>
      </div>
    </DashboardLayout>
  );
};

export default CreateJob;
