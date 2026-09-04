import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, FilePlus, Database, Trophy, MessageCircle, LogOut, Save,
  CheckCircle, ChevronDown, ChevronUp, Plus, Trash2, Code, BookOpen, XCircle,
  Briefcase, Users, Target, Clock, ListOrdered, Calendar, AlignLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",    href: "/recruiter/dashboard",   icon: LayoutDashboard },
  { label: "Create Job",   href: "/recruiter/create-job",  icon: FilePlus },
  { label: "Jobs Created", href: "/recruiter/jobs-created",icon: Briefcase },
  { label: "Applicants",   href: "/recruiter/applicants",  icon: Users },
  { label: "Question DB",  href: "/recruiter/questions",   icon: Database },
  { label: "Rankings",     href: "/recruiter/rankings",    icon: Trophy },
  { label: "Messages",     href: "/recruiter/messages",    icon: MessageCircle },
  { label: "Logout",       href: "/login",                 icon: LogOut },
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
// ─── Component ─────────────────────────────────────────────────────────────────
const CreateJob = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const [skillInput,    setSkillInput]    = useState("");
  const [isSubmitting, setIsSubmitting]  = useState(false);

  // Rounds
  const [showAptitudeRound, setShowAptitudeRound] = useState(false);
  const [showCodingRound,   setShowCodingRound]   = useState(false);
  const [expandedAptitude,  setExpandedAptitude]  = useState(false);
  const [expandedCoding,    setExpandedCoding]    = useState(false);
  const [aptitudeQuestions, setAptitudeQuestions] = useState<AptitudeQuestion[]>([]);
  const [codingProblems,    setCodingProblems]    = useState<CodingProblem[]>([]);
  const [aptitudeThreshold, setAptitudeThreshold] = useState(7);
  const [aptitudeDuration,  setAptitudeDuration]  = useState(30);
  const [aptitudePriority,  setAptitudePriority]  = useState(1);
  const [codingPriority,    setCodingPriority]    = useState(2);

  // Slots
  // (removed — validity period handled by startDate/endDate datetime fields)

  // ── Helpers ────────────────────────────────────────────────────────
  const getRecruiterInfo = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return { id: u.id || "", email: u.email || "", name: u.name || u.full_name || "", organization: u.organization_name || "" };
    } catch { return { id: "", email: "", name: "", organization: "" }; }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim())              return toast({ title: "Validation Error", description: "Job title is required", variant: "destructive" });
    if (!formData.minExperience.trim())      return toast({ title: "Validation Error", description: "Minimum experience is required", variant: "destructive" });
    if (formData.requiredSkills.length === 0) return toast({ title: "Validation Error", description: "At least one skill is required", variant: "destructive" });
    if (!formData.keyResponsibilities.trim()) return toast({ title: "Validation Error", description: "Key responsibilities are required", variant: "destructive" });
    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate)
      return toast({ title: "Validation Error", description: "End date/time must be after start date/time", variant: "destructive" });

    setIsSubmitting(true);
    try {
      const recruiter = getRecruiterInfo();
      const responsibilities = formData.keyResponsibilities.split(/[,\n]/).map(r => r.trim()).filter(Boolean);

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
        ...(showAptitudeRound && { aptitude_threshold: aptitudeThreshold, aptitude_duration: aptitudeDuration, aptitude_priority: aptitudePriority }),
        ...(showCodingRound   && { coding_priority: codingPriority }),
        status: "draft",
      };

      const res = await fetch(`${API}/jobs/`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create job");

      const jobId = data.job?._id || data.job?.id;

      toast({ title: "Success!", description: "Job created successfully", duration: 3000 });

      // Reset
      setFormData({ title: "", description: "", minExperience: "", vacancies: "", requiredSkills: [], keyResponsibilities: "", startDate: "", endDate: "" });
      setSkillInput(""); setAptitudeQuestions([]); setCodingProblems([]);
      setAptitudeThreshold(7); setAptitudeDuration(30); setAptitudePriority(1); setCodingPriority(2);

      setTimeout(() => navigate("/recruiter/jobs-created"), 1500);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create job", variant: "destructive", duration: 8000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <DashboardLayout navItems={navItems} title="CREATE JOB">
      <div className="max-w-3xl space-y-6">

        {/* ── Job Details Card ── */}
        <GlassCard variant="neon" hover={false}>
          <h3 className="text-foreground font-semibold mb-6">Job Details</h3>
          <div className="space-y-4">

            {/* Title */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input type="text" name="title" value={formData.title} onChange={handleChange}
                placeholder="e.g., Senior Frontend Developer"
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5" />Job Description
              </label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={4}
                placeholder="Describe the role, team, and what the candidate will be working on..."
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all resize-none" />
            </div>

            {/* Experience + Vacancies */}            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Min. Experience (Years) <span className="text-red-500">*</span>
                </label>
                <input type="number" name="minExperience" value={formData.minExperience} onChange={handleChange}
                  placeholder="e.g., 3" min="0" step="0.5"
                  className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />Vacancies
                </label>
                <input type="number" name="vacancies" value={formData.vacancies} onChange={handleChange}
                  placeholder="e.g., 5" min="1"
                  className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" />
              </div>
            </div>

            {/* Required Skills */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Required Skills <span className="text-red-500">*</span>
              </label>
              {formData.requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.requiredSkills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded-full text-sm">
                      <span>{skill}</span>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, requiredSkills: p.requiredSkills.filter((_, idx) => idx !== i) }))}
                        className="hover:bg-primary/30 rounded-full p-0.5 transition-colors">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && skillInput.trim()) {
                    e.preventDefault();
                    if (!formData.requiredSkills.includes(skillInput.trim()))
                      setFormData(p => ({ ...p, requiredSkills: [...p.requiredSkills, skillInput.trim()] }));
                    setSkillInput("");
                  }
                }}
                placeholder="Type a skill and press Enter"
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all" />
              <p className="text-xs text-muted-foreground mt-1">Press Enter after each skill</p>
            </div>

            {/* Key Responsibilities */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Key Responsibilities <span className="text-red-500">*</span>
              </label>
              <textarea name="keyResponsibilities" value={formData.keyResponsibilities} onChange={handleChange} rows={5}
                placeholder="e.g., Develop frontend features, Conduct code reviews..."
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all resize-none" />
              <p className="text-xs text-muted-foreground mt-1">Separate by commas or new lines</p>
            </div>

            {/* Aptitude Round Toggle */}
            <div className="pt-4 border-t border-border/30">
              <button type="button" onClick={() => { setShowAptitudeRound(!showAptitudeRound); if (!showAptitudeRound) setExpandedAptitude(true); }}
                className={`w-full px-4 py-3 rounded-lg border-2 border-dashed transition-all flex items-center justify-between ${showAptitudeRound ? "border-primary bg-primary/10 text-primary" : "border-border/50 hover:border-primary/50 text-muted-foreground"}`}>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="font-medium">Add Aptitude Round</span>
                  {showAptitudeRound && aptitudeQuestions.length > 0 && (
                    <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">{aptitudeQuestions.length} question{aptitudeQuestions.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                {showAptitudeRound ? <CheckCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>

            {/* Coding Round Toggle */}
            <div>
              <button type="button" onClick={() => { setShowCodingRound(!showCodingRound); if (!showCodingRound) setExpandedCoding(true); }}
                className={`w-full px-4 py-3 rounded-lg border-2 border-dashed transition-all flex items-center justify-between ${showCodingRound ? "border-primary bg-primary/10 text-primary" : "border-border/50 hover:border-primary/50 text-muted-foreground"}`}>
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  <span className="font-medium">Add Technical Coding Round</span>
                  {showCodingRound && codingProblems.length > 0 && (
                    <span className="text-xs bg-primary/20 px-2 py-0.5 rounded">{codingProblems.length} problem{codingProblems.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                {showCodingRound ? <CheckCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </GlassCard>

        {/* ── Aptitude Round Card ── */}
        {showAptitudeRound && (
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedAptitude(!expandedAptitude)}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                <h3 className="text-foreground font-semibold">Aptitude Round</h3>
                <span className="text-xs text-muted-foreground">({aptitudeQuestions.length} questions)</span>
              </div>
              {expandedAptitude ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>

            {expandedAptitude && (
              <div className="mt-6 space-y-4">
                {/* Round Settings */}
                <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                  <h4 className="text-sm font-medium text-foreground mb-4">Round Settings</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-orange-400" />Passing Threshold
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={aptitudeThreshold} min="0" max={aptitudeQuestions.length || 100}
                          onChange={e => setAptitudeThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 px-3 py-2 rounded-lg bg-background/50 border border-border/50 text-foreground text-sm text-center focus:outline-none focus:border-primary/50" />
                        <span className="text-muted-foreground text-sm">/ {aptitudeQuestions.length || "—"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Min marks to qualify</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />Duration (minutes)
                      </label>
                      <input type="number" value={aptitudeDuration} min="1" step="5"
                        onChange={e => setAptitudeDuration(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <ListOrdered className="w-3.5 h-3.5 text-green-400" />Round Priority
                      </label>
                      <select value={aptitudePriority} onChange={e => { const v = parseInt(e.target.value); setAptitudePriority(v); if (showCodingRound) setCodingPriority(v === 1 ? 2 : 1); }}
                        className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50">
                        <option value={1}>Priority 1 (First)</option>
                        <option value={2}>Priority 2 (Second)</option>
                        <option value={3}>Priority 3 (Third)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button type="button" onClick={() => setAptitudeQuestions([...aptitudeQuestions, { id: Date.now().toString(), question: "", type: "MCQ", options: ["", ""], correctAnswer: 0, difficulty: "Easy", topic: "" }])}
                  className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" />Add Question
                </button>

                {aptitudeQuestions.map((q, qi) => (
                  <div key={q.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Question {qi + 1}</span>
                      <button type="button" onClick={() => setAptitudeQuestions(aptitudeQuestions.filter(x => x.id !== q.id))} className="p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-muted-foreground">Type:</label>
                      <select value={q.type} onChange={e => { const updated = [...aptitudeQuestions]; const t = e.target.value as "MCQ"|"MSQ"|"NAT"; updated[qi].type = t; updated[qi].options = t === "NAT" ? [] : (q.options.length ? q.options : ["",""]); updated[qi].correctAnswer = t === "MCQ" ? 0 : t === "MSQ" ? [] : ""; setAptitudeQuestions(updated); }}
                        className="px-3 py-1.5 rounded bg-background/50 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50">
                        <option value="MCQ">MCQ (Single Answer)</option>
                        <option value="MSQ">MSQ (Multiple Answers)</option>
                        <option value="NAT">NAT (Numerical Answer)</option>
                      </select>
                    </div>
                    <textarea placeholder="Enter question" value={q.question} rows={2}
                      onChange={e => { const u=[...aptitudeQuestions]; u[qi].question=e.target.value; setAptitudeQuestions(u); }}
                      className="w-full px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm resize-none focus:outline-none focus:border-primary/50" />
                    {(q.type==="MCQ"||q.type==="MSQ") && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-muted-foreground">Options:</label>
                          <button type="button" onClick={() => { const u=[...aptitudeQuestions]; u[qi].options.push(""); setAptitudeQuestions(u); }} className="text-xs text-primary flex items-center gap-1"><Plus className="w-3 h-3"/>Add Option</button>
                        </div>
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2">
                            {q.type==="MCQ" ? (
                              <input type="radio" checked={q.correctAnswer===oi} onChange={() => { const u=[...aptitudeQuestions]; u[qi].correctAnswer=oi; setAptitudeQuestions(u); }} className="w-4 h-4 accent-primary" />
                            ) : (
                              <input type="checkbox" checked={Array.isArray(q.correctAnswer)&&(q.correctAnswer as number[]).includes(oi)}
                                onChange={e => { const u=[...aptitudeQuestions]; let ca=Array.isArray(u[qi].correctAnswer)?[...(u[qi].correctAnswer as number[])]:[];  e.target.checked?ca.push(oi):ca=ca.filter(x=>x!==oi); u[qi].correctAnswer=ca; setAptitudeQuestions(u); }} className="w-4 h-4 accent-primary" />
                            )}
                            <input type="text" placeholder={`Option ${oi+1}`} value={opt}
                              onChange={e => { const u=[...aptitudeQuestions]; u[qi].options[oi]=e.target.value; setAptitudeQuestions(u); }}
                              className="flex-1 px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50" />
                            {q.options.length>2 && <button type="button" onClick={() => { const u=[...aptitudeQuestions]; u[qi].options.splice(oi,1); setAptitudeQuestions(u); }} className="p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="w-3 h-3"/></button>}
                          </div>
                        ))}
                      </div>
                    )}
                    {q.type==="NAT" && (
                      <input type="text" placeholder="Correct numerical answer" value={typeof q.correctAnswer==="string"?q.correctAnswer:""}
                        onChange={e => { const u=[...aptitudeQuestions]; u[qi].correctAnswer=e.target.value; setAptitudeQuestions(u); }}
                        className="w-full px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50" />
                    )}
                    <div className="flex gap-3">
                      <select value={q.difficulty} onChange={e => { const u=[...aptitudeQuestions]; u[qi].difficulty=e.target.value as any; setAptitudeQuestions(u); }}
                        className="px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50">
                        <option>Easy</option><option>Medium</option><option>Hard</option>
                      </select>
                      <input type="text" placeholder="Topic (e.g., Logical Reasoning)" value={q.topic}
                        onChange={e => { const u=[...aptitudeQuestions]; u[qi].topic=e.target.value; setAptitudeQuestions(u); }}
                        className="flex-1 px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {/* ── Coding Round Card ── */}
        {showCodingRound && (
          <GlassCard variant="neon" hover={false}>
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedCoding(!expandedCoding)}>
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-primary" />
                <h3 className="text-foreground font-semibold">Technical Coding Round</h3>
                <span className="text-xs text-muted-foreground">({codingProblems.length} problems)</span>
              </div>
              {expandedCoding ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </div>
            {expandedCoding && (
              <div className="mt-6 space-y-4">
                <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                  <h4 className="text-sm font-medium text-foreground mb-3">Round Settings</h4>
                  <div className="max-w-xs">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5 text-green-400" />Round Priority
                    </label>
                    <select value={codingPriority} onChange={e => { const v=parseInt(e.target.value); setCodingPriority(v); if (showAptitudeRound) setAptitudePriority(v===1?2:1); }}
                      className="w-full px-3 py-2 rounded-lg bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50">
                      <option value={1}>Priority 1 (First)</option>
                      <option value={2}>Priority 2 (Second)</option>
                      <option value={3}>Priority 3 (Third)</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={() => setCodingProblems([...codingProblems, { id: Date.now().toString(), title:"", description:"", difficulty:"Easy", tags:[], testCases:[{inputs:[],expectedOutput:"",visibility:"visible"}], codeTemplates:{python:"def solution():\n    pass",java:"class Main {\n    public static void main(String[] args) {\n    }\n}",cpp:"#include<iostream>\nusing namespace std;\nint main(){\n    return 0;\n}",c:"#include<stdio.h>\nint main(){\n    return 0;\n}"} }])}
                  className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" />Add Problem
                </button>
                {codingProblems.map((p, pi) => (
                  <div key={p.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Problem {pi+1}</span>
                      <button type="button" onClick={() => setCodingProblems(codingProblems.filter(x=>x.id!==p.id))} className="p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4"/></button>
                    </div>
                    <input type="text" placeholder="Problem title (e.g., Two Sum)" value={p.title}
                      onChange={e => { const u=[...codingProblems]; u[pi].title=e.target.value; setCodingProblems(u); }}
                      className="w-full px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50" />
                    <textarea placeholder="Problem description" value={p.description} rows={4}
                      onChange={e => { const u=[...codingProblems]; u[pi].description=e.target.value; setCodingProblems(u); }}
                      className="w-full px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm resize-none focus:outline-none focus:border-primary/50" />
                    <div className="flex gap-3">
                      <select value={p.difficulty} onChange={e => { const u=[...codingProblems]; u[pi].difficulty=e.target.value as any; setCodingProblems(u); }}
                        className="px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50">
                        <option>Easy</option><option>Medium</option><option>Hard</option>
                      </select>
                      <input type="text" placeholder="Tags (comma-separated)" value={p.tags.join(", ")}
                        onChange={e => { const u=[...codingProblems]; u[pi].tags=e.target.value.split(",").map(t=>t.trim()).filter(Boolean); setCodingProblems(u); }}
                        className="flex-1 px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-sm focus:outline-none focus:border-primary/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Test Cases:</label>
                      {p.testCases.map((tc, ti) => (
                        <div key={ti} className="flex gap-2">
                          <input type="text" placeholder="Input" value={tc.inputs[0]||""}
                            onChange={e => { const u=[...codingProblems]; u[pi].testCases[ti].inputs[0]=e.target.value; setCodingProblems(u); }}
                            className="flex-1 px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-xs font-mono focus:outline-none focus:border-primary/50" />
                          <input type="text" placeholder="Expected Output" value={tc.expectedOutput}
                            onChange={e => { const u=[...codingProblems]; u[pi].testCases[ti].expectedOutput=e.target.value; setCodingProblems(u); }}
                            className="flex-1 px-3 py-2 rounded bg-background/50 border border-border/50 text-foreground text-xs font-mono focus:outline-none focus:border-primary/50" />
                          <select value={tc.visibility} onChange={e => { const u=[...codingProblems]; u[pi].testCases[ti].visibility=e.target.value as any; setCodingProblems(u); }}
                            className="px-2 py-2 rounded bg-background/50 border border-border/50 text-foreground text-xs focus:outline-none focus:border-primary/50">
                            <option value="visible">👁️ Visible</option>
                            <option value="hidden">🔒 Hidden</option>
                          </select>
                          {ti>0&&<button type="button" onClick={() => { const u=[...codingProblems]; u[pi].testCases.splice(ti,1); setCodingProblems(u); }} className="p-2 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="w-3 h-3"/></button>}
                        </div>
                      ))}
                      <button type="button" onClick={() => { const u=[...codingProblems]; u[pi].testCases.push({inputs:[],expectedOutput:"",visibility:"visible"}); setCodingProblems(u); }} className="text-xs text-primary flex items-center gap-1"><Plus className="w-3 h-3"/>Add Test Case</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        )}

        {/* ── Validity Card ── */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-5 h-5 text-primary" />
            <h3 className="text-foreground font-semibold">Validity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Start */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-green-400" />Start Date &amp; Time
              </label>
              <input
                type="datetime-local"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            {/* End */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-400" />End Date &amp; Time
              </label>
              <input
                type="datetime-local"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          {formData.startDate && formData.endDate && formData.endDate > formData.startDate && (
            <p className="text-xs text-green-400 mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Applications open from {new Date(formData.startDate).toLocaleString()} to {new Date(formData.endDate).toLocaleString()}
            </p>
          )}
        </GlassCard>

        {/* ── Submit ── */}
        <button onClick={handleSubmit} disabled={isSubmitting}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSubmitting ? (
            <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />Creating Job...</>
          ) : (
            <><Save className="w-4 h-4" />Create Job</>
          )}
        </button>
      </div>
    </DashboardLayout>
  );
};

export default CreateJob;
