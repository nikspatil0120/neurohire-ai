import { useEffect, useRef, useState, useCallback } from 'react';
import { Brain, Volume2, WifiOff, Loader2 } from 'lucide-react';
import WaveformAnimation from './WaveformAnimation';

interface LiveTalkingAvatarProps {
  enabled?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export const LiveTalkingAvatar = ({ enabled = true, onConnectionChange }: LiveTalkingAvatarProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingVideoStreamRef = useRef<MediaStream | null>(null);
  const pendingAudioStreamRef = useRef<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [videoDebug, setVideoDebug] = useState<string>('No video');

  // LiveTalking WebRTC connection
  const connectToLiveTalking = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const config = {
        sdpSemantics: 'unified-plan' as const,
        iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
      };

      const pc = new RTCPeerConnection(config);
      pcRef.current = pc;

      // Handle incoming tracks (video/audio from avatar)
      pc.addEventListener('track', (evt) => {
        console.log('📺 Received track:', evt.track.kind, 'readyState:', evt.track.readyState);
        
        if (evt.track.kind === 'video') {
          console.log('🎬 Storing video stream for later assignment...');
          pendingVideoStreamRef.current = evt.streams[0];
        } else if (evt.track.kind === 'audio') {
          console.log('🔊 Storing audio stream for later assignment...');
          pendingAudioStreamRef.current = evt.streams[0];
        }
      });

      // Add transceivers for receiving video and audio
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', checkState);
              resolve();
            }
          };
          pc.addEventListener('icegatheringstatechange', checkState);
        }
      });

      // Send offer to LiveTalking
      const response = await fetch('http://localhost:8010/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
        }),
      });

      const answer = await response.json();
      setSessionId(answer.sessionid);
      console.log('📝 Session ID:', answer.sessionid);

      // Set remote description
      await pc.setRemoteDescription(answer);

      setIsConnected(true);
      setIsConnecting(false);
      onConnectionChange?.(true);
      console.log('✅ LiveTalking connected!');

    } catch (err) {
      console.error('❌ LiveTalking connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
      setIsConnected(false);
      onConnectionChange?.(false);
    }
  };

  // Send text to avatar - use useCallback to prevent recreating function
  const sendText = useCallback(async (text: string) => {
    if (!sessionId) {
      console.error('No session ID');
      return;
    }

    try {
      await fetch('http://localhost:8010/human', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sessionid: sessionId,
          type: 'echo', // Direct speech without LLM
          interrupt: false,
        }),
      });
      console.log('📤 Sent text to avatar:', text);
    } catch (err) {
      console.error('❌ Failed to send text:', err);
    }
  }, [sessionId]);

  // Assign pending streams to refs once they're ready
  useEffect(() => {
    if (pendingVideoStreamRef.current && videoRef.current) {
      console.log('✅ Assigning pending video stream to element');
      videoRef.current.srcObject = pendingVideoStreamRef.current;
      pendingVideoStreamRef.current = null;
      
      // Monitor video dimensions
      const checkVideo = setInterval(() => {
        if (videoRef.current) {
          const w = videoRef.current.videoWidth;
          const h = videoRef.current.videoHeight;
          const ready = videoRef.current.readyState;
          console.log(`🎬 Video monitor: ${w}x${h}, readyState:${ready}`);
          if (w > 0 && h > 0) {
            setVideoDebug(`${w}x${h}`);
          } else {
            setVideoDebug(`Waiting (ready:${ready})`);
          }
        }
      }, 1000);
      
      return () => clearInterval(checkVideo);
    }
  }, [isConnected]);

  useEffect(() => {
    if (pendingAudioStreamRef.current && audioRef.current) {
      console.log('✅ Assigning pending audio stream to element');
      audioRef.current.srcObject = pendingAudioStreamRef.current;
      pendingAudioStreamRef.current = null;
    }
  }, [isConnected]);

  // Auto-connect on mount
  useEffect(() => {
    if (enabled) {
      connectToLiveTalking();
    }

    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [enabled]);

  // Send initial welcome message when connected
  useEffect(() => {
    if (isConnected && sessionId) {
      // Wait a moment for WebRTC to fully stabilize, then send welcome
      const timer = setTimeout(() => {
        sendText("Hello! I'm your AI interviewer today. I'll be asking you some questions to assess your skills and experience. Let's begin with a simple one: Can you tell me about yourself and your background?");
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, sessionId, sendText]);

  // Expose sendText method
  useEffect(() => {
    // Store reference for parent component
    (window as any).sendAvatarText = sendText;
  }, [sendText]);

  if (error) {
    return (
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-sm text-destructive mb-2">Avatar Connection Failed</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <button
            onClick={connectToLiveTalking}
            className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm hover:bg-primary/20 transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (isConnecting) {
    return (
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Connecting to AI Interviewer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-cover"
        style={{ display: 'block', backgroundColor: '#1a1a1a' }}
      />

      {/* Audio element */}
      <audio 
        ref={audioRef} 
        autoPlay
      />

      {/* Status indicator */}
      <div className="absolute top-4 right-4 glass-panel px-3 py-2 bg-slate-900/80 backdrop-blur-md border border-primary/30 z-10">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-glow-pulse`} />
          <span className="text-xs font-medium text-foreground">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Label */}
      <div className="absolute top-4 left-4 glass-panel px-3 py-2 bg-slate-900/80 backdrop-blur-md border border-primary/30 z-10">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">AI Interviewer</span>
        </div>
      </div>
      
      {/* Debug: Session ID and Video Info */}
      {sessionId && (
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-black/70 px-2 py-1 rounded font-mono">
          <div>Session: {sessionId.substring(0, 8)}...</div>
          <div>Video: {videoDebug}</div>
        </div>
      )}
    </div>
  );
};

export default LiveTalkingAvatar;
