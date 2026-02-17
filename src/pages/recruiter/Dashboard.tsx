import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, Briefcase, Users, TrendingUp, Plus } from "lucide-react";
import { Link } from "react-router-dom";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Create Job", href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB", href: "/recruiter/questions", icon: Database },
  { label: "Rankings", href: "/recruiter/rankings", icon: Trophy },
  { label: "Messages", href: "/recruiter/messages", icon: MessageCircle },
  { label: "Logout", href: "/login", icon: LogOut },
];

const RecruiterDashboard = () => {
  return (
    <DashboardLayout navItems={navItems} title="RECRUITER DASHBOARD">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Active Jobs", value: "12", icon: Briefcase, color: "text-primary" },
            { label: "Total Candidates", value: "284", icon: Users, color: "text-secondary" },
            { label: "Interviews Today", value: "8", icon: TrendingUp, color: "text-primary" },
            { label: "Avg Score", value: "76", icon: Trophy, color: "text-secondary" },
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold">Top Candidates</h3>
              <Link to="/recruiter/rankings" className="text-xs text-primary hover:underline">View All</Link>
            </div>
            <div className="space-y-3">
              {[
                { name: "Sarah Chen", role: "Sr. Frontend Dev", score: 92 },
                { name: "Alex Kumar", role: "Backend Engineer", score: 88 },
                { name: "Maria Garcia", role: "Full Stack Dev", score: 85 },
              ].map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-xs font-bold text-foreground">
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="text-sm text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.role}</p>
                    </div>
                  </div>
                  <span className="font-display text-primary">{c.score}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-4">Analytics</h3>
            <div className="flex items-end gap-2 h-40">
              {[30, 45, 60, 40, 70, 55, 80, 65, 75, 50, 85, 90].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/20 to-primary/50 hover:from-primary/40 hover:to-primary/70 transition-all cursor-pointer" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Jan</span><span>Dec</span>
            </div>
          </GlassCard>
        </div>

        <Link
          to="/recruiter/create-job"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all"
        >
          <Plus className="w-4 h-4" /> Create New Job
        </Link>
      </div>
    </DashboardLayout>
  );
};

export default RecruiterDashboard;
