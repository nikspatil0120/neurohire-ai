import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard,
  Target,
  Building2,
  FileText,
  User,
  LogOut,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Code2,
  BrainCircuit,
  Calendar,
  Sparkles,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { useProfile } from "@/contexts/ProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import InterviewCalendarCard from "@/components/candidate/InterviewCalendarCard";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Incoming Opportunities", href: "/candidate/incoming-opportunities", icon: Briefcase },
  { label: "Messages", href: "/candidate/messages", icon: MessageCircle },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  applied: { label: "Applied", badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  test_pending: { label: "Test Pending", badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  test_started: { label: "In Progress", badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  test_completed: { label: "Test Completed", badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  interview_pending: { label: "Interview Pending", badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
  interview_completed: { label: "Interview Completed", badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
  selected: { label: "Selected 🎉", badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  rejected: { label: "Rejected", badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
  offer_sent: { label: "Offer Received 📬", badgeClass: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  offer_accepted: { label: "Offer Accepted 🎉", badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
  offer_rejected: { label: "Offer Declined", badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
};

interface ApplicationSummary {
  _id: string;
  job_id: string;
  job_title: string;
  organization_name: string;
  application_status: string;
  current_round?: string;
  slot_date?: string;
  slot_start_time?: string;
  applied_at?: string;
}

const CandidateDashboard = () => {
  const { profileCompletion } = useProfile();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadApplications = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`${API}/applications/candidate/${user.id}`);
        if (!res.ok) throw new Error("Failed to load applications");
        const data = await res.json();
        if (isMounted) {
          setApplications(data.applications || []);
        }
      } catch (err) {
        console.warn("Could not fetch candidate applications:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadApplications();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const firstName = user?.name ? user.name.split(" ")[0] : "Candidate";

  // Filter real actionable stats
  const activeApplications = applications.filter((app) => app.application_status !== "rejected");
  const pendingActions = applications.filter((app) =>
    ["test_pending", "test_started", "interview_pending"].includes(app.application_status)
  );
  const nextAction = pendingActions[0] || null;
  const acceptedApp = applications.find(a => a.application_status === "offer_accepted");
  const hasAcceptedOffer = Boolean(acceptedApp);
  const acceptedCompanyName = acceptedApp?.organization_name || acceptedApp?.job_title || "your hiring company";

  return (
    <DashboardLayout navItems={navItems} title="DASHBOARD">
      <div className="space-y-6 w-full pb-10">
        {/* Recruiter Messenger Active Alert Banner */}
        {hasAcceptedOffer && (
          <GlassCard variant="neon" className="p-4 bg-gradient-to-r from-emerald-500/10 via-primary/10 to-teal-500/10 border-emerald-500/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Recruiter Messenger Active
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                      OFFER ACCEPTED
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your 1-on-1 communication channel with your recruiter at <strong className="text-foreground">{acceptedCompanyName}</strong> is active.
                  </p>
                </div>
              </div>
              <Link
                to="/candidate/messages"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] self-start sm:self-auto"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Open Recruiter Chat
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </GlassCard>
        )}

        {/* Next Action / Hero Banner */}
        {nextAction ? (
          <GlassCard variant="neon" className="relative overflow-hidden p-6 border-primary/40 bg-gradient-to-r from-primary/10 via-card/70 to-card/90">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
                  Action Required
                </div>
                <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground tracking-wide">
                  {nextAction.job_title} at {nextAction.organization_name || "Hiring Company"}
                </h2>
                <p className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span>Round: <strong className="text-foreground capitalize">{nextAction.current_round || "Assessment"}</strong></span>
                  {nextAction.slot_date && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {nextAction.slot_date} {nextAction.slot_start_time ? `• ${nextAction.slot_start_time}` : ""}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/candidate/interviews")}
                  className="px-5 py-2.5 rounded-lg font-medium text-sm text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-md shadow-primary/25 flex items-center gap-2"
                >
                  Go to Assessment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </GlassCard>
        ) : (
          <GlassCard variant="default" className="p-6 border-border/40 bg-card/60 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-primary font-medium text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Welcome back, {firstName}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-display font-semibold text-foreground">
                  You're all caught up!
                </h2>
                <p className="text-sm text-muted-foreground">
                  No tests are pending right now. Strengthen your profile or solve practice problems to stay ready.
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Link
                  to="/candidate/incoming-opportunities"
                  className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground border border-border/60 hover:border-border transition-colors flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  Explore Roles
                </Link>
                <Link
                  to="/candidate/practice"
                  className="px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-all flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  Practice Mode
                </Link>
              </div>
            </div>
          </GlassCard>
        )}

        {/* 3 Real Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Active Applications */}
          <GlassCard
            variant="default"
            onClick={() => navigate("/candidate/interviews")}
            className="hover:border-primary/40 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Applications</p>
                <p className="text-3xl font-display font-bold mt-1.5 text-foreground">{activeApplications.length}</p>
                <p className="text-xs text-muted-foreground mt-1">In hiring pipelines</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Briefcase className="w-6 h-6" />
              </div>
            </div>
          </GlassCard>

          {/* Pending Action Required */}
          <GlassCard
            variant="default"
            onClick={() => navigate("/candidate/interviews")}
            className="hover:border-amber-500/40 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Action Required</p>
                <p className="text-3xl font-display font-bold mt-1.5 text-foreground">
                  {pendingActions.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingActions.length === 0 ? "All tests up to date" : "Tests awaiting completion"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </GlassCard>

          {/* Profile Completion */}
          <GlassCard
            variant="default"
            onClick={() => navigate("/candidate/profile")}
            className="hover:border-primary/40 cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Profile Readiness</p>
                <p className="text-3xl font-display font-bold mt-1.5 text-foreground">{profileCompletion}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profileCompletion === 100 ? "Ready for recruiters" : "Tap to complete sections"}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, profileCompletion))}%` }}
              />
            </div>
          </GlassCard>
        </div>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 Cols): Applications & Pipeline + Practice Hub */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard variant="default" className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Interview Pipeline & Applications
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Track your current company evaluations and tests
                  </p>
                </div>
                {applications.length > 0 && (
                  <Link
                    to="/candidate/interviews"
                    className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  >
                    View all ({applications.length})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-muted/20 animate-pulse border border-border/30" />
                  ))}
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-border/60 bg-muted/5">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary mb-3">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-semibold text-foreground">No applications in progress</h4>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-5">
                    You haven't been scheduled for company interviews yet. Check open positions or practice your technical skills.
                  </p>
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <Link
                      to="/candidate/incoming-opportunities"
                      className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Browse Opportunities
                    </Link>
                    <Link
                      to="/candidate/practice"
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-foreground border border-border hover:bg-muted/30 transition-colors"
                    >
                      Practice Mode
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {applications.slice(0, 5).map((app) => {
                    const statusInfo = STATUS_CONFIG[app.application_status] || {
                      label: app.application_status || "Applied",
                      badgeClass: "bg-muted/30 text-muted-foreground border-border/40",
                    };
                    const isPending = ["test_pending", "interview_pending", "test_started"].includes(
                      app.application_status
                    );

                    return (
                      <div
                        key={app._id}
                        className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <h4 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">
                              {app.job_title}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusInfo.badgeClass}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>{app.organization_name || "Company"}</span>
                            {app.current_round && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{app.current_round}</span>
                              </>
                            )}
                            {app.slot_date && (
                              <>
                                <span>•</span>
                                <span className="text-foreground/80">{app.slot_date}</span>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          {app.application_status === "offer_accepted" ? (
                            <Link
                              to="/candidate/messages"
                              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all flex items-center gap-1.5"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              Chat with Recruiter
                            </Link>
                          ) : app.application_status === "interview_completed" ? (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-medium text-purple-400 bg-purple-500/10 border border-purple-500/30 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Under Review
                            </span>
                          ) : isPending ? (
                            <Link
                              to="/candidate/interviews"
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-all flex items-center gap-1.5"
                            >
                              Take Action
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <Link
                              to="/candidate/interviews"
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border/60 hover:border-border transition-colors flex items-center gap-1"
                            >
                              Details
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Practice & Preparation Hub - Repositioned to Left Column */}
            <GlassCard variant="default" className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                    <BrainCircuit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Practice & Preparation Hub</h3>
                    <p className="text-xs text-muted-foreground">Master coding algorithms and mock tests ahead of interviews</p>
                  </div>
                </div>
                <Link
                  to="/candidate/practice"
                  className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
                >
                  Full Practice Lab
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Technical Coding */}
                <Link
                  to="/candidate/problem-list"
                  className="p-3.5 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/20 hover:border-primary/40 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      Technical Coding
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">LeetCode & DSA challenges</p>
                  </div>
                </Link>

                {/* Aptitude & Logic */}
                <Link
                  to="/candidate/aptitude-test"
                  className="p-3.5 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/20 hover:border-secondary/40 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-105 transition-transform">
                      <Target className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-secondary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground group-hover:text-secondary transition-colors">
                      Aptitude & Logic
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Timed reasoning & MCQs</p>
                  </div>
                </Link>

                {/* AI Mock Interview */}
                <Link
                  to="/candidate/interview-room"
                  className="p-3.5 rounded-xl border border-border/60 bg-muted/10 hover:bg-muted/20 hover:border-primary/40 transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                      <BrainCircuit className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                      AI Mock Interview
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Simulate voice & behavioral Q&A</p>
                  </div>
                </Link>
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Calendar & Schedule (1 Col) */}
          <div className="space-y-6">
            <InterviewCalendarCard applications={applications} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CandidateDashboard;

