import { useEffect, useRef, useState, useCallback } from 'react';
import { Brain, Mic, Volume2, WifiOff, Loader2 } from 'lucide-react';
import WaveformAnimation from './WaveformAnimation';

interface AIAvatarInterviewerProps {
  interviewId: string;
  onTranscript?: (text: string, speaker: 'ai' | 'candidate') => void;
  onEmotionUpdate?: (emotions: EmotionData) => void;
  onConnectionChange?: (connected: boolean) => void;
  enabled?: boolean;
}

interface EmotionData {
  confidence: number;
  calm: number;
  engaged: number;
  stress: number;
}

interface AvatarMessage {
  type: 'video_chunk' | 'transcript' | 'speaking_state' | 'emotion' | 'question' | 'error';
  data?: any;
  text?: string;
  speaker?: 'ai' | 'candidate';
  speaking?: boolean;
  emotions?: EmotionData;
  question?: string;
  error?: string;
}

export const AIAvatarInterviewer = ({
  interviewId,
  onTranscript,
  onEmotionUpdate,
  onConnectionChange,
  enabled = true,
}: AIAvatarInterviewerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isConnectingRef = useRef<boolean>(false);

  // Get WebSocket URL from environment
  const getWebSocketUrl = () => {
    const wsUrl = import.meta.env.VITE_AVATAR_WS_URL || 'ws://localhost:8000/api/ws/avatar';
    return `${wsUrl}/${interviewId}`;
  };

  // Connect to avatar service
  const connectToAvatarService = useCallback(() => {
    if (!enabled || isConnectingRef.current) return;

    // Limit reconnection attempts
    if (reconnectAttemptsRef.current >= 10) {
      console.log('❌ Max reconnection attempts reached. Giving up.');
      setConnectionError('Unable to connect to avatar service. Please refresh the page.');
      return;
    }

    isConnectingRef.current = true;
    reconnectAttemptsRef.current += 1;

    try {
      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const ws = new WebSocket(getWebSocketUrl());

      ws.onopen = () => {
        console.log('✅ Avatar service connected');
        setIsConnected(true);
        setConnectionError(null);
        onConnectionChange?.(true);
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0; // Reset on successful connection

        // Send initial handshake
        ws.send(JSON.stringify({
          type: 'init',
          interviewId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: AvatarMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'video_chunk':
              // Handle video streaming (for future implementation)
              // For now, we'll use a placeholder or pre-recorded video
              break;

            case 'transcript':
              if (message.text && message.speaker) {
                onTranscript?.(message.text, message.speaker);
              }
              break;

            case 'speaking_state':
              setIsSpeaking(message.speaking || false);
              break;

            case 'emotion':
              if (message.emotions) {
                onEmotionUpdate?.(message.emotions);
              }
              break;

            case 'question':
              if (message.question) {
                // AI is asking a question
                setIsSpeaking(true);
                onTranscript?.(message.question, 'ai');
                
                // Simulate speaking duration based on text length
                const duration = (message.question.length / 15) * 1000; // ~15 chars per second
                setTimeout(() => setIsSpeaking(false), duration);
              }
              break;

            case 'error':
              console.error('Avatar service error:', message.error);
              setConnectionError(message.error || 'Unknown error');
              break;
          }
        } catch (error) {
          console.error('Failed to parse avatar message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Avatar WebSocket error:', error);
        setConnectionError('Connection error');
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        console.log('Avatar service disconnected', event.code, event.reason);
        setIsConnected(false);
        onConnectionChange?.(false);
        isConnectingRef.current = false;

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Only attempt reconnect if it wasn't a clean close and we haven't exceeded attempts
        if (enabled && event.code !== 1000 && reconnectAttemptsRef.current < 10) {
          const delay = Math.min(5000 * reconnectAttemptsRef.current, 30000); // Exponential backoff, max 30s
          console.log(`Attempting to reconnect in ${delay / 1000}s... (attempt ${reconnectAttemptsRef.current + 1}/10)`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connectToAvatarService();
          }, delay);
        } else if (reconnectAttemptsRef.current >= 10) {
          setConnectionError('Connection failed after multiple attempts');
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to avatar service:', error);
      setConnectionError('Failed to connect to avatar service');
    }
  }, [enabled, interviewId, onConnectionChange, onTranscript, onEmotionUpdate]);

  // Start microphone for candidate audio
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && event.data.size > 0) {
          // Convert blob to base64 and send
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result?.toString().split(',')[1];
            if (base64Audio) {
              wsRef.current?.send(JSON.stringify({
                type: 'audio',
                data: base64Audio,
              }));
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Send audio chunks every 500ms
      mediaRecorder.start(500);
      mediaRecorderRef.current = mediaRecorder;
      setIsListening(true);

      console.log('🎤 Microphone started for candidate audio');
    } catch (error) {
      console.error('Microphone access denied:', error);
      // Don't show error - microphone is optional for now
      console.log('Continuing without microphone - text responses can still work');
    }
  }, []);

  // Stop microphone
  const stopMicrophone = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    setIsListening(false);
    console.log('🎤 Microphone stopped');
  }, []);

  // Initialize connection and microphone
  useEffect(() => {
    if (enabled) {
      connectToAvatarService();
    }

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      stopMicrophone();
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting'); // Clean close
        wsRef.current = null;
      }
      isConnectingRef.current = false;
      reconnectAttemptsRef.current = 0;
    };
  }, [enabled]);

  // Auto-start microphone when connected
  useEffect(() => {
    if (isConnected && enabled && !mediaRecorderRef.current) {
      const startTimeout = setTimeout(() => {
        startMicrophone();
      }, 1000);

      return () => clearTimeout(startTimeout);
    }
  }, [isConnected, enabled, startMicrophone]);

  // Render connection error
  if (connectionError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 rounded-lg border border-destructive/30">
        <WifiOff className="w-12 h-12 text-destructive mb-4" />
        <p className="text-sm text-destructive mb-2">Avatar Service Unavailable</p>
        <p className="text-xs text-muted-foreground mb-4">{connectionError}</p>
        <button
          onClick={() => {
            setConnectionError(null);
            reconnectAttemptsRef.current = 0; // Reset attempts
            isConnectingRef.current = false;
            connectToAvatarService();
          }}
          className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm hover:bg-primary/20 transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Render loading state
  if (!isConnected && !connectionError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/20 rounded-lg">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Connecting to AI Interviewer...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Avatar Video Display */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        {/* Placeholder for MuseTalk/LiveTalking avatar video */}
        {/* This will show the AI interviewer's talking head */}
        <div className="relative w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center" style={{ zIndex: 2 }}>
          
          {/* Placeholder Avatar Image - Replace with actual video stream from MuseTalk */}
          <div className="relative w-full h-full flex items-center justify-center" style={{ zIndex: 3 }}>
            {/* Professional avatar silhouette placeholder */}
            <div className="relative" style={{ zIndex: 4 }}>
              {/* Avatar head silhouette */}
              <div className={`relative w-64 h-64 rounded-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center border-4 transition-all duration-300 ${
                isSpeaking 
                  ? 'border-primary shadow-[0_0_40px_rgba(59,130,246,0.5)]' 
                  : 'border-primary/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
              }`} style={{ zIndex: 5 }}>
                {/* Inner avatar */}
                <div className="w-60 h-60 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center relative overflow-hidden" style={{ zIndex: 6 }}>
                  {/* Simple professional avatar representation */}
                  <div className="absolute inset-0 flex items-end justify-center pb-8">
                    {/* Head */}
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/50 to-blue-400/50 mb-4" />
                      {/* Shoulders */}
                      <div className="w-48 h-32 rounded-t-full bg-gradient-to-br from-primary/40 to-blue-400/40 -mt-8" />
                    </div>
                  </div>
                  
                  {/* AI Badge */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel px-3 py-1 bg-primary/20 border border-primary/50" style={{ zIndex: 10 }}>
                    <div className="flex items-center gap-2">
                      <Brain className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-primary">AI Interviewer</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Speaking waveform */}
              {isSpeaking && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-full flex justify-center" style={{ zIndex: 7 }}>
                  <WaveformAnimation bars={24} className="h-10 w-72" />
                </div>
              )}
            </div>

            {/* Pulsing glow when speaking */}
            {isSpeaking && (
              <div className="absolute inset-0 bg-primary/5 animate-pulse pointer-events-none" style={{ zIndex: 1 }} />
            )}
          </div>
        </div>

        {/* Video element for MuseTalk avatar streaming */}
        {/* When MuseTalk is integrated, this will show the real talking head video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ 
            display: 'block', // Always show video element
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 100,
            backgroundColor: '#000'
          }}
        />
      </div>

      {/* Status Overlay - Bottom Left */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 z-10">
        <div className="glass-panel px-4 py-2 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-primary/30">
          <Brain className={`w-4 h-4 ${isConnected ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className="text-sm font-medium text-foreground">
            {isSpeaking ? 'AI Speaking...' : 'AI Listening'}
          </span>
          {isSpeaking && (
            <Volume2 className="w-4 h-4 text-primary animate-glow-pulse" />
          )}
        </div>
      </div>

      {/* Connection Status Indicator - Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 glass-panel px-4 py-2 bg-slate-900/90 backdrop-blur-md border border-primary/30 z-10">
        <div className={`w-2.5 h-2.5 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        } animate-glow-pulse`} />
        <span className="text-sm font-medium text-foreground">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Speaking State Visualization */}
      {isSpeaking && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-primary/5 animate-pulse" />
        </div>
      )}
    </div>
  );
};

export default AIAvatarInterviewer;
