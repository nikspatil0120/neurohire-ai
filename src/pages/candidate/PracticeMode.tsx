import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, Target, Building2, FileText, User, LogOut,
  Brain, Code, Calculator, ArrowRight, Briefcase,
  X, ChevronRight, Plus, Trash2, MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import TestInstructionsModal from "@/components/TestInstructionsModal";
import { useAuth } from "@/contexts/AuthContext";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",              href: "/candidate/dashboard",              icon: LayoutDashboard },
  { label: "Practice",               href: "/candidate/practice",               icon: Target },
  { label: "Company Interviews",     href: "/candidate/interviews",             icon: Building2 },
  { label: "Incoming Opportunities", href: "/candidate/incoming-opportunities", icon: Briefcase },
  { label: "Messages",              href: "/candidate/messages",              icon: MessageCircle },
  { label: "Reports",                href: "/candidate/reports",                icon: FileText },
  { label: "Profile",                href: "/candidate/profile",                icon: User },
  { label: "Logout",                 href: "/login",                            icon: LogOut },
];

// ── Job form state ────────────────────────────────────────────────────────────
interface JobForm {
  title: string;
  company: string;
  description: string;
  experience: string;
  skills: string;
  responsibilities: string[];
}

const emptyForm = (): JobForm => ({
  title: "",
  company: "",
  description: "",
  experience: "",
  skills: "",
  responsibilities: [""],
});

