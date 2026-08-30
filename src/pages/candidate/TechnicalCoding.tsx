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
  Code, ArrowLeft, Maximize2, Minimize2, ThumbsUp, ThumbsDown, Eye, Users
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
  const [activeTab, setActiveTab] = useState<'testcase' | 'result' | 'submissions'>('testcase');
  const [customInput, setCustomInput] = useState('');
  const [leftPanelWidth, setLeftPanelWidth] = useState(45);
  const [summary, setSummary] = useState<{ passed: number; total: number; percentage: number } | null>(null);
  const [problemData, setProblemData] = useState<Problem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundTheme, setBackgroundTheme] = useState<"normal" | "ruled">("normal");
  const [editorBgColor, setEditorBgColor] = useState<string>("#1e1e1e");
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [attemptCount, setAttemptCount] = useState(0);
  const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  // ─── Load submissions from MongoDB ────────────────────────────────────────────
  useEffect(() => {
    const loadSubmissions = async () => {
      if (!problemId) return;
      
      try {
        const userId = localStorage.getItem('googleUser') 
          ? JSON.parse(localStorage.getItem('googleUser')!).id 
          : 'demo-user';
        
        const response = await fetch(`http://localhost:5000/api/submissions/${userId}/${problemId}`);
        const data = await response.json();
        
        if (data.success && data.submissions) {
          // Convert MongoDB submissions to frontend format
          const formattedSubmissions = data.submissions.map((sub: any) => ({
            id: sub._id || sub.id,
            timestamp: sub.timestamp,
            date: new Date(sub.timestamp).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            time: new Date(sub.timestamp).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            status: sub.status,
            language: sub.language,
            code: sub.code,
            testResults: sub.testResults,
            summary: sub.summary,
            attemptNumber: sub.attemptNumber
          }));
          
          setSubmissions(formattedSubmissions);
          setAttemptCount(formattedSubmissions.length);
        }
      } catch (error) {
        console.error('Error loading submissions:', error);
      }
    };
    
    loadSubmissions();
  }, [problemId]);

  // ─── Save submission to MongoDB ───────────────────────────────────────────────
  const saveSubmission = async (submission: any) => {
    try {
      const userId = localStorage.getItem('googleUser') 
        ? JSON.parse(localStorage.getItem('googleUser')!).id 
        : 'demo-user';
      
      const response = await fetch('http://localhost:5000/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          problemId: problemId,
          problemTitle: problemData?.title || 'Unknown Problem',
          status: submission.status,
          language: submission.language,
          code: submission.code,
          testResults: submission.testResults,
          summary: submission.summary,
          attemptNumber: submission.attemptNumber
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Submission saved to MongoDB:', data.submission);
        return data.submission;
      } else {
        console.error('Failed to save submission:', data.message);
      }
    } catch (error) {
      console.error('Error saving submission to MongoDB:', error);
    }
  };

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
    
    // Apply transparent background for ruled mode
    if (backgroundTheme === "ruled") {
      const editorElement = editor.getDomNode();
      if (editorElement) {
        const monacoEditorBg = editorElement.querySelector('.monaco-editor-background');
        const overlayWidgets = editorElement.querySelector('.overflow-guard');
        if (monacoEditorBg) {
          (monacoEditorBg as HTMLElement).style.backgroundColor = 'transparent';
        }
        if (overlayWidgets) {
          (overlayWidgets as HTMLElement).style.backgroundColor = 'transparent';
        }
      }
    }
  };

  // Update editor background when theme changes
  useEffect(() => {
    if (editorRef.current) {
      const editorElement = editorRef.current.getDomNode();
      if (editorElement) {
        const monacoEditorBg = editorElement.querySelector('.monaco-editor-background');
        const overlayWidgets = editorElement.querySelector('.overflow-guard');
        if (monacoEditorBg) {
          (monacoEditorBg as HTMLElement).style.backgroundColor = backgroundTheme === "ruled" ? 'transparent' : '';
        }
        if (overlayWidgets) {
          (overlayWidgets as HTMLElement).style.backgroundColor = backgroundTheme === "ruled" ? 'transparent' : '';
        }
      }
    }
  }, [backgroundTheme]);

  // ─── UI Handlers ─────────────────────────────────────────────────────────────
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(err => {
        console.error('Exit fullscreen error:', err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ─── Settings handlers ────────────────────────────────────────────────────────
  const colorOptions = [
    { name: "Dark (Default)", value: "#1e1e1e" },
    { name: "Black", value: "#000000" },
    { name: "Dark Blue", value: "#1a1a2e" },
    { name: "Dark Purple", value: "#16213e" },
    { name: "Dark Gray", value: "#252525" },
    { name: "Light", value: "#ffffff" },
    { name: "Light Gray", value: "#f5f5f5" },
    { name: "Cream", value: "#faf8f1" },
  ];

  const applyEditorTheme = (bgColor: string) => {
    setEditorBgColor(bgColor);
    if (editorRef.current) {
      const isDark = bgColor === "#1e1e1e" || bgColor === "#000000" || bgColor === "#1a1a2e" || bgColor === "#16213e" || bgColor === "#252525";
      editorRef.current.updateOptions({
        theme: isDark ? 'vs-dark' : 'vs-light'
      });
    }
  };

  const toggleRuledLines = () => {
    setBackgroundTheme(prev => prev === "normal" ? "ruled" : "normal");
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

    // Increment attempt count for submissions
    if (isSubmit) {
      setAttemptCount(prev => prev + 1);
    }

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
        setActiveTab(isSubmit ? 'submissions' : 'result');

        // Mark problem as attempted on run (not submit)
        if (!isSubmit && problemId) {
          markProblemAsAttempted(problemId);
        }

        // Mark problem as solved and show celebration only on submit if all test cases passed
        const allPassed = mapped.every((r: any) => r.passed);
        
        // Save submission if this is a submit action
        if (isSubmit) {
          const submission = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            time: new Date().toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            status: allPassed ? 'Accepted' : 'Rejected',
            language: language,
            code: userCode,
            testResults: mapped,
            summary: data.summary,
            attemptNumber: attemptCount
          };
          
          // Save to MongoDB
          const savedSubmission = await saveSubmission(submission);
          
          // Update local state with MongoDB _id
          if (savedSubmission) {
            submission.id = savedSubmission._id || savedSubmission.id;
          }
          
          setSubmissions(prev => [submission, ...prev]);
          
          if (allPassed && problemId) {
            markProblemAsSolved(problemId);
            setShowCelebration(true);
          }
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
    <div ref={containerRef} className="min-h-screen bg-background">
      {/* Inject CSS for transparent Monaco background in ruled mode */}
      {backgroundTheme === "ruled" && (
        <style>{`
          .monaco-editor,
          .monaco-editor-background,
          .monaco-editor .margin {
            background-color: transparent !important;
          }
        `}</style>
      )}

      {/* ── Top Bar ── */}
      <div className="h-12 bg-card border-b border-border/50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/candidate/problem-list" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Problem List</span>
          </Link>
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
              <button 
                onClick={() => setShowSettings(!showSettings)}
                title="Editor settings" 
                className="p-1.5 rounded hover:bg-muted/50"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
              <button 
                onClick={handleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className="p-1.5 rounded hover:bg-muted/50"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div 
            className="flex-1 overflow-hidden relative"
            style={{
              backgroundColor: backgroundTheme === "ruled" ? editorBgColor : editorBgColor,
              backgroundImage: backgroundTheme === "ruled" 
                ? `repeating-linear-gradient(
                    transparent,
                    transparent 25px,
                    ${editorBgColor === "#ffffff" || editorBgColor === "#f5f5f5" || editorBgColor === "#faf8f1" 
                      ? 'rgba(0, 0, 0, 0.15)' 
                      : 'rgba(255, 255, 255, 0.1)'} 25px,
                    ${editorBgColor === "#ffffff" || editorBgColor === "#f5f5f5" || editorBgColor === "#faf8f1" 
                      ? 'rgba(0, 0, 0, 0.15)' 
                      : 'rgba(255, 255, 255, 0.1)'} 26px
                  )`
                : 'none',
              backgroundSize: backgroundTheme === "ruled" ? '100% 26px' : 'auto',
              backgroundPosition: backgroundTheme === "ruled" ? '0 12px' : '0 0'
            }}
          >
            <Editor
              height="100%"
              language={getMonacoLanguage()}
              value={code}
              onChange={(value) => setCode(value ?? '')}
              onMount={handleEditorDidMount}
              theme={editorBgColor === "#1e1e1e" || editorBgColor === "#000000" || editorBgColor === "#1a1a2e" || editorBgColor === "#16213e" || editorBgColor === "#252525" ? 'vs-dark' : 'vs-light'}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                lineNumbers: backgroundTheme === "ruled" ? 'off' : 'on',
                folding: true,
                bracketPairColorization: { enabled: true },
                quickSuggestions: true,
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: backgroundTheme === "ruled" ? 'none' : 'all',
                cursorBlinking: 'smooth',
                smoothScrolling: true,
                lineHeight: 26,
              }}
            />
          </div>

          {/* Bottom Panel */}
          <div className="h-52 border-t border-border/50 flex flex-col shrink-0">
            <div className="flex items-center justify-between border-b border-border/50 px-1">
              <div className="flex">
                {(['testcase', 'result', 'submissions'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                      activeTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'testcase' ? 'Testcase' : tab === 'result' ? 'Test Result' : 'Submissions'}
                    {tab === 'submissions' && submissions.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-primary/20 text-primary rounded text-xs">
                        {submissions.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {summary && activeTab !== 'submissions' && (
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
              ) : activeTab === 'result' ? (
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
              ) : (
                /* Submissions Tab */
                <div className="space-y-2">
                  {submissions.length === 0 ? (
                    <div className="text-center text-muted-foreground py-6 text-sm">
                      <Send className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No submissions yet</p>
                      <p className="text-xs mt-1">Click <strong>Submit</strong> to save your submission history</p>
                    </div>
                  ) : (
                    submissions.map((submission, idx) => (
                      <div 
                        key={submission.id} 
                        className={`border rounded-lg overflow-hidden ${
                          submission.status === 'Accepted' 
                            ? 'border-green-500/30 bg-green-500/5' 
                            : 'border-red-500/30 bg-red-500/5'
                        }`}
                      >
                        <div 
                          className="p-3 cursor-pointer hover:bg-muted/20 transition-colors"
                          onClick={() => setExpandedSubmission(expandedSubmission === idx ? null : idx)}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center gap-1.5 font-semibold ${
                                submission.status === 'Accepted' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {submission.status === 'Accepted' 
                                  ? <CheckCircle className="w-4 h-4" />
                                  : <XCircle className="w-4 h-4" />
                                }
                                {submission.status}
                              </div>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-foreground">{submission.date} at {submission.time}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">Attempt #{submission.attemptNumber}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-primary capitalize">{submission.language}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {submission.summary && (
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  submission.summary.percentage === 100 ? 'bg-green-500/20 text-green-400' :
                                  submission.summary.percentage >= 60  ? 'bg-yellow-500/20 text-yellow-400' :
                                                                         'bg-red-500/20 text-red-400'
                                }`}>
                                  {submission.summary.passed}/{submission.summary.total} passed
                                </span>
                              )}
                              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${
                                expandedSubmission === idx ? 'rotate-180' : ''
                              }`} />
                            </div>
                          </div>
                        </div>
                        
                        {expandedSubmission === idx && (
                          <div className="border-t border-border/50 p-3 space-y-3">
                            {/* Test Results */}
                            <div>
                              <h4 className="text-xs font-semibold text-foreground mb-2">Test Results:</h4>
                              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {submission.testResults.map((result: any, i: number) => (
                                  <div key={i} className="text-xs flex items-center gap-2 p-2 rounded bg-muted/30">
                                    {result.passed 
                                      ? <CheckCircle className="w-3 h-3 text-green-500" />
                                      : <XCircle className="w-3 h-3 text-red-500" />
                                    }
                                    <span className="text-muted-foreground">Test {i + 1}:</span>
                                    <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                                      {result.passed ? 'Passed' : 'Failed'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Submitted Code */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-foreground">Submitted Code:</h4>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(submission.code);
                                  }}
                                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </button>
                              </div>
                              <pre className="text-xs bg-muted/50 p-3 rounded font-mono overflow-x-auto max-h-48 overflow-y-auto">
                                <code className="text-foreground">{submission.code}</code>
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSettings(false)}>
          <div className="bg-card border border-border/50 rounded-lg shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Editor Settings
              </h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 rounded hover:bg-muted/50"
              >
                <XCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Background Color Options */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Editor Background Color
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => applyEditorTheme(option.value)}
                      className={`flex items-center gap-3 p-3 rounded border transition-all ${
                        editorBgColor === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded border border-border/50 shrink-0"
                        style={{ backgroundColor: option.value }}
                      />
                      <span className="text-sm text-foreground">{option.name}</span>
                      {editorBgColor === option.value && (
                        <Check className="w-4 h-4 text-primary ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ruled Lines Toggle */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Page Style
                </label>
                <button
                  onClick={toggleRuledLines}
                  className={`w-full flex items-center justify-between p-4 rounded border transition-all ${
                    backgroundTheme === "ruled"
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div className="text-left">
                      <div className="text-sm font-medium text-foreground">Ruled Lines</div>
                      <div className="text-xs text-muted-foreground">Add horizontal lines to editor</div>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-all ${
                    backgroundTheme === "ruled" ? 'bg-primary' : 'bg-muted'
                  }`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform transform ${
                      backgroundTheme === "ruled" ? 'translate-x-5' : 'translate-x-0.5'
                    } mt-0.5`} />
                  </div>
                </button>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 rounded bg-muted/30 border border-border/50">
                <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Ruled lines adapt to your background: black lines for light backgrounds, white lines for dark backgrounds.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalCoding;