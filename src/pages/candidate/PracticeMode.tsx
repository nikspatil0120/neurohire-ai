import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Target, Building2, FileText, User, LogOut, Brain, Code, Calculator, ArrowRight, Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Incoming Opportunities", href: "/candidate/incoming-opportunities", icon: Briefcase },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const modes = [
  {
    icon: Calculator,
    title: "Aptitude Round",
    desc: "Logical reasoning, quantitative aptitude, and verbal ability questions",
    // difficulty: "Medium",
    href: "/candidate/aptitude-test",
    color: "primary" as const,
    comingSoon: false,
  },
  {
    icon: Code,
    title: "Technical Coding",
    desc: "Data structures, algorithms, and system design challenges",
    //difficulty: "Hard",
    href: "/candidate/problem-list",
    color: "secondary" as const,
    comingSoon: false,
  },
  {
    icon: Brain,
    title: "AI Interview",
    desc: "Real-time AI-powered interview with emotion and voice analysis",
    difficulty: "Adaptive",
    href: "#",
    color: "primary" as const,
    comingSoon: true,
  },
];

const PracticeMode = () => {
  return (
    <DashboardLayout navItems={navItems} title="PRACTICE MODE">
      <div className="max-w-4xl mx-auto">
        <p className="text-muted-foreground mb-8">Choose a practice round to sharpen your skills</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((mode) => (
            mode.comingSoon ? (
              <div key={mode.title}>
                <GlassCard variant={mode.color === "secondary" ? "purple" : "neon"} className="h-full relative opacity-75">
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20">
                      Coming Soon
                    </span>
                  </div>
                  <mode.icon className={`w-10 h-10 mb-4 ${mode.color === "secondary" ? "text-secondary" : "text-primary"}`} />
                  <h3 className="text-foreground font-semibold text-lg mb-2">{mode.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{mode.desc}</p>

                  {/* <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>Difficulty: <span className={mode.color === "secondary" ? "text-secondary" : "text-primary"}>{mode.difficulty}</span></span>
                  </div> */}

                  {/* Difficulty bar */}
                  {/* <div className="h-1 rounded-full bg-muted/50 mb-4">
                    <div
                      className={`h-full rounded-full ${mode.color === "secondary" ? "bg-secondary" : "bg-primary"}`}
                    />
                  </div> */}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-8">
                    Available Soon
                  </div>
                </GlassCard>
              </div>
            ) : (
              <Link key={mode.title} to={mode.href}>
                <GlassCard variant={mode.color === "secondary" ? "purple" : "neon"} className="h-full group cursor-pointer">
                  <mode.icon className={`w-10 h-10 mb-4 ${mode.color === "secondary" ? "text-secondary" : "text-primary"}`} />
                  <h3 className="text-foreground font-semibold text-lg mb-2">{mode.title}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{mode.desc}</p>

                  {/* <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>Difficulty: <span className={mode.color === "secondary" ? "text-secondary" : "text-primary"}>{mode.difficulty}</span></span>
                  </div> */}

                  {/* Difficulty bar */}
                  {/* <div className="h-1 rounded-full bg-muted/50 mb-4">
                    <div
                      className={`h-full rounded-full ${mode.color === "secondary" ? "bg-secondary" : "bg-primary"}`}
                      style={{ width: mode.difficulty === "Hard" ? "80%" : mode.difficulty === "Medium" ? "50%" : "60%" }}
                    />
                  </div> */}

                  <div className="flex items-center gap-2 text-sm text-primary group-hover:gap-3 transition-all mt-8">
                    Start <ArrowRight className="w-4 h-4" />
                  </div>
                </GlassCard>
              </Link>
            )
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PracticeMode;
