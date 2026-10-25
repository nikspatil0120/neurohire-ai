import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import { CheckCircle2, XCircle, MessageCircle, ArrowRight, Loader2, Sparkles, Building2, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const API = "http://localhost:8000/api/v1";

interface ApplicationDetails {
  _id: string;
  job_title?: string;
  organization_name?: string;
  recruiter_name?: string;
  recruiter_email?: string;
  candidate_name?: string;
  candidate_email?: string;
  application_status?: string;
}

const OfferResponse = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const appId = searchParams.get("appId") || "";
  const initialAction = searchParams.get("action") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionDone, setActionDone] = useState<"accept" | "reject" | null>(null);
  const [appDetails, setAppDetails] = useState<ApplicationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!appId) {
      setError("Invalid or missing application reference.");
      setLoading(false);
      return;
    }

    const loadAndProcess = async () => {
      try {
        setLoading(true);

        // Fetch application details
        const res = await fetch(`${API}/applications/${appId}`);
        if (!res.ok) throw new Error("Could not load application details.");
        const data = await res.json();
        const app = data.application || {};
        setAppDetails(app);

        // If status is already accepted or rejected
        if (app.application_status === "offer_accepted") {
          setActionDone("accept");
          setLoading(false);
          return;
        } else if (app.application_status === "offer_rejected") {
          setActionDone("reject");
          setLoading(false);
          return;
        }

        // If initialAction provided, automatically execute it
        if (initialAction === "accept" || initialAction === "reject") {
          await handleDecision(initialAction, app);
        }
      } catch (err: any) {
        console.error("Error processing offer:", err);
        setError(err.message || "Failed to load offer details.");
      } finally {
        setLoading(false);
      }
    };

    loadAndProcess();
  }, [appId, initialAction]);

  const handleDecision = async (decision: "accept" | "reject", currentApp?: ApplicationDetails) => {
    try {
      setSubmitting(true);
      setError(null);

      const target = currentApp || appDetails;
      const res = await fetch(`${API}/applications/${appId}/offer-response`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: decision,
          candidate_name: target?.candidate_name || user?.name || "",
          candidate_email: target?.candidate_email || user?.email || "",
          recruiter_email: target?.recruiter_email || "",
          recruiter_name: target?.recruiter_name || "",
          company_name: target?.organization_name || "",
          job_title: target?.job_title || ""
        })
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.detail || result.message || "Failed to submit decision.");
      }

      setActionDone(decision);
    } catch (err: any) {
      console.error("Decision error:", err);
      setError(err.message || "Failed to update decision.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl z-10">
        <GlassCard variant="neon" hover={false} className="p-8 text-center space-y-6">
          {loading || submitting ? (
            <div className="py-12 space-y-4">
              <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
              <h2 className="text-xl font-semibold text-foreground">Processing your decision...</h2>
              <p className="text-sm text-muted-foreground">Please wait while we update your application status.</p>
            </div>
          ) : error ? (
            <div className="py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="pt-4 flex justify-center gap-3">
                <Link
                  to="/candidate/dashboard"
                  className="px-4 py-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-foreground text-sm transition-colors"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          ) : actionDone === "accept" ? (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Offer Officially Accepted!
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Welcome aboard, {appDetails?.candidate_name || user?.name || "Candidate"}! 🎉
                </h1>
                <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                  You've successfully accepted the offer for{" "}
                  <strong className="text-foreground">{appDetails?.job_title || "the role"}</strong> at{" "}
                  <strong className="text-foreground">{appDetails?.organization_name || "the company"}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-left space-y-2">
                <p className="text-sm font-semibold text-primary flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Recruiter Messenger Unlocked!
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your direct communication channel with the hiring team is now enabled. You can coordinate your onboarding, ask role-specific questions, and receive direct updates.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => navigate("/candidate/messages")}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:opacity-95 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  Open Recruiter Chat
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/candidate/dashboard"
                  className="px-5 py-3 rounded-lg bg-muted/20 hover:bg-muted/30 text-foreground font-medium text-sm text-center transition-colors"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          ) : actionDone === "reject" ? (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-full bg-muted/20 text-muted-foreground flex items-center justify-center mx-auto">
                <XCircle className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Offer Declined</h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Thank you for informing us of your decision regarding the{" "}
                <strong>{appDetails?.job_title || "position"}</strong> at{" "}
                <strong>{appDetails?.organization_name || "the company"}</strong>. We wish you the very best in your professional journey.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Link
                  to="/candidate/dashboard"
                  className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-left">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-foreground">Review Job Offer</h1>
                <p className="text-sm text-muted-foreground mt-1">Please confirm your decision below.</p>
              </div>

              <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-2">
                <div className="flex items-center gap-2 text-sm text-foreground font-semibold">
                  <Briefcase className="w-4 h-4 text-primary" />
                  {appDetails?.job_title || "Position"}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5" />
                  {appDetails?.organization_name || "Organization"}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleDecision("accept")}
                  className="flex-1 py-3 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                >
                  ✅ Accept Offer
                </button>
                <button
                  onClick={() => handleDecision("reject")}
                  className="py-3 px-4 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground font-medium transition-all"
                >
                  Decline
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default OfferResponse;
