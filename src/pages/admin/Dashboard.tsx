import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Shield, Users, Building2, Activity, AlertTriangle, Brain, Server } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "System Monitor", href: "/admin/monitoring", icon: Shield },
  { label: "Recruiters", href: "/admin/dashboard", icon: Building2 },
  { label: "Candidates", href: "/admin/dashboard", icon: Users },
  { label: "AI Performance", href: "/admin/dashboard", icon: Brain },
];

const AdminDashboard = () => {
  return (
    <DashboardLayout navItems={navItems} title="ADMIN CONTROL CENTER">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Recruiters", value: "24", icon: Building2 },
            { label: "Total Candidates", value: "1,284", icon: Users },
            { label: "Active Sessions", value: "18", icon: Activity },
            { label: "Abuse Alerts", value: "2", icon: AlertTriangle },
          ].map((s) => (
            <GlassCard key={s.label} variant="neon">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-display mt-1 text-foreground">{s.value}</p>
                </div>
                <s.icon className="w-8 h-8 text-primary opacity-40" />
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" /> System Logs
            </h3>
            <div className="space-y-2 font-mono text-xs max-h-60 overflow-auto scrollbar-hidden">
              {[
                { time: "14:32:01", msg: "Interview session #482 started", type: "info" },
                { time: "14:31:45", msg: "Tab switch detected - User #1284", type: "warn" },
                { time: "14:30:12", msg: "AI model latency: 124ms", type: "info" },
                { time: "14:29:58", msg: "Face not detected - Warning issued", type: "warn" },
                { time: "14:28:33", msg: "Session #481 completed successfully", type: "info" },
                { time: "14:27:11", msg: "New recruiter registered", type: "info" },
              ].map((log, i) => (
                <div key={i} className="flex gap-3 p-2 rounded bg-muted/10">
                  <span className="text-muted-foreground">{log.time}</span>
                  <span className={log.type === "warn" ? "text-destructive" : "text-foreground"}>{log.msg}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard variant="holographic" hover={false}>
            <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" /> AI Model Performance
            </h3>
            <div className="space-y-4">
              {[
                { label: "Accuracy", value: 94 },
                { label: "Response Time", value: 87 },
                { label: "User Satisfaction", value: 91 },
                { label: "Uptime", value: 99 },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="text-primary font-mono">{m.value}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/30">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary" style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
