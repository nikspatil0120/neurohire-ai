import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNavItems";
import { 
  Activity, RefreshCw, TrendingUp, FileText, CheckCircle, Clock, 
  Briefcase, Users, Building2, Code, BookOpen 
} from "lucide-react";

interface AdminStats {
  total_recruiters: number;
  total_candidates: number;
  total_admins: number;
  total_jobs: number;
  published_jobs: number;
  total_applications: number;
  pending_applications: number;
  selected_applications: number;
  total_problems: number;
  total_aptitude_questions: number;
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
    total_jobs: 0,
    published_jobs: 0,
    total_applications: 0,
    pending_applications: 0,
    selected_applications: 0,
    total_problems: 0,
    total_aptitude_questions: 0
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

  // Original, database-backed metrics
  const originalMetrics = [
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
      label: "Total Jobs", 
      value: stats.total_jobs.toString(), 
      icon: Briefcase,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10"
    },
    { 
      label: "Published Jobs", 
      value: stats.published_jobs.toString(), 
      icon: CheckCircle,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10"
    },
    { 
      label: "Total Applications", 
      value: stats.total_applications.toLocaleString(), 
      icon: FileText,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10"
    },
    { 
      label: "Pending Review", 
      value: stats.pending_applications.toString(), 
      icon: Clock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10"
    },
    { 
      label: "DSA Problems", 
      value: stats.total_problems.toString(), 
      icon: Code,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10"
    },
    { 
      label: "Aptitude Questions", 
      value: stats.total_aptitude_questions.toString(), 
      icon: BookOpen,
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10"
    },
  ];

  return (
    <DashboardLayout navItems={ADMIN_NAV_ITEMS} title="ADMIN CONTROL CENTER">
      <div className="space-y-6">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground mb-1">Dashboard Overview</h2>
            <p className="text-sm text-muted-foreground">
              Real-time platform metrics • Last updated: {lastUpdated.toLocaleTimeString()}
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

        {/* Original Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {originalMetrics.map((s) => (
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

        {/* Recent Activity */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Recent Activity
            </h3>
            <span className="text-xs text-muted-foreground">
              Latest platform events
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
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
