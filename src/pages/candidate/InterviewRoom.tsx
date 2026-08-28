import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GlassCard from "@/components/GlassCard";
import WaveformAnimation from "@/components/WaveformAnimation";
import SimliAvatar from "@/components/SimliAvatar";
import CandidateCamera from "@/components/CandidateCamera";
import { Brain, Camera, Clock, AlertTriangle, Mic, BarChart3, TrendingUp, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface InterviewData {
  id: number;
  job_id: number;
  candidate_id: number;
  scheduled_at: string;
  status: string;
  duration: number;
  score: number | null;
  feedback: string | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

interface TranscriptItem {
  speaker: 'ai' | 'candidate';
  text: string;
  timestamp: string;
}

interface EmotionMetrics {
  confidence: number;
  calm: number;
  engaged: number;
  stress: number;
}

const InterviewRoom = () => {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [terminated, setTerminated] = useState(false);
  const [emotionMetrics, setEmotionMetrics] = useState<EmotionMetrics>({
    confidence: 0,
    calm: 0,
    engaged: 0,
    stress: 0,
  });
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [avatarConnected, setAvatarConnected] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState(2);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [voiceStability, setVoiceStability] = useState(0);
  
  // WebSocket ref
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch interview data
  useEffect(() => {
    const fetchInterview = async () => {
      if (!interviewId) {
        setError("No interview ID provided");
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:8000/api/interviews/${interviewId}`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch interview data");
        }

        const data = await response.json();
        setInterviewData(data);
        setLoading(false);

        // Start interview if not already started
        if (data.status === "scheduled") {
          await startInterview();
        }
      } catch (err) {
        console.error("Error fetching interview:", err);
        setError("Failed to load interview");
        setLoading(false);
      }
    };

    fetchInterview();
  }, [interviewId]);

  // Start interview
  const startInterview = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8000/api/interviews/${interviewId}/start`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to start interview");
      }

      const data = await response.json();
      console.log("Interview started:", data);
    } catch (err) {
      console.error("Error starting interview:", err);
    }
  };

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!interviewId || !interviewData) return;

    const connectWebSocket = () => {
      const ws = new WebSocket(`ws://localhost:8000/api/ws/interview/${interviewId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("📡 WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different message types
          switch (data.type) {
            case "transcript":
              setTranscript(prev => [...prev, {
                speaker: data.speaker,
                text: data.text,
                timestamp: new Date().toISOString(),
              }]);
              break;
            
            case "emotion_analysis":
              setEmotionMetrics({
                confidence: data.confidence || 0,
                calm: data.calm || 0,
                engaged: data.engaged || 0,
                stress: data.stress || 0,
              });
              break;
            
            case "voice_stability":
              setVoiceStability(data.stability || 0);
              break;
            
            case "question_update":
              setCurrentQuestion(data.current || 0);
              setTotalQuestions(data.total || 10);
              setDifficulty(data.difficulty || 2);
              break;
            
            case "interview_ended":
              handleInterviewEnd();
              break;
          }
        } catch (err) {
          console.error("WebSocket message error:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("📡 WebSocket disconnected");
        // Attempt to reconnect after 3 seconds if not terminated
        if (!terminated) {
          setTimeout(connectWebSocket, 3000);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [interviewId, interviewData, terminated]);

  // Timer for elapsed time
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle interview termination
  const handleTerminate = async () => {
    if (!window.confirm("Are you sure you want to end the interview? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:8000/api/interviews/${interviewId}/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          early_termination: true,
        }),
      });

      setTerminated(true);
    } catch (err) {
      console.error("Error terminating interview:", err);
    }
  };

  // Handle interview end
  const handleInterviewEnd = () => {
    setTerminated(true);
    setTimeout(() => {
      navigate(`/candidate/interviews/${interviewId}/report`);
    }, 3000);
  };

  // Stable callback to prevent re-renders
  const handleAvatarConnectionChange = useCallback((connected: boolean) => {
    setAvatarConnected(connected);
  }, []);

  // Stable callback for camera stream
  const handleCameraStream = useCallback((stream: MediaStream) => {
    console.log('📹 Candidate camera stream available:', stream);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading interview...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !interviewData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive mb-4">{error || "Interview not found"}</p>
          <Link to="/candidate/dashboard" className="px-6 py-3 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Terminated state
  if (terminated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-glitch">
          <AlertTriangle className="w-20 h-20 text-destructive mx-auto mb-6" />
          <h1 className="font-display text-4xl text-destructive tracking-wider mb-4 neon-glow" style={{ textShadow: "0 0 10px hsl(0 84% 60% / 0.6), 0 0 40px hsl(0 84% 60% / 0.3)" }}>
            INTERVIEW ENDED
          </h1>
          <p className="text-muted-foreground mb-8">Redirecting to your report...</p>
          <Link to="/candidate/dashboard" className="px-6 py-3 rounded-lg border border-border/50 text-foreground text-sm hover:bg-muted/30 transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-sm tracking-widest text-foreground">INTERVIEW #{interviewData.id}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Question</span>
            <span className="font-display text-primary">{currentQuestion}/{totalQuestions}</span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-mono text-sm text-foreground">{formatTime(elapsedTime)}</span>
          </div>
          <div className="glass-panel px-4 py-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Difficulty</span>
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i <= difficulty ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
          </div>
          <button onClick={handleTerminate} className="p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main interview grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* AI Avatar Interviewer - LEFT SIDE */}
        <GlassCard variant="neon" hover={false} className="aspect-video relative">
          <SimliAvatar
            enabled={true}
            onConnectionChange={handleAvatarConnectionChange}
          />
        </GlassCard>

        {/* Candidate Camera - RIGHT SIDE */}
        <GlassCard variant="neon" hover={false} className="aspect-video relative">
          <CandidateCamera
            enabled={true}
            onStream={handleCameraStream}
          />
        </GlassCard>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Emotion Graph */}
        <GlassCard variant="neon" hover={false}>
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <BarChart3 className="w-3 h-3" /> Emotion Analysis
          </h4>
          <div className="space-y-2">
            {[
              { label: "Confidence", value: emotionMetrics.confidence, color: "bg-primary" },
              { label: "Calm", value: emotionMetrics.calm, color: "bg-neon-purple" },
              { label: "Engaged", value: emotionMetrics.engaged, color: "bg-primary" },
              { label: "Stress", value: emotionMetrics.stress, color: "bg-destructive" },
            ].map((e) => (
              <div key={e.label} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20">{e.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted/30">
                  <div className={`h-full rounded-full ${e.color} transition-all duration-500`} style={{ width: `${e.value}%` }} />
                </div>
                <span className="text-xs font-mono text-foreground w-8">{Math.round(e.value)}%</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Confidence Meter */}
        <GlassCard variant="neon" hover={false} className="flex flex-col items-center justify-center">
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Overall Confidence</h4>
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(222, 30%, 14%)" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                stroke="hsl(185, 100%, 50%)"
                strokeWidth="6"
                strokeDasharray={`${emotionMetrics.confidence * 2.64} ${264 - emotionMetrics.confidence * 2.64}`}
                strokeLinecap="round"
                className="drop-shadow-[0_0_8px_hsl(185_100%_50%/0.5)] transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-2xl text-primary neon-glow">{Math.round(emotionMetrics.confidence)}%</span>
            </div>
          </div>
        </GlassCard>

        {/* Voice Stability */}
        <GlassCard variant="neon" hover={false}>
          <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-3 h-3" /> Voice Stability
          </h4>
          <WaveformAnimation bars={24} className="h-16 mb-3" />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Stability</span>
            <span className="text-primary font-mono">{Math.round(voiceStability)}%</span>
          </div>
        </GlassCard>
      </div>

      {/* Transcript */}
      <GlassCard variant="neon" hover={false}>
        <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Live Transcript</h4>
        <div className="space-y-3 max-h-32 overflow-y-auto scrollbar-hidden">
          {transcript.slice(-5).map((item, index) => (
            <div key={index} className="flex gap-3">
              <span className={`text-xs font-mono shrink-0 ${
                item.speaker === 'ai' ? 'text-primary' : 'text-secondary'
              }`}>
                {item.speaker === 'ai' ? 'AI:' : 'YOU:'}
              </span>
              <p className={`text-sm ${
                item.speaker === 'ai' ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {item.text}
              </p>
            </div>
          ))}
          {transcript.length === 0 && (
            <div className="flex gap-3 items-center">
              <span className="text-xs text-primary font-mono shrink-0">AI:</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-pulse" />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-glow-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default InterviewRoom;
