import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlassCard from '@/components/GlassCard';
import CelebrationCard from '@/components/CelebrationCard';
import Editor from '@monaco-editor/react';
import {
  Play, RotateCcw, Settings, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle, XCircle, Clock, Code2,
  Terminal, FileText, Copy, Check, ChevronRight,
  Send, Brain, ChevronDown as ChevronDown2,
  Code, ArrowLeft, Maximize2, ThumbsUp, ThumbsDown, Eye, Users, Lightbulb
} from 'lucide-react';
import { getProblemById, Problem } from '@/lib/problemStore';

const TechnicalCoding = () => {
  const [searchParams] = useSearchParams();
  const problemId = searchParams.get('problemId');

  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'testcase' | 'result'>('testcase');
  const [customInput, setCustomInput] = useState('');
  const [leftPanelWidth, setLeftPanelWidth] = useState(45);
  const [summary, setSummary] = useState<{ passed: number; total: number; percentage: number } | null>(null);
  const [problemData, setProblemData] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const editorRef = useRef<any>(null);

  // ─── Build test cases from problemData ───────────────────────────────────────
  // Each input is an object { value, type, description }
  // We join their values with newlines to form stdin
  const testCases = problemData?.testCases
    ?.filter(tc => tc.visibility === 'visible')
    .map(tc => ({
      input: tc.inputs
        .map((inp: any) => (typeof inp === 'object' && inp !== null ? inp.value : inp))
        .join('\n'),
      expectedOutput: tc.expectedOutput
    })) || [];

  // ─── Load problem from database ───────────────────────────────────────────────
  useEffect(() => {
    const loadProblem = async () => {
      if (!problemId) {
        setIsLoading(false);
        return;
      }
      try {
        const problem = await getProblemById(problemId);
        if (problem) {
          setProblemData(problem);
          setCode(problem.codeTemplates[selectedLanguage as keyof typeof problem.codeTemplates] || '');
        }
      } catch (error) {
        console.error('Error loading problem:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadProblem();
  }, [problemId]);

  // ─── Languages ───────────────────────────────────────────────────────────────
  const languages = [
    { id: 'python', name: 'Python', icon: '🐍', monacoLang: 'python' },
    { id: 'java',   name: 'Java',   icon: '☕', monacoLang: 'java' },
    { id: 'cpp',    name: 'C++',    icon: '🔷', monacoLang: 'cpp' },
    { id: 'c',      name: 'C',      icon: '⚡', monacoLang: 'c' },
  ];

  // ─── Initialize code on language change ──────────────────────────────────────
  useEffect(() => {
    if (problemData?.codeTemplates) {
      setCode(problemData.codeTemplates[selectedLanguage as keyof typeof problemData.codeTemplates] || '');
    }
    setTestResults([]);
    setSummary(null);
    setExecutionError(null);
  }, [selectedLanguage, problemData]);

  // ─── Monaco mount handler ─────────────────────────────────────────────────────
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  // ─── Reset to template ────────────────────────────────────────────────────────
  const handleReset = () => {
    if (problemData?.codeTemplates) {
      setCode(problemData.codeTemplates[selectedLanguage as keyof typeof problemData.codeTemplates] || '');
    }
    setTestResults([]);
    setSummary(null);
    setExecutionError(null);
  };

  // ─── Mark problem as attempted (run) ───────────────────────────────────────────────
  const markProblemAsAttempted = async (problemId: string) => {
    try {
      const userId = "demo-user"; // In production, get from auth
      const response = await fetch(`http://localhost:5000/api/progress/${userId}/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId })
      });

      if (response.ok) {
        console.log('Problem marked as attempted:', problemId);
      }
    } catch (error) {
      console.error('Error marking problem as attempted:', error);
    }
  };

  // ─── Mark problem as solved (submit) ───────────────────────────────────────────────
  const markProblemAsSolved = async (problemId: string) => {
    try {
      const userId = "demo-user"; // In production, get from auth
      const response = await fetch(`http://localhost:5000/api/progress/${userId}/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId })
      });

      if (response.ok) {
        console.log('Problem marked as solved:', problemId);
      }
    } catch (error) {
      console.error('Error marking problem as solved:', error);
    }
  };

  // ─── Execute code ─────────────────────────────────────────────────────────────
  const executeCode = async (userCode: string, language: string, extendedTime = false, isSubmit = false) => {
    if (!userCode.trim()) return;

    setIsRunning(true);
    setExecutionError(null);
    setTestResults([]);
    setSummary(null);

    // Debug: log what we are sending
    console.log('[Run] testCases being sent:', JSON.stringify(testCases, null, 2));

    try {
      const response = await fetch('http://localhost:5000/api/compiler/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: userCode,
          language,
          testCases,
          timeLimit: extendedTime ? 60 : 50,
          memoryLimit: 128
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Execution failed');

      if (data.success) {
        const mapped = data.results.map((r: any) => ({
          input:    r.input,
          expected: r.expectedOutput ?? r.expected,
          actual:   r.actualOutput   ?? r.actual,
          passed:   r.passed,
          error:    r.error,
          status:   r.status
        }));
        setTestResults(mapped);
        setSummary(data.summary);
        setActiveTab('result');

        // Mark problem as attempted on run (not submit)
        if (!isSubmit && problemId) {
          markProblemAsAttempted(problemId);
        }

        // Mark problem as solved and show celebration only on submit if all test cases passed
        const allPassed = mapped.every((r: any) => r.passed);
        if (allPassed && problemId && isSubmit) {
          markProblemAsSolved(problemId);
          setShowCelebration(true);
        }
      } else {
        throw new Error(data.message || 'Execution failed');
      }

    } catch (err: any) {
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setExecutionError('⚠️ Cannot connect to backend. Make sure server is running: cd server && npm run dev');
      } else if (err.message.includes('neurohire-compiler')) {
        setExecutionError('⚠️ Docker image not found. Run: docker build -f Dockerfile.compiler -t neurohire-compiler:latest .');
      } else {
        setExecutionError(err.message || 'Failed to execute code');
      }
      setActiveTab('result');
    } finally {
      setIsRunning(false);
    }
  };

  const getMonacoLanguage = () =>
    languages.find(l => l.id === selectedLanguage)?.monacoLang ?? 'plaintext';

  // ─── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading problem...</p>
        </div>
      </div>
    );
  }

  if (!problemData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-foreground mb-2">Problem not found</p>
          <Link to="/candidate/problem-list" className="text-primary hover:underline">
            ← Back to Problem List
          </Link>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ── Top Bar ── */}
      <div className="h-12 bg-card border-b border-border/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/candidate/problem-list" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Problem List</span>
          </Link>
          <div className="h-4 w-px bg-border/50" />
          <button className="p-1.5 rounded hover:bg-muted/50">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => executeCode(code, selectedLanguage, false, false)}
            disabled={isRunning || !code.trim()}
            className="px-4 py-1.5 rounded text-sm border border-border/50 text-foreground hover:bg-muted/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRunning
              ? <><div className="w-3 h-3 border border-foreground border-t-transparent rounded-full animate-spin" />Running...</>
              : <><Play className="w-3 h-3" />Run</>
            }
          </button>
          <button
            onClick={() => executeCode(code, selectedLanguage, false, true)}
            disabled={isRunning || !code.trim()}
            className="px-4 py-1.5 rounded text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-3 h-3" />Submit
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex h-[calc(100vh-48px)]">

        {/* ── Left Panel ── */}
        <div
          className="bg-card border-r border-border/50 overflow-hidden flex flex-col"
          style={{ width: `${leftPanelWidth}%` }}
        >
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-lg font-semibold text-foreground">
                {problemData.title}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                problemData.difficulty === 'Easy'   ? 'bg-green-500/10 text-green-500' :
                problemData.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                                                      'bg-red-500/10 text-red-500'
              }`}>
                {problemData.difficulty}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs flex-wrap">
              {problemData.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Brain className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Topics:</span>
                  {problemData.tags.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-muted/50 rounded text-muted-foreground">{tag}</span>
                  ))}
                </div>
              )}
              {problemData.companies.length > 0 && (
                <div className="flex items-center gap-1 ml-4">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Companies:</span>
                  {problemData.companies.slice(0, 2).map((c: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-muted/50 rounded text-muted-foreground">{c}</span>
                  ))}
                </div>
              )}
              <button className="flex items-center gap-1 ml-4 text-muted-foreground hover:text-foreground">
                <Lightbulb className="w-3 h-3" /><span>Hint</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <p className="text-foreground leading-relaxed">{problemData.description}</p>

            {problemData.examples?.map((example: any, i: number) => (
              <div key={i} className="space-y-2">
                <h4 className="font-semibold text-foreground">Example {i + 1}:</h4>
                <div className="bg-muted/30 rounded-lg p-3 font-mono text-sm space-y-1">
                  <div className="text-foreground"><strong>Input:</strong> {example.input}</div>
                  <div className="text-foreground"><strong>Output:</strong> {example.output}</div>
                  {example.explanation && (
                    <div className="text-muted-foreground"><strong>Explanation:</strong> {example.explanation}</div>
                  )}
                </div>
              </div>
            ))}

            {problemData.constraints?.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-2">Constraints:</h4>
                <ul className="space-y-1">
                  {problemData.constraints.map((c: string, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground font-mono">• {c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1 hover:text-foreground">
                <ThumbsUp className="w-3 h-3" />
                <span>{((problemData.stats?.likes || 0) / 1000).toFixed(1)}k</span>
              </button>
              <button className="flex items-center gap-1 hover:text-foreground">
                <ThumbsDown className="w-3 h-3" />
                <span>{problemData.stats?.dislikes || 0}</span>
              </button>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{problemData.stats?.submissions || '0'}</span>
              </div>
            </div>
            <div className="text-primary font-medium">
              Accepted: {problemData.stats?.acceptance || '0%'}
            </div>
          </div>
        </div>

        {/* ── Resize Handle ── */}
        <div
          className="w-1 bg-border/50 cursor-col-resize hover:bg-primary/50 transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startW = leftPanelWidth;
            const onMove = (ev: MouseEvent) => {
              const newW = startW + ((ev.clientX - startX) / window.innerWidth) * 100;
              setLeftPanelWidth(Math.max(25, Math.min(70, newW)));
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        />

        {/* ── Right Panel ── */}
        <div className="flex-1 bg-card flex flex-col min-w-0">

          {/* Editor Header */}
          <div className="h-12 border-b border-border/50 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <Code className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Code</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded border border-border/50 text-sm text-foreground hover:bg-muted/30 transition-all"
                >
                  <span>{languages.find(l => l.id === selectedLanguage)?.icon}</span>
                  <span>{languages.find(l => l.id === selectedLanguage)?.name}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showLanguageDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-40 bg-card border border-border/50 rounded shadow-lg z-50">
                    {languages.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => { setSelectedLanguage(lang.id); setShowLanguageDropdown(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/30 transition-colors ${
                          selectedLanguage === lang.id ? 'bg-primary/10 text-primary' : 'text-foreground'
                        }`}
                      >
                        <span>{lang.icon}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleReset} title="Reset to template" className="p-1.5 rounded hover:bg-muted/50">
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1.5 rounded hover:bg-muted/50">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
              <button className="p-1.5 rounded hover:bg-muted/50">
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={getMonacoLanguage()}
              value={code}
              onChange={(value) => setCode(value ?? '')}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                bracketPairColorization: { enabled: true },
                quickSuggestions: true,
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: 'all',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
              }}
            />
          </div>

          {/* Bottom Panel */}
          <div className="h-52 border-t border-border/50 flex flex-col shrink-0">
            <div className="flex items-center justify-between border-b border-border/50 px-1">
              <div className="flex">
                {(['testcase', 'result'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                      activeTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'testcase' ? 'Testcase' : 'Test Result'}
                  </button>
                ))}
              </div>
              {summary && (
                <div className={`mr-3 px-3 py-1 rounded-full text-xs font-semibold ${
                  summary.percentage === 100 ? 'bg-green-500/15 text-green-400' :
                  summary.percentage >= 60  ? 'bg-yellow-500/15 text-yellow-400' :
                                              'bg-red-500/15 text-red-400'
                }`}>
                  {summary.passed}/{summary.total} passed ({summary.percentage}%)
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {activeTab === 'testcase' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Custom Input:</label>
                    <textarea
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder={testCases[0]?.input || 'Enter input...'}
                      className="w-full h-20 p-3 bg-muted/30 border border-border/50 rounded text-sm font-mono text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => executeCode(code, selectedLanguage, false)}
                      disabled={isRunning || !code.trim()}
                      className="px-3 py-1.5 bg-primary/20 text-primary border border-primary/40 rounded text-xs font-medium hover:bg-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Run Test Cases
                    </button>
                    <button
                      onClick={() => executeCode(code, selectedLanguage, true)}
                      disabled={isRunning || !code.trim()}
                      className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded text-xs font-medium hover:bg-yellow-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Run with extended time limit for debugging TLE issues"
                    >
                      🔍 Debug (Extended Time)
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click <strong>Run</strong> to test against {testCases.length} test case{testCases.length !== 1 ? 's' : ''}.
                    Use <strong>Debug</strong> for TLE troubleshooting with extended time limits.
                  </p>
                  {/* Show what inputs will be sent — helps debug */}
                  {testCases.length > 0 && (
                    <div className="text-xs text-muted-foreground font-mono bg-muted/20 p-2 rounded">
                      <div className="mb-1 text-muted-foreground/70">Test Case 1 input preview:</div>
                      <div className="whitespace-pre text-foreground/70">{testCases[0]?.input}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {executionError && (
                    <div className="flex items-start gap-2 p-3 rounded border border-red-500/30 bg-red-500/5 text-xs text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{executionError}</span>
                    </div>
                  )}
                  {!executionError && testResults.length === 0 && (
                    <div className="text-center text-muted-foreground py-6 text-sm">
                      Click <strong>Run</strong> to execute your code.
                    </div>
                  )}
                  {testResults.map((result, i) => (
                    <div key={i} className={`p-3 rounded border text-xs ${
                      result.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                    }`}>
                      <div className="flex items-center gap-2 mb-1.5">
                        {result.passed
                          ? <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          : <XCircle    className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        }
                        <span className="font-medium">
                          Test Case {i + 1} — {result.passed ? 'Passed ✓' : 'Failed ✗'}
                        </span>
                        {result.status === 'timeout' && <span className="ml-auto text-yellow-500">TLE</span>}
                        {result.status === 'error' && !result.passed && <span className="ml-auto text-red-400">Runtime Error</span>}
                      </div>
                      <div className="font-mono space-y-0.5 text-muted-foreground">
                        <div>Input:    <span className="text-foreground whitespace-pre">"{result.input}"</span></div>
                        <div>Expected: <span className="text-green-400">"{result.expected}"</span></div>
                        <div>Output:   <span className={result.passed ? 'text-green-400' : 'text-red-400'}>"{result.actual || result.error || 'no output'}"</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Celebration Card */}
      {showCelebration && problemData && (
        <CelebrationCard
          problemTitle={problemData.title}
          onClose={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
};

export default TechnicalCoding;