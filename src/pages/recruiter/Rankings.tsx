import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, Eye } from "lucide-react";
import { Link } from "react-router-dom";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Create Job", href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB", href: "/recruiter/questions", icon: Database },
  { label: "Rankings", href: "/recruiter/rankings", icon: Trophy },
  { label: "Messages", href: "/recruiter/messages", icon: MessageCircle },
  { label: "Logout", href: "/login", icon: LogOut },
];

const candidates = [
  { rank: 1, name: "Sarah Chen", tech: 92, confidence: 88, overall: 92 },
  { rank: 2, name: "Alex Kumar", tech: 88, confidence: 85, overall: 88 },
  { rank: 3, name: "Maria Garcia", tech: 85, confidence: 90, overall: 85 },
  { rank: 4, name: "James Wilson", tech: 80, confidence: 75, overall: 78 },
  { rank: 5, name: "Priya Patel", tech: 78, confidence: 82, overall: 76 },
];

const Rankings = () => {
  return (
    <DashboardLayout navItems={navItems} title="CANDIDATE RANKINGS">
      <div className="space-y-6">
        <GlassCard variant="neon" hover={false} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Rank</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Candidate</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Technical</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Confidence</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Overall</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Report</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.rank} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-display text-primary">{`#${c.rank}`}</span>
                  </td>
                  <td className="py-3 px-4 text-foreground font-medium">{c.name}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted/30"><div className="h-full rounded-full bg-primary" style={{ width: `${c.tech}%` }} /></div>
                      <span className="text-xs text-muted-foreground">{c.tech}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted/30"><div className="h-full rounded-full bg-secondary" style={{ width: `${c.confidence}%` }} /></div>
                      <span className="text-xs text-muted-foreground">{c.confidence}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4"><span className="font-display gradient-text">{c.overall}</span></td>
                  <td className="py-3 px-4 text-right">
                    <button className="p-2 rounded-lg hover:bg-muted/30 text-primary transition-colors"><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default Rankings;
