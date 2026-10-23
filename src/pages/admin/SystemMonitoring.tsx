import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNavItems";
import { 
  Camera, Monitor, Mic, Eye, AlertTriangle, Server, Database, Cpu, HardDrive, Activity, RefreshCw,
  CheckCircle, XCircle, Zap, Shield, Code, Brain
} from "lucide-react";

interface SystemHealth {
  status: string;
  database: {
    status: string;
    type: string;
  };
  system: {
    cpu_usage: string;
    memory_usage: string;
    memory_available: string;
    disk_usage: string;
    disk_free: string;
  };
  python_version: string;
  timestamp: string;
}

const securityFeatures = [
  { icon: Camera, label: "Camera Monitoring", status: "Active", desc: "Continuous face detection and tracking", color: "text-green-400" },
  { icon: Monitor, label: "Tab Switch Detection", status: "Active", desc: "Browser focus change monitoring", color: "text-green-400" },
  { icon: Eye, label: "Face Detection", status: "Active", desc: "Real-time facial presence verification", color: "text-green-400" },
  { icon: Mic, label: "Mic Detection", status: "Active", desc: "Audio input monitoring and analysis", color: "text-green-400" },
  { icon: AlertTriangle, label: "Warning System", status: "Armed", desc: "3-strike warning with auto-termination", color: "text-yellow-400" },
  { icon: Shield, label: "Data Encryption", status: "Active", desc: "AES-256 end-to-end encryption", color: "text-green-400" },
];

const SystemMonitoring = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    fetchSystemHealth();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      fetchSystemHealth();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/admin/system/health');
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
        setLastUpdated(new Date());
      } else {
        console.error('Failed to fetch system health');
      }
    } catch (error) {
      console.error('Error fetching system health:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSystemHealth();
  };

  const getUsageColor = (usage: string) => {
    const value = parseFloat(usage);
    if (value < 50) return "text-green-400";
    if (value < 80) return "text-yellow-400";
    return "text-red-400";
  };

  const getUsageBgColor = (usage: string) => {
    const value = parseFloat(usage);
    if (value < 50) return "bg-green-500/20";
    if (value < 80) return "bg-yellow-500/20";
    return "bg-red-500/20";
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV_ITEMS} title="SYSTEM MONITORING">
      <div className="space-y-6">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground mb-1">System Health Monitor</h2>
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

        {/* Overall Status */}
        <GlassCard variant="holographic" hover={false} className="text-center py-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Shield className={`w-16 h-16 pulse-glow ${systemHealth?.status === 'healthy' ? 'text-green-400' : 'text-yellow-400'}`} />
            <div className="text-left">
              <h2 className="font-display text-3xl tracking-wider text-foreground mb-1">
                {systemHealth?.status === 'healthy' ? 'ALL SYSTEMS OPERATIONAL' : 'SYSTEM CHECK REQUIRED'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {systemHealth?.status === 'healthy' 
                  ? 'Secure environment is active and monitoring all sessions' 
                  : 'Some services require attention'}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* System Resources */}
        {systemHealth && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard variant="neon" hover={true}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">CPU Usage</p>
                  <p className={`text-3xl font-display ${getUsageColor(systemHealth.system.cpu_usage)}`}>
                    {systemHealth.system.cpu_usage}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full ${getUsageBgColor(systemHealth.system.cpu_usage)} flex items-center justify-center`}>
                  <Cpu className={`w-6 h-6 ${getUsageColor(systemHealth.system.cpu_usage)}`} />
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="neon" hover={true}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Memory Usage</p>
                  <p className={`text-3xl font-display ${getUsageColor(systemHealth.system.memory_usage)}`}>
                    {systemHealth.system.memory_usage}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {systemHealth.system.memory_available} available
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full ${getUsageBgColor(systemHealth.system.memory_usage)} flex items-center justify-center`}>
                  <Activity className={`w-6 h-6 ${getUsageColor(systemHealth.system.memory_usage)}`} />
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="neon" hover={true}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Disk Usage</p>
                  <p className={`text-3xl font-display ${getUsageColor(systemHealth.system.disk_usage)}`}>
                    {systemHealth.system.disk_usage}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {systemHealth.system.disk_free} free
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full ${getUsageBgColor(systemHealth.system.disk_usage)} flex items-center justify-center`}>
                  <HardDrive className={`w-6 h-6 ${getUsageColor(systemHealth.system.disk_usage)}`} />
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="neon" hover={true}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Database</p>
                  <p className={`text-2xl font-display ${systemHealth.database.status === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                    {systemHealth.database.status === 'connected' ? 'Connected' : 'Disconnected'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {systemHealth.database.type}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-full ${systemHealth.database.status === 'connected' ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                  <Database className={`w-6 h-6 ${systemHealth.database.status === 'connected' ? 'text-green-400' : 'text-red-400'}`} />
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Services Status */}
        <GlassCard variant="neon" hover={false}>
          <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" /> Service Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { name: "API Server", status: "running", uptime: "99.9%", icon: Server },
              { name: "Database", status: systemHealth?.database.status === 'connected' ? "connected" : "disconnected", uptime: "99.8%", icon: Database },
              { name: "WebSocket Server", status: "active", uptime: "99.7%", icon: Zap },
              { name: "AI Services", status: "ready", uptime: "99.5%", icon: Brain },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${service.status === 'running' || service.status === 'active' || service.status === 'ready' || service.status === 'connected' ? 'bg-green-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                    <service.icon className={`w-5 h-5 ${service.status === 'running' || service.status === 'active' || service.status === 'ready' || service.status === 'connected' ? 'text-green-400' : 'text-red-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{service.name}</p>
                    <p className="text-xs text-muted-foreground">Uptime: {service.uptime}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  service.status === 'running' || service.status === 'active' || service.status === 'ready' || service.status === 'connected'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40'
                }`}>
                  {service.status === 'running' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {service.status === 'connected' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                  {service.status === 'disconnected' && <XCircle className="w-3 h-3 inline mr-1" />}
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Security Features */}
        <div>
          <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Security & Proctoring Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {securityFeatures.map((f) => (
              <GlassCard key={f.label} variant="neon" className="scan-line">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm text-foreground font-medium">{f.label}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        f.status === 'Active' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                          : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                      }`}>
                        {f.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* System Info */}
        {systemHealth && (
          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" /> System Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Python Version</p>
                <p className="text-sm font-medium text-foreground">{systemHealth.python_version}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Backend Status</p>
                <p className="text-sm font-medium text-green-400">Running</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Platform</p>
                <p className="text-sm font-medium text-foreground">FastAPI</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Last Health Check</p>
                <p className="text-sm font-medium text-foreground">{new Date(systemHealth.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SystemMonitoring;
