import { useEffect, useRef, useState } from 'react';
import { Room, Track, RoomEvent } from 'livekit-client';
import { Brain, WifiOff, Loader2 } from 'lucide-react';

interface SimliAvatarProps {
  enabled?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export const SimliAvatar = ({ enabled = true, onConnectionChange }: SimliAvatarProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>('');
  const [videoStatus, setVideoStatus] = useState<string>('No video');

  const connectToRoom = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Create session via backend
      const response = await fetch('http://localhost:8000/api/simli/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_name: 'Candidate',
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error('Failed to create session');
      }

      const { room_name, candidate_token, livekit_url } = result.data;
      setRoomName(room_name);
      console.log('📝 Room created:', room_name);

      // Connect to LiveKit room
      const room = new Room();
      roomRef.current = room;

      // Handle track subscriptions (avatar video/audio)
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('📺 Track subscribed:', track.kind, 'from', participant.identity);
        
        if (track.kind === Track.Kind.Video && videoRef.current) {
          const videoEl = videoRef.current;
          track.attach(videoEl);
          console.log('✅ Video track attached');
          setVideoStatus('Video connected');
          
          // Monitor video dimensions
          const checkDimensions = setInterval(() => {
            if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
              setVideoStatus(`${videoEl.videoWidth}x${videoEl.videoHeight}`);
            } else {
              setVideoStatus('Waiting for frames...');
            }
          }, 1000);
          
          // Clean up interval when track ends
          const handleTrackEnded = () => {
            clearInterval(checkDimensions);
            setVideoStatus('Track ended');
          };
          
          if (track.mediaStreamTrack) {
            track.mediaStreamTrack.addEventListener('ended', handleTrackEnded);
          }
        }
        
        if (track.kind === Track.Kind.Audio && audioRef.current) {
          const audioEl = audioRef.current;
          track.attach(audioEl);
          console.log('✅ Audio track attached');
        }
      });

      // Handle connection state
      room.on(RoomEvent.Connected, () => {
        console.log('✅ Connected to room');
        setIsConnected(true);
        setIsConnecting(false);
        onConnectionChange?.(true);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log('❌ Disconnected from room');
        setIsConnected(false);
        onConnectionChange?.(false);
      });

      // Connect to the room
      await room.connect(livekit_url, candidate_token);
      console.log('🔗 Connecting to LiveKit...');

    } catch (err) {
      console.error('❌ Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
      setIsConnected(false);
      onConnectionChange?.(false);
    }
  };

  // Auto-connect on mount
  useEffect(() => {
    if (enabled) {
      connectToRoom();
    }

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [enabled]);

  if (error) {
    return (
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <WifiOff className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-sm text-destructive mb-2">Avatar Connection Failed</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <button
            onClick={connectToRoom}
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
        className="w-full h-full object-cover"
        style={{ display: 'block', backgroundColor: '#1a1a1a' }}
      />

      {/* Audio element */}
      <audio ref={audioRef} autoPlay />

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
          <span className="text-xs font-medium text-foreground">AI Interviewer (Simli)</span>
        </div>
      </div>

      {/* Debug info */}
      {roomName && (
        <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-black/70 px-2 py-1 rounded font-mono">
          <div>Room: {roomName.substring(0, 20)}...</div>
          <div>Video: {videoStatus}</div>
        </div>
      )}
    </div>
  );
};

export default SimliAvatar;
