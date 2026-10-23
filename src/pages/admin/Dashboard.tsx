import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNavItems";
import { 
  LayoutDashboard, Activity, AlertTriangle, Brain, Server, RefreshCw, TrendingUp, FileText, CheckCircle, Clock, Briefcase, Users, Building2
} from "lucide-react";

interface AdminStats {
  total_recruiters: number;
  total_candidates: number;
  total_admins: number;
  active_sessions: number;
  abuse_alerts: number;
  total_jobs: number;
  published_jobs: number;
  total_applications: number;
  pending_applications: number;
}

interface RecentActivity {
  type: string;
  description: string;
  timestamp: string;
  icon: string;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats>({
    total_recruiters: 0,
    total_candidates: 0,
    total_admins: 0,
    active_sessions: 0,
    abuse_alerts: 0,
    total_jobs: 0,
    published_jobs: 0,
    total_applications: 0,
    pending_applications: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentActivity();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setLastUpdated(new Date());
      } else {
        console.error('Failed to fetch admin stats');
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/admin/recent-activity?limit=10');
      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchStats(), fetchRecentActivity()]);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV_ITEMS} title="ADMIN CONTROL CENTER">
      <div className="space-y-6">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground mb-1">Dashboard Overview</h2>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: "Total Recruiters", 
              value: stats.total_recruiters.toString(), 
              icon: Building2,
              color: "text-blue-400",
              bgColor: "bg-blue-500/10"
            },
            { 
              label: "Total Candidates", 
              value: stats.total_candidates.toLocaleString(), 
              icon: Users,
              color: "text-green-400",
              bgColor: "bg-green-500/10"
            },
            { 
              label: "Active Sessions", 
              value: stats.active_sessions.toString(), 
              icon: Activity,
              color: "text-purple-400",
              bgColor: "bg-purple-500/10"
            },
            { 
              label: "Abuse Alerts", 
              value: stats.abuse_alerts.toString(), 
              icon: AlertTriangle,
              color: stats.abuse_alerts > 0 ? "text-red-400" : "text-gray-400",
              bgColor: stats.abuse_alerts > 0 ? "bg-red-500/10" : "bg-gray-500/10"
            },
          ].map((s) => (
            <GlassCard key={s.label} variant="neon" hover={true}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`text-3xl font-display ${s.color}`}>
                    {isLoading ? "..." : s.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full ${s.bgColor} flex items-center justify-center`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { 
              label: "Total Jobs", 
              value: stats.total_jobs.toString(), 
              icon: Briefcase,
              color: "text-cyan-400"
            },
            { 
              label: "Published Jobs", 
              value: stats.published_jobs.toString(), 
              icon: CheckCircle,
              color: "text-green-400"
            },
            { 
              label: "Total Applications", 
              value: stats.total_applications.toLocaleString(), 
              icon: FileText,
              color: "text-orange-400"
            },
            { 
              label: "Pending Review", 
              value: stats.pending_applications.toString(), 
              icon: Clock,
              color: "text-yellow-400"
            },
          ].map((s) => (
            <GlassCard key={s.label} variant="neon" hover={true}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className={`text-2xl font-display mt-1 ${s.color}`}>
                    {isLoading ? "..." : s.value}
                  </p>
                </div>
                <s.icon className={`w-6 h-6 ${s.color} opacity-60`} />
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Recent Activity
              </h3>
              <span className="text-xs text-muted-foreground">
                Last 10 activities
              </span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      {activity.icon === 'user-plus' && <Users className="w-4 h-4 text-primary" />}
                      {activity.icon === 'briefcase' && <Briefcase className="w-4 h-4 text-primary" />}
                      {activity.icon === 'file-text' && <FileText className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTimestamp(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* System Status */}
          <GlassCard variant="holographic" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" /> System Status
              </h3>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/40">
                ● Operational
              </span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Database", status: "Connected", color: "text-green-400" },
                { label: "API Server", status: "Running", color: "text-green-400" },
                { label: "WebSocket", status: "Active", color: "text-green-400" },
                { label: "AI Services", status: "Ready", color: "text-green-400" }
              ].map((service) => (
                <div key={service.label} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                  <span className="text-sm text-muted-foreground">{service.label}</span>
                  <span className={`text-sm font-medium ${service.color}`}>{service.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border/30">
              <a 
                href="/admin/monitoring" 
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 font-medium"
              >
                View detailed monitoring →
              </a>
            </div>
          </GlassCard>
        </div>

        {/* Quick Stats Summary */}
        <GlassCard variant="neon" hover={false}>
          <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-primary" /> Platform Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.total_recruiters + stats.total_candidates}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Users</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {stats.published_jobs > 0 ? Math.round((stats.total_applications / stats.published_jobs) * 100) / 100 : 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Avg Apps/Job</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {stats.total_applications > 0 ? Math.round((stats.pending_applications / stats.total_applications) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pending Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {stats.total_candidates > 0 ? Math.round((stats.active_sessions / stats.total_candidates) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Active Users</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
