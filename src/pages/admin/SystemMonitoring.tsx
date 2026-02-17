import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Shield, Users, Building2, Brain, Camera, Monitor, Mic, Eye, AlertTriangle } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "System Monitor", href: "/admin/monitoring", icon: Shield },
  { label: "Recruiters", href: "/admin/dashboard", icon: Building2 },
  { label: "Candidates", href: "/admin/dashboard", icon: Users },
  { label: "AI Performance", href: "/admin/dashboard", icon: Brain },
];

const securityFeatures = [
  { icon: Camera, label: "Camera Monitoring", status: "Active", desc: "Continuous face detection and tracking" },
  { icon: Monitor, label: "Tab Switch Detection", status: "Active", desc: "Browser focus change monitoring" },
  { icon: Eye, label: "Face Detection", status: "Active", desc: "Real-time facial presence verification" },
  { icon: Mic, label: "Mic Detection", status: "Active", desc: "Audio input monitoring and analysis" },
  { icon: AlertTriangle, label: "Warning System", status: "Armed", desc: "3-strike warning with auto-termination" },
  { icon: Shield, label: "Data Encryption", status: "Active", desc: "AES-256 end-to-end encryption" },
];

const SystemMonitoring = () => {
  return (
    <DashboardLayout navItems={navItems} title="SYSTEM MONITORING">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {securityFeatures.map((f) => (
            <GlassCard key={f.label} variant="neon" className="scan-line">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm text-foreground font-medium">{f.label}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{f.status}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <GlassCard variant="holographic" hover={false} className="text-center py-12">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4 pulse-glow" />
          <h2 className="font-display text-2xl tracking-wider text-foreground mb-2">ALL SYSTEMS OPERATIONAL</h2>
          <p className="text-muted-foreground text-sm">Secure environment is active and monitoring all sessions</p>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default SystemMonitoring;
