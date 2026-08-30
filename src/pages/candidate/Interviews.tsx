import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Target, Building2, FileText, User, LogOut, Calendar, Clock, MapPin, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Incoming Opportunities", href: "/candidate/incoming-opportunities", icon: Briefcase },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const Interviews = () => {
  const interviews: any[] = [];
  const scheduledCount = 0;
  const completedCount = 0;
  const successRate = 0;

  return (
    <DashboardLayout navItems={navItems} title="COMPANY INTERVIEWS">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard variant="neon">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Scheduled</p>
            <p className="text-3xl font-display mt-1 text-primary">{scheduledCount}</p>
          </GlassCard>
          <GlassCard variant="neon">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed</p>
            <p className="text-3xl font-display mt-1 text-foreground">{completedCount}</p>
          </GlassCard>
          <GlassCard variant="neon">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</p>
            <p className="text-3xl font-display mt-1 gradient-text">{successRate}%</p>
          </GlassCard>
        </div>

        <GlassCard variant="neon">
          {interviews.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                <Building2 className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Interviews Scheduled</h3>
              <p className="text-sm text-muted-foreground mb-6">
                You don't have any company interviews at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {interviews.map((interview) => (
                <div key={interview.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-foreground font-semibold">{interview.company}</h3>
                          <p className="text-sm text-muted-foreground">{interview.position}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 mt-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {interview.date}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {interview.time}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          {interview.type}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          interview.status === "scheduled"
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        {interview.status}
                      </span>
                      
                      {interview.status === "scheduled" && (
                        <Link
                          to="/candidate/interview-room"
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground text-sm font-medium hover:shadow-[0_0_20px_hsl(185_100%_50%/0.3)] transition-all"
                        >
                          Join Interview
                        </Link>
                      )}
                      
                      {interview.status === "completed" && (
                        <Link
                          to="/candidate/reports"
                          className="px-4 py-2 rounded-lg border border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 transition-all"
                        >
                          View Report
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default Interviews;
