import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNavItems";
import {
  Brain,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Zap,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Users,
  FileText,
} from "lucide-react";

interface AIMetrics {
  total_interviews: number;
  avg_accuracy: number;
  avg_response_time: number;
  questions_generated: number;
  answers_evaluated: number;
  emotions_detected: number;
  model_uptime: number;
}

interface AIPerformanceData {
  metrics: AIMetrics;
  models: Array<{
    name: string;
    status: string;
    accuracy: number;
    uptime: number;
  }>;
  recent_sessions: Array<{
    id: string;
    candidate: string;
    duration: string;
    accuracy: number;
    timestamp: string;
  }>;
}

const AIPerformance = () => {
  const [data, setData] = useState<AIPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchAIPerformance();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchAIPerformance();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAIPerformance = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/admin/ai-performance");
      if (response.ok) {
        const data = await response.json();
        setData(data);
        setLastUpdated(new Date());
      } else if (response.status === 404) {
        // API endpoint doesn't exist yet, use mock data
        setData(getMockData());
        setLastUpdated(new Date());
      } else {
        console.error("Failed to fetch AI performance data");
      }
    } catch (error) {
      console.error("Error fetching AI performance:", error);
      // Use mock data for demo
      setData(getMockData());
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getMockData = (): AIPerformanceData => {
    return {
      metrics: {
        total_interviews: 245,
        avg_accuracy: 87.5,
        avg_response_time: 2.3,
        questions_generated: 1250,
        answers_evaluated: 1180,
        emotions_detected: 945,
        model_uptime: 99.8,
      },
      models: [
        {
          name: "GPT-4 Interview Engine",
          status: "Active",
          accuracy: 92.3,
          uptime: 99.9,
        },
        {
          name: "Face Recognition V3",
          status: "Active",
          accuracy: 96.1,
          uptime: 99.7,
        },
        {
          name: "Speech Analysis",
          status: "Active",
          accuracy: 84.2,
          uptime: 99.5,
        },
        {
          name: "Emotion Detection",
          status: "Active",
          accuracy: 89.7,
          uptime: 99.8,
        },
      ],
      recent_sessions: [
        {
          id: "sess_001",
          candidate: "John Doe",
          duration: "15m 23s",
          accuracy: 91,
          timestamp: "2 hours ago",
        },
        {
          id: "sess_002",
          candidate: "Jane Smith",
          duration: "12m 45s",
          accuracy: 88,
          timestamp: "3 hours ago",
        },
        {
          id: "sess_003",
          candidate: "Mike Johnson",
          duration: "18m 10s",
          accuracy: 95,
          timestamp: "5 hours ago",
        },
        {
          id: "sess_004",
          candidate: "Sarah Williams",
          duration: "14m 30s",
          accuracy: 82,
          timestamp: "7 hours ago",
        },
        {
          id: "sess_005",
          candidate: "Alex Brown",
          duration: "16m 55s",
          accuracy: 89,
          timestamp: "9 hours ago",
        },
      ],
    };
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAIPerformance();
  };

  if (isLoading || !data) {
    return (
      <DashboardLayout navItems={ADMIN_NAV_ITEMS} title="ADMIN CONTROL CENTER">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Brain className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading AI performance metrics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={ADMIN_NAV_ITEMS} title="ADMIN CONTROL CENTER">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground mb-1">AI Performance Analytics</h2>
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Interviews",
              value: data.metrics.total_interviews.toString(),
              icon: Users,
              color: "text-blue-400",
              bgColor: "bg-blue-500/10",
            },
            {
              label: "Avg Accuracy",
              value: `${data.metrics.avg_accuracy.toFixed(1)}%`,
              icon: Target,
              color: "text-green-400",
              bgColor: "bg-green-500/10",
            },
            {
              label: "Response Time",
              value: `${data.metrics.avg_response_time.toFixed(1)}s`,
              icon: Clock,
              color: "text-cyan-400",
              bgColor: "bg-cyan-500/10",
            },
            {
              label: "Model Uptime",
              value: `${data.metrics.model_uptime.toFixed(1)}%`,
              icon: CheckCircle,
              color: "text-purple-400",
              bgColor: "bg-purple-500/10",
            },
          ].map((metric) => (
            <GlassCard key={metric.label} variant="neon" hover={true}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {metric.label}
                  </p>
                  <p className={`text-3xl font-display ${metric.color}`}>
                    {metric.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full ${metric.bgColor} flex items-center justify-center`}>
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: "Questions Generated",
              value: data.metrics.questions_generated.toString(),
              icon: FileText,
              color: "text-orange-400",
            },
            {
              label: "Answers Evaluated",
              value: data.metrics.answers_evaluated.toString(),
              icon: CheckCircle,
              color: "text-emerald-400",
            },
            {
              label: "Emotions Detected",
              value: data.metrics.emotions_detected.toString(),
              icon: Activity,
              color: "text-pink-400",
            },
          ].map((metric) => (
            <GlassCard key={metric.label} variant="holographic" hover={true}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                    {metric.label}
                  </p>
                  <p className={`text-2xl font-display ${metric.color}`}>
                    {metric.value}
                  </p>
                </div>
                <metric.icon className={`w-8 h-8 ${metric.color} opacity-60`} />
              </div>
            </GlassCard>
          ))}
        </div>

        {/* AI Models Status */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-foreground font-semibold">AI Models Status</h3>
          </div>
          <div className="space-y-3">
            {data.models.map((model) => (
              <div
                key={model.name}
                className="p-4 bg-muted/20 rounded-lg border border-border/30 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-foreground font-medium">{model.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: <span className="text-green-400">{model.status}</span>
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
                    <div className="w-full bg-muted/40 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2 rounded-full"
                        style={{ width: `${model.accuracy}%` }}
                      />
                    </div>
                    <p className="text-sm text-blue-400 font-medium mt-1">
                      {model.accuracy.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Uptime</p>
                    <div className="w-full bg-muted/40 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full"
                        style={{ width: `${model.uptime}%` }}
                      />
                    </div>
                    <p className="text-sm text-green-400 font-medium mt-1">
                      {model.uptime.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Recent Sessions */}
        <GlassCard variant="holographic" hover={false}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-foreground font-semibold">Recent Interview Sessions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    Candidate
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    Duration
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    Accuracy
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recent_sessions.map((session) => (
                  <tr
                    key={session.id}
                    className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-foreground">{session.candidate}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{session.duration}</td>
                    <td className="py-3 px-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.accuracy >= 90
                            ? "bg-green-500/20 text-green-400"
                            : session.accuracy >= 80
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {session.accuracy}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">{session.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Performance Insights */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-foreground font-semibold">Performance Insights</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h4 className="text-blue-400 font-medium mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                High Performance
              </h4>
              <p className="text-sm text-muted-foreground">
                AI models are operating at peak efficiency with {data.metrics.avg_accuracy.toFixed(1)}% average accuracy.
              </p>
            </div>
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <h4 className="text-green-400 font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                System Stable
              </h4>
              <p className="text-sm text-muted-foreground">
                All services are running smoothly with {data.metrics.model_uptime.toFixed(1)}% uptime maintained.
              </p>
            </div>
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <h4 className="text-cyan-400 font-medium mb-2 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Quick Response
              </h4>
              <p className="text-sm text-muted-foreground">
                Average response time of {data.metrics.avg_response_time.toFixed(1)}s ensures smooth user experience.
              </p>
            </div>
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <h4 className="text-purple-400 font-medium mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Healthy Throughput
              </h4>
              <p className="text-sm text-muted-foreground">
                Processing {data.metrics.questions_generated} questions with {data.metrics.answers_evaluated} evaluations daily.
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default AIPerformance;
