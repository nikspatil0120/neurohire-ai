import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Target, Building2, FileText, User, LogOut, Brain, TrendingUp, Calendar, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useProfile } from "@/contexts/ProfileContext";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const CandidateDashboard = () => {
  const { profileCompletion } = useProfile();

  return (
    <DashboardLayout navItems={navItems} title="DASHBOARD">
      <div className="space-y-6">
        {/* Top stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard variant="neon">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Profile Completion</p>
                <p className="text-3xl font-display mt-1 text-foreground">{profileCompletion}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted/50">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-primary to-neon-cyan transition-all duration-500 ease-out" 
                style={{ width: `${profileCompletion}%` }}
              />
            </div>
          </GlassCard>

          <GlassCard variant="neon">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Upcoming Interviews</p>
                <p className="text-3xl font-display mt-1 text-foreground">0</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-secondary" />
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="neon">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Overall Score</p>
                <p className="text-3xl font-display mt-1 gradient-text">0</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Recommendation - Coming Soon */}
          {/* <GlassCard variant="holographic" className="lg:col-span-2">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold mb-1">AI Recommendation</h3>
                <p className="text-sm text-muted-foreground">
                  Based on your profile analysis, focus on improving your system design explanations.
                  Your technical skills are strong, but articulation in behavioral questions needs work.
                  Prepare well for your upcoming interviews.
                </p>
              </div>
            </div>
          </GlassCard> */}

          {/* Quick Actions */}
          <GlassCard variant="neon">
            <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Quick Actions
            </h3>
            <div className="space-y-3">
              <Link
                to="/candidate/practice"
                className="block w-full py-3 px-4 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm text-center hover:bg-primary/20 transition-all"
              >
                Start Practice Mode
              </Link>
              <Link
                to="/candidate/interview-room"
                className="block w-full py-3 px-4 rounded-lg bg-secondary/10 border border-secondary/30 text-secondary text-sm text-center hover:bg-secondary/20 transition-all"
              >
                Enter Interview Room
              </Link>
            </div>
          </GlassCard>

          {/* Performance Graph placeholder */}
          <GlassCard variant="neon">
            <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Performance Trend
            </h3>
            <div className="flex items-end gap-2 h-32">
              {[40, 55, 45, 60, 70, 65, 80, 75, 85].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-primary/30 to-primary/60 transition-all hover:from-primary/50 hover:to-primary/80" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>Week 1</span><span>Current</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CandidateDashboard;
