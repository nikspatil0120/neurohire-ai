import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Shield, Users, Building2, Activity, AlertTriangle, Brain, Server, Code, BookOpen } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "System Monitor", href: "/admin/monitoring", icon: Shield },
  { label: "Recruiters", href: "/admin/recruiters", icon: Building2 },
  { label: "Candidates", href: "/admin/candidates", icon: Users },
  { label: "DSA Problems", href: "/admin/dsa-problems", icon: Code },
  { label: "Aptitude Questions", href: "/admin/aptitude-questions", icon: BookOpen },
  { label: "AI Performance", href: "/admin/ai-performance", icon: Brain },
];

interface AdminStats {
  total_recruiters: number;
  total_candidates: number;
  active_sessions: number;
  abuse_alerts: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({
    total_recruiters: 0,
    total_candidates: 0,
    active_sessions: 0,
    abuse_alerts: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.error('Failed to fetch admin stats');
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems} title="ADMIN CONTROL CENTER">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Recruiters", value: stats.total_recruiters.toString(), icon: Building2 },
            { label: "Total Candidates", value: stats.total_candidates.toLocaleString(), icon: Users },
            { label: "Active Sessions", value: stats.active_sessions.toString(), icon: Activity },
            { label: "Abuse Alerts", value: stats.abuse_alerts.toString(), icon: AlertTriangle },
          ].map((s) => (
            <GlassCard key={s.label} variant="neon">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-display mt-1 text-foreground">
                    {isLoading ? "..." : s.value}
                  </p>
                </div>
                <s.icon className="w-8 h-8 text-primary opacity-40" />
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" /> System Logs
              </h3>
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20">
                Coming Soon
              </span>
            </div>
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                <Server className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm mb-2">Real-time System Monitoring</p>
              <p className="text-xs text-muted-foreground/70">
                Advanced logging and monitoring features are under development
              </p>
            </div>
          </GlassCard>

          <GlassCard variant="holographic" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" /> AI Model Performance
              </h3>
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20">
                Coming Soon
              </span>
            </div>
            <div className="py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                <Brain className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground text-sm mb-2">AI Performance Analytics</p>
              <p className="text-xs text-muted-foreground/70">
                ML model metrics and analytics dashboard is under development
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
