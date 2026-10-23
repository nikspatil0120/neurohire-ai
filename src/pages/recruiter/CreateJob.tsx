import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard,
  FilePlus,
  Database,
  BarChart2,
  LogOut,
  Save,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Code,
  BookOpen,
  XCircle,
  Briefcase,
  Users,
  Target,
  Clock,
  Calendar,
  AlignLeft,
  MessageCircle,
  LibraryBig,
  X,
  Sparkles,
  Check,
  Eye,
  GraduationCap,
  ArrowRight,
  Code2,
  BrainCircuit,
  Building2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",        href: "/recruiter/dashboard",     icon: LayoutDashboard },
  { label: "Create Job",       href: "/recruiter/create-job",    icon: FilePlus },
  { label: "Jobs Created",     href: "/recruiter/jobs-created",  icon: Briefcase },
  { label: "Applicants",       href: "/recruiter/applicants",    icon: Users },
  { label: "Question DB",      href: "/recruiter/questions",     icon: Database },
  { label: "Reports",          href: "/recruiter/rankings",      icon: BarChart2 },
  { label: "Messages",         href: "/recruiter/messages",      icon: MessageCircle },
  { label: "Logout",           href: "/login",                   icon: LogOut },
];

const SUGGESTED_SKILLS = [
  "Python", "React.js", "Java", "TypeScript", "Node.js", "Spring Boot",
  "PostgreSQL", "AWS", "Docker", "Kubernetes", "Machine Learning", "SQL"
];

// ─── Interfaces ────────────────────────────────────────────────────────────────
interface AptitudeQuestion {
  id: string;
  question: string;
  type: "MCQ" | "MSQ" | "NAT";
  options: string[];
  correctAnswer: number | number[] | string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic: string;
}

interface CodingProblem {
  id: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  testCases: { inputs: any[]; expectedOutput: string; visibility: "visible" | "hidden" }[];
  codeTemplates: { python: string; java: string; cpp: string; c: string };
}

