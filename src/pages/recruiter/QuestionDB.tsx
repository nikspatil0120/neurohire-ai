import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, FilePlus, Database, BarChart2, MessageCircle, LogOut,
  User, Plus, Edit, Trash2, X, Check, ChevronDown, ChevronUp,
  BookOpen, Code2, FlaskConical, LibraryBig,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",        href: "/recruiter/dashboard",  icon: LayoutDashboard },
  { label: "Create Job",       href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB",      href: "/recruiter/questions",  icon: Database },
  { label: "Reports",          href: "/recruiter/rankings",   icon: BarChart2 },
  { label: "Messages",         href: "/recruiter/messages",   icon: MessageCircle },
  { label: "Profile Settings", href: "/recruiter/profile",    icon: User },
  { label: "Logout",           href: "/login",                icon: LogOut },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionType = "aptitude" | "coding";
type AptitudeSubtype = "mcq" | "numerical";
type Filter = "all" | "aptitude" | "coding";

interface TestCase { input: string; expected_output: string; description: string; }

interface Question {
  id: string;
  question_type: QuestionType;
  subtype: AptitudeSubtype;
  question_text: string;
  options: string[];
  correct_answer: any;
  explanation: string;
  difficulty: string;
  category: string;
  description: string;
  test_cases: TestCase[];
  tags: string[];
}

// ── Blank forms ───────────────────────────────────────────────────────────────

const blankAptitude = (): Omit<Question, "id"> => ({
  question_type: "aptitude", subtype: "mcq",
  question_text: "", options: ["", "", "", ""], correct_answer: 0,
  explanation: "", difficulty: "Medium", category: "",
  description: "", test_cases: [], tags: [],
});

const blankCoding = (): Omit<Question, "id"> => ({
  question_type: "coding", subtype: "mcq",
  question_text: "", options: [], correct_answer: null,
  explanation: "", difficulty: "Medium", category: "",
  description: "", test_cases: [{ input: "", expected_output: "", description: "" }], tags: [],
});

const blankTC = (): TestCase => ({ input: "", expected_output: "", description: "" });

// ── Component ─────────────────────────────────────────────────────────────────

const QuestionDB = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  // modal state
  const [modal, setModal] = useState<null | "aptitude" | "coding">(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Question, "id">>(blankAptitude());
  const [saving, setSaving] = useState(false);

  const getEmail = () => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").email || ""; } catch { return ""; }
  };

  // ── Admin DB picker ────────────────────────────────────────────────────────
  const [adminPickerOpen, setAdminPickerOpen] = useState(false);
  const [adminProblems, setAdminProblems] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSelected, setAdminSelected] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);

  const openAdminPicker = async () => {
    setAdminPickerOpen(true);
    setAdminSelected(new Set());
    setAdminLoading(true);
    try {
      const res = await fetch(`${API}/problems/?published_only=true`);
      const data = await res.json();
      setAdminProblems(Array.isArray(data) ? data : []);
    } catch { setAdminProblems([]); }
    finally { setAdminLoading(false); }
  };

  const copyFromAdmin = async () => {
    if (!adminSelected.size) return;
    setCopying(true);
    const email = getEmail();
    const selected = adminProblems.filter(p => adminSelected.has(p.id));
    let success = 0;
    for (const p of selected) {
      try {
        const payload = {
          recruiter_email: email,
          question_type: "coding",
          subtype: "mcq",
          question_text: p.title,
          description: p.description || "",
          difficulty: p.difficulty || "Medium",
          category: (p.tags || []).join(", "),
          options: [],
          correct_answer: null,
          explanation: "",
          tags: p.tags || [],
          test_cases: (p.testCases || []).map((tc: any) => ({
            input: Array.isArray(tc.inputs) ? tc.inputs.join(", ") : (tc.inputs || ""),
            expected_output: tc.expectedOutput || "",
            description: tc.visibility || "",
          })),
        };
        const res = await fetch(`${API}/recruiter-questions/`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
        if (res.ok) success++;
      } catch { /* continue */ }
    }
    toast({ title: "Copied", description: `${success} problem${success !== 1 ? "s" : ""} copied to your Question DB` });
    setAdminPickerOpen(false);
    loadQuestions();
    setCopying(false);
  };

  const loadQuestions = async () => {
    const email = getEmail();
    if (!email) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/recruiter-questions/?recruiter_email=${encodeURIComponent(email)}`);
      const d = await res.json();
      setQuestions(d.questions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadQuestions(); }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────

  const visible = questions.filter(q =>
    filter === "all" ? true : q.question_type === filter
  );

  // ── Open modals ────────────────────────────────────────────────────────────

  const openAdd = (type: "aptitude" | "coding") => {
    setEditingId(null);
    setForm(type === "aptitude" ? blankAptitude() : blankCoding());
    setModal(type);
  };

  const openEdit = (q: Question) => {
    setEditingId(q.id);
    setForm({ ...q });
    setModal(q.question_type);
  };

  const closeModal = () => { setModal(null); setEditingId(null); };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.question_text.trim()) {
      toast({ title: "Error", description: "Question text is required", variant: "destructive" }); return;
    }
    setSaving(true);
    const email = getEmail();
    try {
      const payload = { ...form, recruiter_email: email };
      let res: Response;
      if (editingId) {
        res = await fetch(`${API}/recruiter-questions/${editingId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API}/recruiter-questions/`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
        });
      }
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "Success", description: editingId ? "Question updated" : "Question added" });
      closeModal();
      loadQuestions();
    } catch {
      toast({ title: "Error", description: "Failed to save question", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      const res = await fetch(`${API}/recruiter-questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast({ title: "Deleted" });
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  // ── Form helpers ───────────────────────────────────────────────────────────

  const setField = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const setOption = (i: number, v: string) => {
    const opts = [...form.options]; opts[i] = v; setField("options", opts);
  };
  const addOption = () => setField("options", [...form.options, ""]);
  const removeOption = (i: number) => setField("options", form.options.filter((_, idx) => idx !== i));

  const setTC = (i: number, k: keyof TestCase, v: string) => {
    const tcs = form.test_cases.map((tc, idx) => idx === i ? { ...tc, [k]: v } : tc);
    setField("test_cases", tcs);
  };
  const addTC = () => setField("test_cases", [...form.test_cases, blankTC()]);
  const removeTC = (i: number) => setField("test_cases", form.test_cases.filter((_, idx) => idx !== i));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout navItems={navItems} title="QUESTION DATABASE">
      <div className="space-y-6">

        {/* ── Action buttons ── */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => openAdd("aptitude")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all text-sm font-medium"
          >
            <BookOpen className="w-4 h-4" /> Add Aptitude Question
          </button>
          <button
            onClick={() => openAdd("coding")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-secondary/20 text-secondary border border-secondary/40 hover:bg-secondary/30 transition-all text-sm font-medium"
          >
            <Code2 className="w-4 h-4" /> Add Technical Question
          </button>
          <button
            onClick={openAdminPicker}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-muted/20 text-muted-foreground border border-border/40 hover:bg-muted/30 hover:text-foreground transition-all text-sm font-medium"
          >
            <LibraryBig className="w-4 h-4" /> Copy from Admin DB
          </button>
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-2">
          {(["all", "aptitude", "coding"] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === f
                  ? "bg-primary/20 text-primary border-primary/50"
                  : "bg-muted/10 text-muted-foreground border-border/30 hover:border-primary/30"
              }`}
            >
              {f === "all" ? "All Questions" : f === "aptitude" ? "Aptitude" : "Technical"}
            </button>
          ))}
        </div>

        {/* ── Question list ── */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : visible.length === 0 ? (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <Database className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm">No questions yet. Add your first one above.</p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid gap-4">
            {visible.map(q => (
              <GlassCard key={q.id} variant="neon" hover={false}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        q.question_type === "aptitude"
                          ? "bg-primary/20 text-primary border-primary/40"
                          : "bg-secondary/20 text-secondary border-secondary/40"
                      }`}>
                        {q.question_type === "aptitude" ? "Aptitude" : "Technical"}
                      </span>
                      {q.question_type === "aptitude" && (
                        <span className="px-2 py-0.5 rounded-full text-xs border border-border/30 text-muted-foreground">
                          {q.subtype === "mcq" ? "MCQ" : "Numerical"}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${
                        q.difficulty === "Hard" ? "bg-red-500/10 text-red-400 border-red-500/30"
                        : q.difficulty === "Easy" ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                      }`}>{q.difficulty}</span>
                      {q.category && <span className="text-xs text-muted-foreground">{q.category}</span>}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openEdit(q)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm text-foreground font-medium">{q.question_text}</p>

                  {q.question_type === "aptitude" && q.subtype === "mcq" && q.options.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`px-3 py-1.5 rounded text-xs border ${
                          i === q.correct_answer
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-muted/10 text-muted-foreground border-border/20"
                        }`}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.question_type === "aptitude" && q.subtype === "numerical" && (
                    <p className="text-xs text-muted-foreground">Answer: <span className="text-green-400 font-medium">{q.correct_answer}</span></p>
                  )}

                  {q.question_type === "coding" && q.test_cases.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FlaskConical className="w-3 h-3" /> {q.test_cases.length} test case{q.test_cases.length > 1 ? "s" : ""}
                    </div>
                  )}

                  {q.explanation && (
                    <p className="text-xs text-muted-foreground italic">💡 {q.explanation}</p>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-2xl my-6">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                {modal === "aptitude" ? <BookOpen className="w-5 h-5 text-primary" /> : <Code2 className="w-5 h-5 text-secondary" />}
                {editingId ? "Edit" : "Add"} {modal === "aptitude" ? "Aptitude" : "Technical"} Question
              </h2>
              <button onClick={closeModal} className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">

              {/* Common: type selector for aptitude */}
              {modal === "aptitude" && (
                <div className="flex gap-3">
                  {(["mcq", "numerical"] as AptitudeSubtype[]).map(st => (
                    <button
                      key={st}
                      onClick={() => setField("subtype", st)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                        form.subtype === st
                          ? "bg-primary/20 text-primary border-primary/50"
                          : "bg-muted/10 text-muted-foreground border-border/30 hover:border-primary/30"
                      }`}
                    >
                      {st === "mcq" ? "MCQ (Multiple Choice)" : "Numerical (Number answer)"}
                    </button>
                  ))}
                </div>
              )}

              {/* Question text */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Question *</label>
                <textarea
                  rows={3}
                  value={form.question_text}
                  onChange={e => setField("question_text", e.target.value)}
                  placeholder="Enter the question..."
                  className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>

              {/* Coding: description */}
              {modal === "coding" && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Problem Description</label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={e => setField("description", e.target.value)}
                    placeholder="Detailed problem description, constraints, examples..."
                    className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
                  />
                </div>
              )}

              {/* MCQ options */}
              {modal === "aptitude" && form.subtype === "mcq" && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Options (click to mark correct)</label>
                  <div className="space-y-2">
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <button
                          onClick={() => setField("correct_answer", i)}
                          className={`w-7 h-7 shrink-0 rounded-full border text-xs font-bold transition-all ${
                            form.correct_answer === i
                              ? "bg-green-500/30 text-green-400 border-green-500/50"
                              : "bg-muted/10 text-muted-foreground border-border/30 hover:border-green-500/40"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}
                        </button>
                        <input
                          value={opt}
                          onChange={e => setOption(i, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + i)}`}
                          className="flex-1 bg-muted/10 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                        />
                        {form.options.length > 2 && (
                          <button onClick={() => removeOption(i)} className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={addOption} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1">
                      <Plus className="w-3.5 h-3.5" /> Add option
                    </button>
                  </div>
                </div>
              )}

              {/* Numerical answer */}
              {modal === "aptitude" && form.subtype === "numerical" && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Correct Answer (number)</label>
                  <input
                    type="number"
                    value={form.correct_answer ?? ""}
                    onChange={e => setField("correct_answer", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="e.g. 42"
                    className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                  />
                </div>
              )}

              {/* Coding: test cases */}
              {modal === "coding" && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Test Cases</label>
                  <div className="space-y-3">
                    {form.test_cases.map((tc, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border/30 bg-muted/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground font-medium">Test Case {i + 1}</span>
                          {form.test_cases.length > 1 && (
                            <button onClick={() => removeTC(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Input</label>
                            <textarea rows={2} value={tc.input} onChange={e => setTC(i, "input", e.target.value)}
                              placeholder="Input value"
                              className="w-full bg-muted/10 border border-border/30 rounded px-2 py-1.5 text-xs text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 resize-none" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Expected Output</label>
                            <textarea rows={2} value={tc.expected_output} onChange={e => setTC(i, "expected_output", e.target.value)}
                              placeholder="Expected output"
                              className="w-full bg-muted/10 border border-border/30 rounded px-2 py-1.5 text-xs text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 resize-none" />
                          </div>
                        </div>
                        <input value={tc.description} onChange={e => setTC(i, "description", e.target.value)}
                          placeholder="Description (optional)"
                          className="w-full bg-muted/10 border border-border/30 rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50" />
                      </div>
                    ))}
                    <button onClick={addTC} className="flex items-center gap-1.5 text-xs text-secondary hover:text-secondary/80 transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Add test case
                    </button>
                  </div>
                </div>
              )}

              {/* Common fields: difficulty, category, explanation */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={e => setField("difficulty", e.target.value)}
                    className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Category</label>
                  <input
                    value={form.category}
                    onChange={e => setField("category", e.target.value)}
                    placeholder="e.g. Arrays, Verbal"
                    className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">Explanation / Notes</label>
                <textarea
                  rows={2}
                  value={form.explanation}
                  onChange={e => setField("explanation", e.target.value)}
                  placeholder="Optional explanation or hint..."
                  className="w-full bg-muted/10 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border/30 flex justify-end gap-3">
              <button onClick={closeModal} className="px-5 py-2 rounded-lg bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-colors text-sm">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? "Saving..." : editingId ? "Update" : "Add Question"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Admin DB Picker Modal ── */}
      {adminPickerOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-2xl my-6">
            <div className="flex items-center justify-between p-5 border-b border-border/30">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <LibraryBig className="w-5 h-5 text-muted-foreground" />
                Copy from Admin Question Bank
              </h2>
              <button onClick={() => setAdminPickerOpen(false)} className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {adminLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : adminProblems.length === 0 ? (
                <div className="text-center py-10">
                  <Database className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground text-sm">No published problems in admin DB yet.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {adminProblems.map(p => (
                    <label key={p.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      adminSelected.has(p.id)
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/30 hover:border-primary/30 bg-muted/5"
                    }`}>
                      <input
                        type="checkbox"
                        checked={adminSelected.has(p.id)}
                        onChange={() => setAdminSelected(prev => {
                          const s = new Set(prev);
                          s.has(p.id) ? s.delete(p.id) : s.add(p.id);
                          return s;
                        })}
                        className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground font-medium truncate">{p.title}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            p.difficulty === "Hard" ? "bg-red-500/10 text-red-400"
                            : p.difficulty === "Easy" ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                          }`}>{p.difficulty}</span>
                          {(p.tags || []).map((tag: string) => (
                            <span key={tag} className="text-xs text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded">{tag}</span>
                          ))}
                          {(p.testCases || []).length > 0 && (
                            <span className="text-xs text-muted-foreground">{p.testCases.length} test cases</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{adminSelected.size} selected</span>
              <div className="flex gap-3">
                <button onClick={() => setAdminPickerOpen(false)} className="px-4 py-2 rounded-lg bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-colors text-sm">
                  Cancel
                </button>
                <button
                  onClick={copyFromAdmin}
                  disabled={adminSelected.size === 0 || copying}
                  className="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  {copying ? "Copying..." : "Copy to My DB"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default QuestionDB;
