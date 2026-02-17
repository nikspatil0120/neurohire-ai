import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, Edit, Trash2, Plus } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Create Job", href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB", href: "/recruiter/questions", icon: Database },
  { label: "Rankings", href: "/recruiter/rankings", icon: Trophy },
  { label: "Messages", href: "/recruiter/messages", icon: MessageCircle },
  { label: "Logout", href: "/login", icon: LogOut },
];

const questions = [
  { q: "Explain microservices architecture", prereq: "REST APIs", advanced: "Event-driven design", difficulty: "Medium" },
  { q: "Implement a binary search tree", prereq: "Data Structures", advanced: "AVL Trees", difficulty: "Hard" },
  { q: "What is the CAP theorem?", prereq: "Distributed Systems", advanced: "Consensus algorithms", difficulty: "Hard" },
  { q: "Describe React's reconciliation", prereq: "Virtual DOM", advanced: "Fiber architecture", difficulty: "Medium" },
];

const QuestionDB = () => {
  return (
    <DashboardLayout navItems={navItems} title="QUESTION DATABASE">
      <div className="space-y-6">
        <div className="flex justify-end">
          <button className="px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm flex items-center gap-2 hover:bg-primary/20 transition-all">
            <Plus className="w-4 h-4" /> Add Question
          </button>
        </div>

        <GlassCard variant="neon" hover={false} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Question</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Prerequisite</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Advanced</th>
                <th className="text-left py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Difficulty</th>
                <th className="text-right py-3 px-4 text-xs text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, i) => (
                <tr key={i} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-4 text-foreground">{q.q}</td>
                  <td className="py-3 px-4 text-muted-foreground">{q.prereq}</td>
                  <td className="py-3 px-4 text-muted-foreground">{q.advanced}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${q.difficulty === "Hard" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-primary transition-colors"><Edit className="w-4 h-4" /></button>
                    <button className="p-1.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
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

export default QuestionDB;