const CreateJob = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Basic form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    minExperience: "",
    vacancies: "",
    requiredSkills: [] as string[],
    keyResponsibilities: "",
    startDate: "",
    endDate: "",
  });

  const [skillInput, setSkillInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Rounds state
  const [showAptitudeRound, setShowAptitudeRound] = useState(false);
  const [showCodingRound,   setShowCodingRound]   = useState(false);
  const [expandedAptitude,  setExpandedAptitude]  = useState(true);
  const [expandedCoding,    setExpandedCoding]    = useState(true);
  const [aptitudeQuestions, setAptitudeQuestions] = useState<AptitudeQuestion[]>([]);
  const [codingProblems,    setCodingProblems]    = useState<CodingProblem[]>([]);
  const [aptitudeThreshold, setAptitudeThreshold] = useState(0);
  const [aptitudeDuration,  setAptitudeDuration]  = useState(30);
  const [aptitudePriority,  setAptitudePriority]  = useState(1);
  const [codingPriority,    setCodingPriority]    = useState(2);
  const [codingThreshold,   setCodingThreshold]   = useState(0);
  const [codingDuration,    setCodingDuration]    = useState(60);

  // DB Picker state
  type DbPickerType = "aptitude" | "coding" | null;
  const [dbPickerOpen, setDbPickerOpen] = useState<DbPickerType>(null);
  const [dbQuestions, setDbQuestions] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbSelected, setDbSelected] = useState<Set<string>>(new Set());

  const openDbPicker = async (type: "aptitude" | "coding") => {
    setDbPickerOpen(type);
    setDbSelected(new Set());
    setDbLoading(true);
    try {
      const email = getRecruiterInfo().email;
      const qType = type === "aptitude" ? "aptitude" : "coding";
      const res = await fetch(`${API}/recruiter-questions/?recruiter_email=${encodeURIComponent(email)}&question_type=${qType}`);
      const d = await res.json();
      setDbQuestions(d.questions || []);
    } catch {
      setDbQuestions([]);
    } finally {
      setDbLoading(false);
    }
  };

  const importFromDb = () => {
    if (dbPickerOpen === "aptitude") {
      const toAdd = dbQuestions
        .filter((q) => dbSelected.has(q.id))
        .map((q) => ({
          id: q.id,
          question: q.question_text,
          type: (q.subtype === "numerical" ? "NAT" : "MCQ") as "MCQ" | "NAT",
          options: q.options || [],
          correctAnswer: q.correct_answer ?? 0,
          difficulty: (q.difficulty || "Easy") as "Easy" | "Medium" | "Hard",
          topic: q.category || "",
        }));
      setAptitudeQuestions((prev) => [...prev, ...toAdd]);
    } else if (dbPickerOpen === "coding") {
      const toAdd = dbQuestions
        .filter((q) => dbSelected.has(q.id))
        .map((q) => ({
          id: q.id,
          title: q.question_text,
          description: q.description || "",
          difficulty: (q.difficulty || "Easy") as "Easy" | "Medium" | "Hard",
          tags: q.tags || [],
          testCases: (q.test_cases || []).map((tc: any) => ({
            inputs: [tc.input || ""],
            expectedOutput: tc.expected_output || "",
            visibility: "visible" as "visible" | "hidden",
          })),
          codeTemplates: {
            python: "def solution():\n    pass",
            java: "class Main {\n    public static void main(String[] args) {\n    }\n}",
            cpp: "#include<iostream>\nusing namespace std;\nint main(){\n    return 0;\n}",
            c: "#include<stdio.h>\nint main(){\n    return 0;\n}",
          },
        }));
      setCodingProblems((prev) => [...prev, ...toAdd]);
    }
    setDbPickerOpen(null);
  };

  // Helpers
  const getRecruiterInfo = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return {
        id: user?.id || u.id || "",
        email: user?.email || u.email || "",
        name: user?.name || u.name || u.full_name || "",
        organization: (user as any)?.organization_name || u.organization_name || "Wipro Limited",
      };
    } catch {
      return {
        id: user?.id || "",
        email: user?.email || "",
        name: user?.name || "",
        organization: (user as any)?.organization_name || "Wipro Limited",
      };
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (s && !formData.requiredSkills.includes(s)) {
      setFormData((prev) => ({ ...prev, requiredSkills: [...prev.requiredSkills, s] }));
    }
  };

  const removeSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter((_, idx) => idx !== index),
    }));
  };

  // Submit
  const handleSubmit = async (publishImmediately: boolean = false) => {
    // Validation
    if (!formData.title.trim()) {
      return toast({ title: "Validation Error", description: "Job title is required", variant: "destructive" });
    }
    if (!formData.minExperience.trim()) {
      return toast({ title: "Validation Error", description: "Minimum experience is required", variant: "destructive" });
    }
    if (formData.requiredSkills.length === 0) {
      return toast({ title: "Validation Error", description: "At least one skill is required", variant: "destructive" });
    }
    if (!formData.keyResponsibilities.trim()) {
      return toast({ title: "Validation Error", description: "Key responsibilities are required", variant: "destructive" });
    }
    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      return toast({ title: "Validation Error", description: "End date/time must be after start date/time", variant: "destructive" });
    }

    setIsSubmitting(true);
    try {
      const recruiter = getRecruiterInfo();
      const responsibilities = formData.keyResponsibilities
        .split(/[,\n]/)
        .map((r) => r.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        experience: `${formData.minExperience}+ years`,
        vacancies: formData.vacancies ? parseInt(formData.vacancies) : null,
        required_skills: formData.requiredSkills,
        key_responsibilities: responsibilities,
        recruiter_id: recruiter.id,
        recruiter_email: recruiter.email,
        recruiter_name: recruiter.name,
        organization_name: recruiter.organization,
        start_date: formData.startDate || null,
        end_date: formData.endDate || null,
        aptitude_questions: aptitudeQuestions,
        coding_problems: codingProblems,
        ...(showAptitudeRound && {
          aptitude_threshold: aptitudeThreshold,
          aptitude_duration: aptitudeDuration,
          aptitude_priority: aptitudePriority,
        }),
        ...(showCodingRound && {
          coding_priority: codingPriority,
          coding_threshold: codingThreshold,
          coding_duration: codingDuration,
        }),
        status: publishImmediately ? "published" : "draft",
      };

      const res = await fetch(`${API}/jobs/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create job");

      toast({
        title: "Success! 🎉",
        description: publishImmediately ? "Job published successfully!" : "Job saved as draft successfully!",
        duration: 3000,
      });

      setTimeout(() => navigate("/recruiter/jobs-created"), 1500);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create job",
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic preview helper
  const recruiterInfo = getRecruiterInfo();
  const getPreviewIcon = () => {
    const t = formData.title.toLowerCase();
    if (t.includes("ai") || t.includes("ml") || t.includes("machine learning") || t.includes("data science")) {
      return BrainCircuit;
    }
    if (t.includes("dev") || t.includes("engineer") || t.includes("code") || t.includes("frontend") || t.includes("backend") || t.includes("fullstack")) {
      return Code2;
    }
    return Briefcase;
  };
  const PreviewIcon = getPreviewIcon();

  return (
    <>
      <DashboardLayout navItems={navItems} title="CREATE JOB OPENING">
        <div className="space-y-6 pb-12 w-full">

          {/* ── 1. Page Header Banner ── */}
          <GlassCard
            variant="neon"
            className="p-6 border-primary/30 bg-gradient-to-r from-primary/15 via-card/80 to-card/95 relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span>Role Architect • {recruiterInfo.organization}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground tracking-tight">
                  Post a New Job Opening
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Configure role requirements, define evaluation rounds, and publish positions directly to the NeuroHire candidate portal.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Link
                  to="/recruiter/dashboard"
                  className="px-4 py-2.5 rounded-xl border border-border/60 hover:bg-muted/30 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                >
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/50 text-xs font-semibold text-foreground transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5 text-primary" />
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-md shadow-primary/25 transition-all flex items-center gap-1.5 hover:scale-[1.02]"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                  Publish Role
                </button>
              </div>
            </div>
          </GlassCard>

          {/* ── 2. Split Layout: Form on Left (2 cols), Live Preview & Meta on Right (1 col) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left Column: Form Details (2 cols) ── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Section 1: Core Job Details */}
              <GlassCard variant="default" className="p-6 border-border/50 space-y-5">
                <div className="flex items-center justify-between border-b border-border/30 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Role Specifications</h3>
                      <p className="text-xs text-muted-foreground">Title, required experience, and vacancy headcount</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                    Step 1 of 3
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Job Title */}
                  <div>
                    <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Job Title <span className="text-rose-500">*</span></span>
                      <span className="text-[11px] text-muted-foreground font-normal lowercase">e.g. Senior Java Developer</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="e.g., Senior Fullstack Engineer"
                      className="w-full px-4 py-2.5 rounded-xl bg-muted/20 border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                  </div>

                  {/* Experience & Vacancies */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-primary" />
                        Min Experience (Years) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="minExperience"
                        value={formData.minExperience}
                        onChange={handleChange}
                        placeholder="e.g., 3"
                        min="0"
                        step="0.5"
                        className="w-full px-4 py-2.5 rounded-xl bg-muted/20 border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      />
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {["0 (Fresher)", "2+", "4+", "6+"].map((exp) => (
                          <button
                            key={exp}
                            type="button"
                            onClick={() => setFormData((p) => ({ ...p, minExperience: exp.replace(/[^0-9]/g, "") }))}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground border border-border/40 transition-colors"
                          >
                            {exp}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        Target Headcount (Vacancies)
                      </label>
                      <input
                        type="number"
                        name="vacancies"
                        value={formData.vacancies}
                        onChange={handleChange}
                        placeholder="e.g., 5"
                        min="1"
                        className="w-full px-4 py-2.5 rounded-xl bg-muted/20 border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">Number of positions to fill</p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <AlignLeft className="w-3.5 h-3.5 text-primary" />
                      Job Overview & Summary
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Outline the team mission, core projects, and day-to-day impact for this role..."
                      className="w-full px-4 py-2.5 rounded-xl bg-muted/20 border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                    />
                  </div>
                </div>
              </GlassCard>

              {/* Section 2: Skills & Responsibilities */}
              <GlassCard variant="default" className="p-6 border-border/50 space-y-5">
                <div className="flex items-center justify-between border-b border-border/30 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Competencies & Responsibilities</h3>
                      <p className="text-xs text-muted-foreground">Required technical skills and core deliverables</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
                    Step 2 of 3
                  </span>
                </div>

                {/* Skills Tag Manager */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider block">
                    Required Competencies & Skills <span className="text-rose-500">*</span>
                  </label>

                  {/* Active Skills List */}
                  {formData.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/15 border border-border/40">
                      {formData.requiredSkills.map((skill, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary border border-primary/30 rounded-lg text-xs font-medium animate-in fade-in-0"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => removeSkill(i)}
                            className="hover:bg-primary/20 text-primary/80 hover:text-primary rounded p-0.5 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Skill Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && skillInput.trim()) {
                          e.preventDefault();
                          addSkill(skillInput);
                          setSkillInput("");
                        }
                      }}
                      placeholder="Type a skill and press Enter (e.g. React, Docker, Spring Boot)"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-muted/20 border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (skillInput.trim()) {
                          addSkill(skillInput);
                          setSkillInput("");
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-xs font-semibold border border-primary/30 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>

                  {/* Suggested Skills Chips */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground font-medium">Quick suggestions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {SUGGESTED_SKILLS.map((sk) => {
                        const isAdded = formData.requiredSkills.includes(sk);
                        return (
                          <button
                            key={sk}
                            type="button"
                            onClick={() => (isAdded ? null : addSkill(sk))}
                            disabled={isAdded}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-md border transition-all flex items-center gap-1",
                              isAdded
                                ? "bg-muted/10 border-border/30 text-muted-foreground/50 cursor-default"
                                : "bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
                            )}
                          >
                            {isAdded ? <Check className="w-3 h-3 text-emerald-400" /> : <Plus className="w-3 h-3" />}
                            {sk}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Key Responsibilities */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider flex items-center justify-between">
                    <span>Key Responsibilities <span className="text-rose-500">*</span></span>
                    <span className="text-[11px] text-muted-foreground font-normal">One per line or comma-separated</span>
                  </label>
                  <textarea
                    name="keyResponsibilities"
                    value={formData.keyResponsibilities}
                    onChange={handleChange}
                    rows={4}
                    placeholder="• Architect and deploy scalable microservices&#10;• Optimize database schemas and SQL queries&#10;• Guide junior team members through code reviews"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted/20 border border-border/60 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none font-sans"
                  />
                </div>
              </GlassCard>

              {/* Section 3: Evaluation Rounds */}
              <GlassCard variant="default" className="p-6 border-border/50 space-y-5">
                <div className="flex items-center justify-between border-b border-border/30 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Candidate Evaluation Rounds</h3>
                      <p className="text-xs text-muted-foreground">Attach online Aptitude and Technical Coding assessments</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    Step 3 of 3
                  </span>
                </div>

                {/* Round Toggle Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Aptitude Card */}
                  <div
                    onClick={() => setShowAptitudeRound(!showAptitudeRound)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between gap-3",
                      showAptitudeRound
                        ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                        : "border-border/50 hover:border-primary/40 bg-muted/10"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold text-foreground">Aptitude Round</span>
                      </div>
                      <p className="text-xs text-muted-foreground">MCQ & numerical assessments</p>
                      {showAptitudeRound && aptitudeQuestions.length > 0 && (
                        <span className="inline-block text-[11px] text-primary font-medium mt-1">
                          {aptitudeQuestions.length} Question{aptitudeQuestions.length > 1 ? "s" : ""} added
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border transition-all mt-0.5",
                        showAptitudeRound ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                      )}
                    >
                      {showAptitudeRound && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Coding Card */}
                  <div
                    onClick={() => setShowCodingRound(!showCodingRound)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start justify-between gap-3",
                      showCodingRound
                        ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                        : "border-border/50 hover:border-primary/40 bg-muted/10"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-secondary" />
                        <span className="text-sm font-semibold text-foreground">Technical Coding</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Algorithm problems & test cases</p>
                      {showCodingRound && codingProblems.length > 0 && (
                        <span className="inline-block text-[11px] text-secondary font-medium mt-1">
                          {codingProblems.length} Problem{codingProblems.length > 1 ? "s" : ""} added
                        </span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border transition-all mt-0.5",
                        showCodingRound ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                      )}
                    >
                      {showCodingRound && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>

                {/* ── Aptitude Questions Configuration ── */}
                {showAptitudeRound && (
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-4 animate-in fade-in-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">Aptitude Configuration</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedAptitude(!expandedAptitude)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {expandedAptitude ? "Collapse" : "Expand"}
                        {expandedAptitude ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {expandedAptitude && (
                      <div className="space-y-4 pt-1">
                        {/* Settings Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-background/50 border border-border/40">
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-amber-400" /> Passing Threshold
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={aptitudeThreshold === 0 && aptitudeQuestions.length === 0 ? "" : aptitudeThreshold}
                                placeholder="0"
                                min="0"
                                max={aptitudeQuestions.length || undefined}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const max = aptitudeQuestions.length;
                                  setAptitudeThreshold(max > 0 ? Math.min(Math.max(0, val), max) : Math.max(0, val));
                                }}
                                className="w-20 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-foreground text-sm text-center focus:outline-none focus:border-primary"
                              />
                              <span className="text-xs text-muted-foreground">/ {aptitudeQuestions.length || "—"} min correct</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-400" /> Duration (Minutes)
                            </label>
                            <input
                              type="number"
                              value={aptitudeDuration}
                              min="5"
                              step="5"
                              onChange={(e) => setAptitudeDuration(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setAptitudeQuestions([
                                ...aptitudeQuestions,
                                {
                                  id: Date.now().toString(),
                                  question: "",
                                  type: "MCQ",
                                  options: ["", ""],
                                  correctAnswer: 0,
                                  difficulty: "Easy",
                                  topic: "",
                                },
                              ])
                            }
                            className="px-3.5 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Custom Question
                          </button>
                          <button
                            type="button"
                            onClick={() => openDbPicker("aptitude")}
                            className="px-3.5 py-1.5 rounded-lg bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25 transition-all text-xs font-semibold flex items-center gap-1.5"
                          >
                            <LibraryBig className="w-3.5 h-3.5" />
                            Import from Question Bank
                          </button>
                        </div>

                        {/* Question Items */}
                        {aptitudeQuestions.map((q, qi) => (
                          <div key={q.id} className="p-3.5 rounded-xl bg-card border border-border/60 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-foreground">Question #{qi + 1}</span>
                              <button
                                type="button"
                                onClick={() => setAptitudeQuestions(aptitudeQuestions.filter((x) => x.id !== q.id))}
                                className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <textarea
                              placeholder="Enter question text here..."
                              value={q.question}
                              rows={2}
                              onChange={(e) => {
                                const u = [...aptitudeQuestions];
                                u[qi].question = e.target.value;
                                setAptitudeQuestions(u);
                              }}
                              className="w-full px-3 py-2 rounded-lg bg-muted/20 border border-border/50 text-foreground text-xs resize-none focus:outline-none focus:border-primary"
                            />
                            {/* Options */}
                            <div className="space-y-1.5">
                              {q.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    checked={q.correctAnswer === oi}
                                    onChange={() => {
                                      const u = [...aptitudeQuestions];
                                      u[qi].correctAnswer = oi;
                                      setAptitudeQuestions(u);
                                    }}
                                    className="accent-primary"
                                  />
                                  <input
                                    type="text"
                                    placeholder={`Option ${oi + 1}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const u = [...aptitudeQuestions];
                                      u[qi].options[oi] = e.target.value;
                                      setAptitudeQuestions(u);
                                    }}
                                    className="flex-1 px-3 py-1.5 rounded-md bg-muted/20 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary"
                                  />
                                  {q.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const u = [...aptitudeQuestions];
                                        u[qi].options.splice(oi, 1);
                                        setAptitudeQuestions(u);
                                      }}
                                      className="text-rose-400 p-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => {
                                  const u = [...aptitudeQuestions];
                                  u[qi].options.push("");
                                  setAptitudeQuestions(u);
                                }}
                                className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1 mt-1"
                              >
                                <Plus className="w-3 h-3" /> Add Option
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Technical Coding Configuration ── */}
                {showCodingRound && (
                  <div className="p-4 rounded-xl border border-secondary/30 bg-secondary/5 space-y-4 animate-in fade-in-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-secondary" />
                        <h4 className="text-sm font-semibold text-foreground">Coding Round Configuration</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedCoding(!expandedCoding)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {expandedCoding ? "Collapse" : "Expand"}
                        {expandedCoding ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {expandedCoding && (
                      <div className="space-y-4 pt-1">
                        {/* Settings Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg bg-background/50 border border-border/40">
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-amber-400" /> Passing Threshold
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={codingThreshold === 0 && codingProblems.length === 0 ? "" : codingThreshold}
                                placeholder="0"
                                min="0"
                                max={codingProblems.length || undefined}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const max = codingProblems.length;
                                  setCodingThreshold(max > 0 ? Math.min(Math.max(0, val), max) : Math.max(0, val));
                                }}
                                className="w-20 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-foreground text-sm text-center focus:outline-none focus:border-primary"
                              />
                              <span className="text-xs text-muted-foreground">/ {codingProblems.length || "—"} min problems solved</span>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-400" /> Duration (Minutes)
                            </label>
                            <input
                              type="number"
                              value={codingDuration}
                              min="15"
                              step="15"
                              onChange={(e) => setCodingDuration(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setCodingProblems([
                                ...codingProblems,
                                {
                                  id: Date.now().toString(),
                                  title: "",
                                  description: "",
                                  difficulty: "Easy",
                                  tags: [],
                                  testCases: [{ inputs: [], expectedOutput: "", visibility: "visible" }],
                                  codeTemplates: {
                                    python: "def solution():\n    pass",
                                    java: "class Main {\n    public static void main(String[] args) {\n    }\n}",
                                    cpp: "#include<iostream>\nusing namespace std;\nint main(){\n    return 0;\n}",
                                    c: "#include<stdio.h>\nint main(){\n    return 0;\n}",
                                  },
                                },
                              ])
                            }
                            className="px-3.5 py-1.5 rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-all text-xs font-semibold flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Problem
                          </button>
                          <button
                            type="button"
                            onClick={() => openDbPicker("coding")}
                            className="px-3.5 py-1.5 rounded-lg bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary/25 transition-all text-xs font-semibold flex items-center gap-1.5"
                          >
                            <LibraryBig className="w-3.5 h-3.5" />
                            Import from Question Bank
                          </button>
                        </div>

                        {/* Coding Problem List */}
                        {codingProblems.map((p, pi) => (
                          <div key={p.id} className="p-3.5 rounded-xl bg-card border border-border/60 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-foreground">Problem #{pi + 1}</span>
                              <button
                                type="button"
                                onClick={() => setCodingProblems(codingProblems.filter((x) => x.id !== p.id))}
                                className="p-1 rounded text-rose-400 hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              type="text"
                              placeholder="Problem title (e.g. Reverse Linked List, Two Sum)"
                              value={p.title}
                              onChange={(e) => {
                                const u = [...codingProblems];
                                u[pi].title = e.target.value;
                                setCodingProblems(u);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg bg-muted/20 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary"
                            />
                            <textarea
                              placeholder="Problem description and constraints..."
                              value={p.description}
                              rows={3}
                              onChange={(e) => {
                                const u = [...codingProblems];
                                u[pi].description = e.target.value;
                                setCodingProblems(u);
                              }}
                              className="w-full px-3 py-2 rounded-lg bg-muted/20 border border-border/50 text-foreground text-xs resize-none focus:outline-none focus:border-primary"
                            />
                            <div className="flex gap-2">
                              <select
                                value={p.difficulty}
                                onChange={(e) => {
                                  const u = [...codingProblems];
                                  u[pi].difficulty = e.target.value as any;
                                  setCodingProblems(u);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-muted/30 border border-border/50 text-foreground text-xs"
                              >
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Hard</option>
                              </select>
                              <input
                                type="text"
                                placeholder="Tags (e.g. Arrays, Dynamic Programming)"
                                value={p.tags.join(", ")}
                                onChange={(e) => {
                                  const u = [...codingProblems];
                                  u[pi].tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
                                  setCodingProblems(u);
                                }}
                                className="flex-1 px-3 py-1.5 rounded-lg bg-muted/20 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>

            </div>

            {/* ── Right Column: Live Job Card Preview & Publishing (1 col) ── */}
            <div className="space-y-6">

              {/* 1. Live Job Card Preview */}
              <GlassCard variant="default" className="p-5 border-border/50 space-y-4">
                <div className="flex items-center justify-between border-b border-border/30 pb-2.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Eye className="w-3.5 h-3.5 text-primary" />
                    Live Job Card Preview
                  </span>
                  <span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                    Candidate View
                  </span>
                </div>

                {/* Simulated Card */}
                <div className="rounded-xl p-4 border border-border/60 bg-gradient-to-b from-card to-card/60 space-y-3 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                      <PreviewIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {formData.title || "Job Title Preview"}
                      </h4>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        <span>{recruiterInfo.organization}</span>
                        <span>•</span>
                        <span>{formData.minExperience ? `${formData.minExperience}+ yrs` : "Exp TBD"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Skills preview */}
                  <div className="flex flex-wrap gap-1">
                    {formData.requiredSkills.length > 0 ? (
                      formData.requiredSkills.slice(0, 4).map((s, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">Add skills to see badges</span>
                    )}
                    {formData.requiredSkills.length > 4 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/40 text-muted-foreground">
                        +{formData.requiredSkills.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Rounds attached badges */}
                  {(showAptitudeRound || showCodingRound) && (
                    <div className="pt-2 border-t border-border/30 flex items-center gap-1.5 flex-wrap">
                      {showAptitudeRound && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> Aptitude
                        </span>
                      )}
                      {showCodingRound && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 flex items-center gap-1">
                          <Code className="w-3 h-3" /> Technical Coding
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* 2. Timeline & Application Window */}
              <GlassCard variant="default" className="p-5 border-border/50 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/30 pb-2.5">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Application Validity Window
                  </h4>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Opening Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg bg-muted/20 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Closing Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 rounded-lg bg-muted/20 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary"
                    />
                  </div>

                  {formData.startDate && formData.endDate && formData.endDate > formData.startDate && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Valid window configured</span>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* 3. Publication Actions Box */}
              <GlassCard variant="default" className="p-5 border-border/50 space-y-3">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Finalize & Submit
                </h4>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-xs tracking-wide hover:bg-primary/90 shadow-md shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <FilePlus className="w-4 h-4" />
                        Publish Job Now
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/60 text-foreground font-medium text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save as Draft Only
                  </button>
                </div>
              </GlassCard>

            </div>

          </div>

        </div>
      </DashboardLayout>

      {/* ── DB Question Picker Modal ── */}
      {dbPickerOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-5 border-b border-border/30">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <LibraryBig className="w-5 h-5 text-secondary" />
                Select {dbPickerOpen === "aptitude" ? "Aptitude" : "Technical"} Questions from Database
              </h2>
              <button
                type="button"
                onClick={() => setDbPickerOpen(null)}
                className="p-1.5 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {dbLoading ? (
                <div className="flex items-center justify-center h-36">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : dbQuestions.length === 0 ? (
                <div className="text-center py-10">
                  <Database className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground text-sm">No {dbPickerOpen} questions in your database yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Add questions in the Question DB section first.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {dbQuestions.map((q) => (
                    <label
                      key={q.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        dbSelected.has(q.id)
                          ? "border-primary/50 bg-primary/10"
                          : "border-border/30 hover:border-primary/30 bg-muted/5"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={dbSelected.has(q.id)}
                        onChange={() => {
                          setDbSelected((prev) => {
                            const s = new Set(prev);
                            s.has(q.id) ? s.delete(q.id) : s.add(q.id);
                            return s;
                          });
                        }}
                        className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground font-medium truncate">{q.question_text}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {q.subtype && (
                            <span className="text-[10px] text-muted-foreground">{q.subtype === "numerical" ? "Numerical" : "MCQ"}</span>
                          )}
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-medium",
                              q.difficulty === "Hard"
                                ? "bg-rose-500/10 text-rose-400"
                                : q.difficulty === "Easy"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-amber-500/10 text-amber-400"
                            )}
                          >
                            {q.difficulty}
                          </span>
                          {q.category && <span className="text-[10px] text-muted-foreground">{q.category}</span>}
                          {dbPickerOpen === "coding" && q.test_cases?.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{q.test_cases.length} test cases</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{dbSelected.size} questions selected</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDbPickerOpen(null)}
                  className="px-4 py-2 rounded-xl bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={importFromDb}
                  disabled={dbSelected.size === 0}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Import Selected ({dbSelected.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateJob;
