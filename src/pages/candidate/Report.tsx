import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Target, Building2, FileText, User, LogOut, TrendingUp, Star, Lightbulb, Briefcase } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Incoming Opportunities", href: "/candidate/incoming-opportunities", icon: Briefcase },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const scores = [
  { label: "Technical", value: 85, max: 100 },
  { label: "Communication", value: 72, max: 100 },
  { label: "Problem Solving", value: 90, max: 100 },
  { label: "Confidence", value: 78, max: 100 },
  { label: "Domain Knowledge", value: 68, max: 100 },
];

const Report = () => {
  return (
    <DashboardLayout navItems={navItems} title="PERFORMANCE REPORT">
      <div className="relative">
        {/* Blurred content for demonstration */}
        <div className="space-y-6 max-w-5xl blur-sm pointer-events-none opacity-50">
          {/* Score cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {scores.map((s) => (
              <GlassCard key={s.label} variant="neon" className="text-center">
                <p className="text-3xl font-display gradient-text mb-1">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </GlassCard>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar chart placeholder */}
            <GlassCard variant="neon" hover={false}>
              <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" /> Skill Radar
              </h3>
              <div className="aspect-square flex items-center justify-center relative">
                <svg viewBox="0 0 200 200" className="w-full max-w-[250px]">
                  {/* Pentagon grid */}
                  {[1, 0.75, 0.5, 0.25].map((scale, i) => (
                    <polygon
                      key={i}
                      points={scores.map((_, j) => {
                        const angle = (j * 2 * Math.PI) / 5 - Math.PI / 2;
                        return `${100 + 80 * scale * Math.cos(angle)},${100 + 80 * scale * Math.sin(angle)}`;
                      }).join(" ")}
                      fill="none"
                      stroke="hsl(185, 40%, 20%)"
                      strokeWidth="0.5"
                    />
                  ))}
                  {/* Data */}
                  <polygon
                    points={scores.map((s, j) => {
                      const angle = (j * 2 * Math.PI) / 5 - Math.PI / 2;
                      const r = (s.value / 100) * 80;
                      return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                    }).join(" ")}
                    fill="hsl(185, 100%, 50%, 0.15)"
                    stroke="hsl(185, 100%, 50%)"
                    strokeWidth="2"
                    className="drop-shadow-[0_0_6px_hsl(185_100%_50%/0.5)]"
                  />
                  {/* Labels */}
                  {scores.map((s, j) => {
                    const angle = (j * 2 * Math.PI) / 5 - Math.PI / 2;
                    return (
                      <text
                        key={j}
                        x={100 + 95 * Math.cos(angle)}
                        y={100 + 95 * Math.sin(angle)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-muted-foreground text-[8px]"
                      >
                        {s.label}
                      </text>
                    );
                  })}
                </svg>
              </div>
            </GlassCard>

            {/* Selection Probability */}
            <div className="space-y-6">
              <GlassCard variant="holographic" hover={false} className="text-center py-8">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Selection Probability</p>
                <div className="relative w-32 h-32 mx-auto">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(222, 30%, 14%)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke="hsl(185, 100%, 50%)"
                      strokeWidth="8"
                      strokeDasharray={`${79 * 2.64} ${264 - 79 * 2.64}`}
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_10px_hsl(185_100%_50%/0.6)]"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-3xl gradient-text">79%</span>
                  </div>
                </div>
              </GlassCard>

              {/* AI Suggestions */}
              <GlassCard variant="neon" hover={false}>
                <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" /> AI Suggestions
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Improve system design articulation with more structured answers</li>
                  <li className="flex gap-2"><TrendingUp className="w-4 h-4 text-secondary shrink-0 mt-0.5" /> Practice behavioral questions using the STAR method</li>
                  <li className="flex gap-2"><TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" /> Maintain consistent eye contact during video interviews</li>
                </ul>
              </GlassCard>
            </div>
          </div>
        </div>

        {/* Coming Soon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <GlassCard variant="neon" className="max-w-md mx-4">
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-display text-foreground mb-3">Performance Reports</h2>
              <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full border border-primary/20 mb-4">
                Coming Soon
              </span>
              <p className="text-sm text-muted-foreground mb-6">
                Advanced AI-powered performance analytics and personalized recommendations will be available soon. This feature will provide detailed insights into your interview performance.
              </p>
              <div className="text-xs text-muted-foreground/70">
                Mock UI for Demonstration Purposes
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Report;
