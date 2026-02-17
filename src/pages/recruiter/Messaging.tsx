import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Create Job", href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB", href: "/recruiter/questions", icon: Database },
  { label: "Rankings", href: "/recruiter/rankings", icon: Trophy },
  { label: "Messages", href: "/recruiter/messages", icon: MessageCircle },
  { label: "Logout", href: "/login", icon: LogOut },
];

const contacts = [
  { name: "Sarah Chen", last: "Thank you for the opportunity!", time: "2m ago", unread: true },
  { name: "Alex Kumar", last: "I've completed the assessment", time: "1h ago", unread: false },
  { name: "Maria Garcia", last: "When is the next round?", time: "3h ago", unread: true },
];

const messages = [
  { from: "them", text: "Hi, I wanted to follow up on my interview.", time: "10:30 AM" },
  { from: "me", text: "Thanks for reaching out! Your performance was excellent.", time: "10:32 AM" },
  { from: "them", text: "Thank you for the opportunity!", time: "10:33 AM" },
];

const Messaging = () => {
  return (
    <DashboardLayout navItems={navItems} title="MESSAGES">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
        {/* Contacts */}
        <GlassCard variant="neon" hover={false} className="overflow-auto">
          <div className="space-y-2">
            {contacts.map((c, i) => (
              <div key={i} className={cn("p-3 rounded-lg cursor-pointer transition-all", i === 0 ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/20")}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-xs font-bold text-foreground">{c.name[0]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <p className="text-sm text-foreground font-medium">{c.name}</p>
                      <span className="text-xs text-muted-foreground">{c.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.last}</p>
                  </div>
                  {c.unread && <div className="w-2 h-2 rounded-full bg-primary" />}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Chat */}
        <GlassCard variant="neon" hover={false} className="lg:col-span-2 flex flex-col">
          <div className="border-b border-border/30 pb-3 mb-4">
            <p className="text-foreground font-medium">Sarah Chen</p>
            <p className="text-xs text-muted-foreground">Sr. Frontend Developer</p>
          </div>

          <div className="flex-1 space-y-4 overflow-auto mb-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[70%] px-4 py-2 rounded-lg text-sm",
                  m.from === "me" ? "bg-primary/20 text-foreground neon-border" : "bg-muted/30 text-foreground"
                )}>
                  <p>{m.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input placeholder="Type a message..." className="flex-1 px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" />
            <button className="px-4 py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground hover:shadow-[0_0_20px_hsl(185_100%_50%/0.3)] transition-all">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default Messaging;
