import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import GlassCard from "../../components/GlassCard";
import {
  Clock, ArrowRight, Brain, CheckCircle, XCircle,
  RotateCcw, RefreshCw, Settings, Maximize2, Minimize2,
} from "lucide-react";
import { cn } from "../../lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Option { text: string; isCorrect: boolean; }

interface AptitudeQuestion {
  id: string;
  serialNumber?: number;
  question: string;
  options: Option[];
  explanation: string;
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  tags?: string[];
}

// Job-specific question shape (from recruiter's question bank)
interface JobQuestion {
  id?: string;
  question?: string;          // recruiter bank field
  question_text?: string;     // alternate field name
  type?: string;              // MCQ | MSQ | NAT
  subtype?: string;           // mcq | numerical
  options?: string[];         // plain strings
  correctAnswer?: number | number[] | string;
  correct_answer?: number | number[] | string;
  explanation?: string;
  difficulty?: string;
  topic?: string;
  category?: string;
}

const ADMIN_API = "http://localhost:8000/api/v1/aptitude-questions";
const APP_API   = "http://localhost:8000/api/v1";

// ── Convert recruiter question → test question ────────────────────────────────

function toTestQuestion(jq: JobQuestion, idx: number): AptitudeQuestion {
  const text    = jq.question_text || jq.question || "";
  const rawOpts = jq.options || [];
  const correct = jq.correct_answer ?? jq.correctAnswer ?? 0;

  let options: Option[];
  if (rawOpts.length > 0 && typeof rawOpts[0] === "string") {
    // plain string options — mark correct by index
    options = (rawOpts as string[]).map((o, i) => ({
      text: o,
      isCorrect: i === (correct as number),
    }));
  } else if (rawOpts.length > 0 && typeof rawOpts[0] === "object") {
    options = (rawOpts as any[]).map((o) => ({ text: o.text || o, isCorrect: !!o.isCorrect }));
  } else {
    // NAT / numerical — no options, just show input
    options = [];
  }

  return {
    id:          jq.id || String(idx),
    serialNumber: idx + 1,
    question:    text,
    options,
    explanation: jq.explanation || "",
    category:    jq.topic || jq.category || "General",
    difficulty:  (jq.difficulty as any) || "Medium",
    tags:        [],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

const AptitudeTest = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  // State passed from Interviews.tsx when started from a job
  const locState = (location.state || {}) as {
    questions?:     JobQuestion[];
    duration?:      number;       // minutes
    threshold?:     number | null;
    applicationId?: string;
  };

  const isJobTest       = !!(locState.questions && locState.questions.length > 0);
  const applicationId   = locState.applicationId || "";
  const durationMinutes = locState.duration || 30;

  // ── State ──────────────────────────────────────────────────────────────────
  const [allQuestions,   setAllQuestions]   = useState<AptitudeQuestion[]>([]);
  const [questions,      setQuestions]      = useState<AptitudeQuestion[]>([]);
  const [currentIndex,   setCurrentIndex]   = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [natAnswer,      setNatAnswer]      = useState("");
  const [showExplanation, setShowExplanation] = useState(false);
  const [score,          setScore]          = useState(0);
  const [answers, setAnswers] = useState<Array<{ questionId: string; selected: number | null; correct: boolean }>>([]);
  const [isLoading,      setIsLoading]      = useState(true); // always start loading
  const [timeLeft,       setTimeLeft]       = useState(durationMinutes * 60);
  const [testCompleted,  setTestCompleted]  = useState(false);
  const [testStarted,    setTestStarted]    = useState(isJobTest); // auto-start for job tests
  const [saving,         setSaving]         = useState(false);

  // Practice-mode filter states (unused in job mode)
  const [filterCategory,   setFilterCategory]   = useState<string>("All");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("All");

  // UI
  const [isFullscreen,    setIsFullscreen]   = useState(false);
  const [showSettings,    setShowSettings]   = useState(false);
  const [backgroundTheme, setBackgroundTheme] = useState<"normal" | "ruled">("normal");
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Load questions ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (isJobTest) {
      const converted = (locState.questions || []).map(toTestQuestion);
      setAllQuestions(converted);
      setQuestions(converted);
      setTimeLeft(durationMinutes * 60);
      setIsLoading(false);  // mark ready
    } else {
      fetch(ADMIN_API)
        .then(r => r.json())
        .then(data => setAllQuestions(data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, []);

  // ── Complete + save score (defined before useEffect that uses it) ────────

  const completeTest = async (finalScore: number, finalAnswers: typeof answers) => {
    setTestCompleted(true);

    if (!applicationId) return;

    setSaving(true);
    try {
      await fetch(`${APP_API}/applications/${applicationId}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round:     "aptitude",
          score:     finalScore,
          max_score: questions.length,
          notes:     `Completed: ${finalAnswers.filter(a => a.correct).length}/${questions.length} correct`,
        }),
      });
    } catch (err) {
      console.error("Failed to save aptitude score:", err);
    } finally {
      setSaving(false);
    }
  };

  // ── Timer ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (timeLeft > 0 && !testCompleted && testStarted) {
      const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
      return () => clearInterval(t);
    } else if (timeLeft === 0 && !testCompleted && testStarted) {
      completeTest(score, answers);
    }
  }, [timeLeft, testCompleted, testStarted]);

  // ── Fullscreen ────────────────────────────────────────────────────────────

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ── Apply filters (practice mode) ────────────────────────────────────────

  const applyFilters = () => {
    let filtered = [...allQuestions];
    if (filterCategory !== "All") filtered = filtered.filter(q => q.category === filterCategory);
    if (filterDifficulty !== "All") filtered = filtered.filter(q => q.difficulty === filterDifficulty);
    return filtered;
  };

  const handleStartTest = () => {
    const filtered = applyFilters();
    if (!filtered.length) { alert("No questions match the selected filters."); return; }
    setQuestions(filtered);
    setTestStarted(true);
    setTimeLeft(durationMinutes * 60);
  };

  // ── Answer handling ───────────────────────────────────────────────────────

  const handleSubmit = () => {
    const q = questions[currentIndex];
    const isNAT = !q.options.length;

    let isCorrect = false;
    if (isNAT) {
      // For NAT just mark as incorrect (no answer key stored for now)
      isCorrect = false;
    } else {
      if (selectedOption === null) return;
      isCorrect = q.options[selectedOption]?.isCorrect ?? false;
    }

    const newScore   = isCorrect ? score + 1 : score;
    const newAnswers = [...answers, { questionId: q.id, selected: isNAT ? null : selectedOption, correct: isCorrect }];
    setScore(newScore);
    setAnswers(newAnswers);
    setShowExplanation(true);

    if (currentIndex === questions.length - 1) {
      completeTest(newScore, newAnswers);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setNatAnswer("");
      setShowExplanation(false);
    } else {
      completeTest(score, answers);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setNatAnswer("");
    setShowExplanation(false);
    setScore(0);
    setAnswers([]);
    setTimeLeft(durationMinutes * 60);
    setTestCompleted(false);
    if (!isJobTest) {
      setTestStarted(false);
      setFilterCategory("All");
      setFilterDifficulty("All");
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!isJobTest && allQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground mb-2">No questions available</p>
          <Link to="/candidate/practice" className="text-primary hover:underline">← Back to Practice</Link>
        </div>
      </div>
    );
  }

  // ── Completed screen ──────────────────────────────────────────────────────

  if (testCompleted) {
    const pct = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const threshold = locState.threshold;
    const passed = threshold == null || score >= threshold;

    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <GlassCard variant="neon" className="text-center py-12">
            <Brain className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-3xl font-display text-foreground mb-4">Test Completed!</h2>

            <div className="mb-6">
              <div className="text-6xl font-bold text-primary mb-2">{score}/{questions.length}</div>
              <p className="text-muted-foreground">Questions Correct</p>
            </div>

            {threshold != null && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 ${
                passed
                  ? "bg-green-500/20 text-green-400 border border-green-500/40"
                  : "bg-red-500/20 text-red-400 border border-red-500/40"
              }`}>
                {passed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {passed ? `Passed (cutoff: ${threshold})` : `Did not pass (cutoff: ${threshold})`}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="text-2xl font-bold text-green-500">{pct}%</div>
                <div className="text-xs text-muted-foreground">Accuracy</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/20">
                <div className="text-2xl font-bold text-foreground">{formatTime(durationMinutes * 60 - timeLeft)}</div>
                <div className="text-xs text-muted-foreground">Time Taken</div>
              </div>
            </div>

            {saving && <p className="text-xs text-muted-foreground mb-4">Saving score...</p>}

            <div className="flex gap-4 justify-center">
              {isJobTest ? (
                <button
                  onClick={() => navigate("/candidate/interviews")}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Back to Interviews
                </button>
              ) : (
                <>
                  <button onClick={handleRestart} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors">
                    <RotateCcw className="w-4 h-4" /> Retake Test
                  </button>
                  <Link to="/candidate/practice" className="px-6 py-3 border border-border/50 rounded-lg text-foreground hover:bg-muted/30 transition-colors">
                    Back to Practice
                  </Link>
                </>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  // ── Practice mode config screen ───────────────────────────────────────────

  if (!testStarted && !isJobTest) {
    const filteredCount = applyFilters().length;
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link to="/candidate/practice" className="text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
            <Brain className="w-6 h-6 text-primary" />
            <span className="font-display text-sm tracking-widest text-foreground">APTITUDE TEST</span>
          </div>

          <GlassCard variant="neon">
            <h2 className="text-2xl font-display text-foreground mb-2">Configure Your Test</h2>
            <p className="text-sm text-muted-foreground mb-6">Select category and difficulty for your aptitude test</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Category</label>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50">
                  <option value="All">All Categories</option>
                  <option value="Verbal">Verbal</option>
                  <option value="Quantitative">Quantitative</option>
                  <option value="Reasoning">Reasoning</option>
                  <option value="Technical">Technical</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Difficulty</label>
                <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}
                  className="w-full px-4 py-3 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50">
                  <option value="All">All Levels</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/20 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{filteredCount}</div>
                <div className="text-xs text-muted-foreground">Questions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{durationMinutes}</div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">Auto</div>
                <div className="text-xs text-muted-foreground">Submit</div>
              </div>
            </div>

            <button onClick={handleStartTest} disabled={filteredCount === 0}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              Start Test <ArrowRight className="w-4 h-4" />
            </button>
            {filteredCount === 0 && <p className="text-sm text-red-500 text-center mt-3">No questions available for selected filters</p>}
          </GlassCard>
        </div>
      </div>
    );
  }

  // ── Active test ───────────────────────────────────────────────────────────

  if (!questions.length) return null;  // guard — questions not loaded yet

  const currentQ  = questions[currentIndex];
  const progress  = ((currentIndex + 1) / questions.length) * 100;
  const isNAT     = !currentQ.options.length;

  return (
    <div ref={containerRef} className={cn("min-h-screen p-6", backgroundTheme === "ruled"
      ? "bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:100%_2rem]"
      : "bg-background")}>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          {!isJobTest && (
            <Link to="/candidate/practice" className="text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-5 h-5 rotate-180" />
            </Link>
          )}
          <Brain className="w-6 h-6 text-primary" />
          <span className="font-display text-sm tracking-widest text-foreground">APTITUDE TEST</span>
          {isJobTest && <span className="text-xs text-muted-foreground ml-1">(Company Assessment)</span>}
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <span className="font-display text-sm text-primary">Q{currentIndex + 1}</span>
            <span className="text-xs text-muted-foreground">/ {questions.length}</span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className={cn("font-mono text-sm", timeLeft < 60 ? "text-red-400" : "text-foreground")}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.location.reload()} className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors" title="Settings">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={handleFullscreen} className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {showSettings && (
        <div className="mb-6">
          <GlassCard variant="neon" hover={false} className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Background</h3>
            <div className="flex gap-3">
              {["normal", "ruled"].map(t => (
                <button key={t} onClick={() => setBackgroundTheme(t as any)}
                  className={cn("flex-1 px-4 py-2 rounded-lg text-sm transition-colors capitalize",
                    backgroundTheme === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50")}>
                  {t}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-muted/30 mb-8">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-neon-cyan transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Question */}
        <GlassCard variant="neon" hover={false} className="mb-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {currentQ.serialNumber && <span className="text-xs font-medium text-foreground">#{currentQ.serialNumber}</span>}
            {currentQ.category && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{currentQ.category}</span>
            )}
            {currentQ.difficulty && (
              <span className={cn("px-2 py-0.5 rounded text-xs font-medium",
                currentQ.difficulty === "Easy"   ? "bg-green-500/10 text-green-500" :
                currentQ.difficulty === "Medium" ? "bg-yellow-500/10 text-yellow-500" :
                                                   "bg-red-500/10 text-red-500")}>
                {currentQ.difficulty}
              </span>
            )}
          </div>
          <p className="text-foreground text-lg">{currentQ.question}</p>
        </GlassCard>

        {/* Options or NAT input */}
        {isNAT ? (
          <div className="mb-6">
            <input
              type="number"
              value={natAnswer}
              onChange={e => setNatAnswer(e.target.value)}
              disabled={showExplanation}
              placeholder="Enter your numerical answer"
              className="w-full px-4 py-3 rounded-lg bg-muted/20 border border-border/30 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {currentQ.options.map((opt, i) => (
              <button key={i} onClick={() => { if (!showExplanation) setSelectedOption(i); }}
                disabled={showExplanation}
                className={cn("w-full p-4 rounded-lg text-left transition-all duration-300 border",
                  showExplanation && opt.isCorrect
                    ? "bg-green-500/10 border-green-500/40 text-green-500"
                    : showExplanation && selectedOption === i && !opt.isCorrect
                    ? "bg-red-500/10 border-red-500/40 text-red-500"
                    : selectedOption === i
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-muted/20 border-border/30 text-foreground hover:border-primary/20 hover:bg-muted/30")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="font-mono text-sm mr-3 text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                    {opt.text}
                  </div>
                  {showExplanation && opt.isCorrect   && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {showExplanation && selectedOption === i && !opt.isCorrect && <XCircle className="w-5 h-5 text-red-500" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Explanation */}
        {showExplanation && currentQ.explanation && (
          <GlassCard variant="neon" hover={false} className="mb-6 p-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">Explanation:</h4>
            <p className="text-sm text-muted-foreground">{currentQ.explanation}</p>
          </GlassCard>
        )}

        {/* Action button */}
        <div>
          {!showExplanation ? (
            <button onClick={handleSubmit}
              disabled={!isNAT ? selectedOption === null : natAnswer.trim() === ""}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              Submit Answer
            </button>
          ) : (
            <button onClick={handleNext}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all flex items-center justify-center gap-2">
              {currentIndex < questions.length - 1
                ? <><span>Next Question</span><ArrowRight className="w-4 h-4" /></>
                : <><span>Complete Test</span><CheckCircle className="w-4 h-4" /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AptitudeTest;