// ── Component ─────────────────────────────────────────────────────────────────
const PracticeMode = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  // ── Modal steps: null → "form" → "instructions" → (navigate)
  const [step,        setStep]        = useState<null | "form" | "instructions">(null);
  const [form,        setForm]        = useState<JobForm>(emptyForm());
  const [generating,  setGenerating]  = useState(false);
  const [genError,    setGenError]    = useState("");

  const setField = (k: keyof JobForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const setResp = (i: number, v: string) => {
    const rs = [...form.responsibilities];
    rs[i] = v;
    setForm(f => ({ ...f, responsibilities: rs }));
  };
  const addResp    = () => setForm(f => ({ ...f, responsibilities: [...f.responsibilities, ""] }));
  const removeResp = (i: number) => setForm(f => ({ ...f, responsibilities: f.responsibilities.filter((_, idx) => idx !== i) }));

  const canSubmitForm = form.title.trim() && form.company.trim() && form.skills.trim();

  // ── Start interview after instructions agreement ──────────────────────────
  const handleStartInterview = async () => {
    setStep(null);
    setGenerating(true);
    setGenError("");

    try {
      // Fetch candidate profile
      const profileRes = await fetch(
        `${API}/users/profile/data?email=${encodeURIComponent(user?.email || "")}`
      );
      const profileData = profileRes.ok ? (await profileRes.json()).data || {} : {};

      const candidate = {
        name:             user?.name || profileData.fullName || "",
        qualification:    profileData.education?.[0]?.degree || "",
        total_experience: form.experience || "",
        skills:           form.skills,
        work_experience:  (profileData.experience || []).map((e: any) => `${e.role || ""} at ${e.company || ""}`),
        projects:         (profileData.projects || []).map((p: any) => p.title || ""),
        certifications:   "",
      };

      const job = {
        title:             form.title,
        company:           form.company,
        experience_level:  form.experience,
        required_skills:   form.skills,
        responsibilities:  form.responsibilities.filter(Boolean),
        other_requirements: form.description,
      };

      const res = await fetch(`${API}/interview-ai/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate, job }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || "Failed to generate questions");

      navigate("/candidate/interview-room", {
        state: {
          rapport_questions: data.rapport_questions || [],
          questions:         data.questions         || [],
          candidateProfile:  candidate,
          jobData:           job,
          applicationId:     "",  // practice — no applicationId, score won't be saved
        },
      });
    } catch (err: any) {
      setGenError(err.message || "Failed to generate questions. Please try again.");
      setGenerating(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
    <DashboardLayout navItems={navItems} title="PRACTICE MODE">
      <div className="max-w-4xl mx-auto">
        <p className="text-muted-foreground mb-8">Choose a practice round to sharpen your skills</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Aptitude */}
          <Link to="/candidate/aptitude-test">
            <GlassCard variant="neon" className="h-full group cursor-pointer">
              <Calculator className="w-10 h-10 mb-4 text-primary" />
              <h3 className="text-foreground font-semibold text-lg mb-2">Aptitude Round</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Logical reasoning, quantitative aptitude, and verbal ability questions
              </p>
              <div className="flex items-center gap-2 text-sm text-primary group-hover:gap-3 transition-all mt-8">
                Start <ArrowRight className="w-4 h-4" />
              </div>
            </GlassCard>
          </Link>

          {/* Technical Coding */}
          <Link to="/candidate/problem-list">
            <GlassCard variant="purple" className="h-full group cursor-pointer">
              <Code className="w-10 h-10 mb-4 text-secondary" />
              <h3 className="text-foreground font-semibold text-lg mb-2">Technical Coding</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Data structures, algorithms, and system design challenges
              </p>
              <div className="flex items-center gap-2 text-sm text-secondary group-hover:gap-3 transition-all mt-8">
                Start <ArrowRight className="w-4 h-4" />
              </div>
            </GlassCard>
          </Link>

          {/* AI Interview */}
          <div onClick={() => { setForm(emptyForm()); setStep("form"); }} className="cursor-pointer">
            <GlassCard variant="neon" className="h-full group">
              <Brain className="w-10 h-10 mb-4 text-primary" />
              <h3 className="text-foreground font-semibold text-lg mb-2">AI Interview</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Real-time AI-powered interview with emotion and voice analysis
              </p>
              <div className="flex items-center gap-2 text-sm text-primary group-hover:gap-3 transition-all mt-8">
                Start <ArrowRight className="w-4 h-4" />
              </div>
            </GlassCard>
          </div>

        </div>

        {/* Generating overlay */}
        {generating && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-card border border-border/50 rounded-xl p-8 text-center max-w-sm w-full mx-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Preparing Your Interview</h3>
              <p className="text-sm text-muted-foreground">Generating tailored questions based on the job description…</p>
              {genError && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-left">
                  {genError}
                  <button onClick={() => { setGenerating(false); setGenError(""); }}
                    className="block mt-2 text-primary hover:underline">Try again</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>

    {/* ── Job Details Form Modal ── */}
    {step === "form" && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-2xl my-6">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/30">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">AI Interview Practice</p>
              <h2 className="text-lg font-semibold text-foreground">Job Details</h2>
            </div>
            <button onClick={() => setStep(null)}
              className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Fill in the job details you want to practice for. The AI will tailor questions based on this.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Job Title *</label>
                <input value={form.title} onChange={e => setField("title", e.target.value)}
                  placeholder="e.g. Frontend Developer"
                  className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Company *</label>
                <input value={form.company} onChange={e => setField("company", e.target.value)}
                  placeholder="e.g. Google"
                  className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Experience Level</label>
              <input value={form.experience} onChange={e => setField("experience", e.target.value)}
                placeholder="e.g. 2+ years, Entry Level, Senior"
                className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Required Skills *</label>
              <input value={form.skills} onChange={e => setField("skills", e.target.value)}
                placeholder="e.g. React, TypeScript, Node.js, REST APIs"
                className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
              <p className="text-xs text-muted-foreground mt-1">Separate skills with commas</p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Job Description</label>
              <textarea rows={3} value={form.description} onChange={e => setField("description", e.target.value)}
                placeholder="Brief description of the role and team…"
                className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none" />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Key Responsibilities</label>
              <div className="space-y-2">
                {form.responsibilities.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={r} onChange={e => setResp(i, e.target.value)}
                      placeholder={`Responsibility ${i + 1}`}
                      className="flex-1 bg-muted/10 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
                    {form.responsibilities.length > 1 && (
                      <button onClick={() => removeResp(i)}
                        className="p-2 text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addResp}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1">
                  <Plus className="w-3.5 h-3.5" /> Add responsibility
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border/30 flex justify-end gap-3">
            <button onClick={() => setStep(null)}
              className="px-5 py-2.5 rounded-lg bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-colors text-sm">
              Cancel
            </button>
            <button
              onClick={() => setStep("instructions")}
              disabled={!canSubmitForm}
              className="px-5 py-2.5 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Instructions Modal ── */}
    {step === "instructions" && (
      <TestInstructionsModal
        testType="interview"
        onClose={() => setStep("form")}
        onStart={handleStartInterview}
      />
    )}
    </>
  );
};

export default PracticeMode;
