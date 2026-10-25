import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2, AlertCircle } from 'lucide-react';

interface CandidateCameraProps {
  onStream?: (stream: MediaStream) => void;
  enabled?: boolean;
}

export const CandidateCamera = ({ onStream, enabled = true }: CandidateCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(false); // Changed to false to render video immediately
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    const startCamera = async () => {
      try {
        setError(null);

        console.log('🎥 Starting camera, videoRef:', videoRef.current);

        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false, // Audio is handled separately by AIAvatarInterviewer
        });

        if (!mounted) {
          // Component unmounted, stop tracks
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        // Attach to video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('📹 Video element srcObject set');
          
          // Force play
          await videoRef.current.play();
          console.log('▶️ Video playing successfully');
        } else {
          console.error('❌ videoRef.current is null after camera start!');
        }

        setHasPermission(true);
        onStream?.(stream);

        console.log('✅ Candidate camera started');
      } catch (err) {
        console.error('❌ Camera access error:', err);
        if (!mounted) return;
        
        setError('Camera access denied. Please allow camera access to continue.');
        setHasPermission(false);
      }
    };

    // Wait a bit for DOM to be ready
    const timeoutId = setTimeout(() => {
      startCamera();
    }, 500);

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      mounted = false;
      if (streamRef.current) {
        console.log('🛑 Stopping camera stream');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [enabled, onStream]);

  // Always render video element (no loading state prevents rendering)
  // Error state
  if (error) {
    return (
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900">
        {/* Video element - always present */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ 
            transform: 'scaleX(-1)',
            zIndex: 1
          }}
        />
        
        {/* Error overlay */}
        <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center border-2 border-destructive/30 z-20">
          <div className="text-center px-6">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-sm text-destructive mb-2">Camera Not Available</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-primary text-sm hover:bg-primary/20 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Camera feed - always render video element
  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ 
          transform: 'scaleX(-1)',
          position: 'relative',
          zIndex: 1,
          display: 'block',
          backgroundColor: '#000'
        }}
      />

      {/* Overlay with status */}
      <div className="absolute top-4 right-4 glass-panel px-3 py-2 bg-slate-900/80 backdrop-blur-md border border-red-500/50 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-glow-pulse" />
          <span className="text-xs font-medium text-foreground">LIVE</span>
        </div>
      </div>

      {/* Label */}
      <div className="absolute top-4 left-4 glass-panel px-3 py-2 bg-slate-900/80 backdrop-blur-md border border-primary/30 z-10">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Your Camera</span>
        </div>
      </div>

      {/* Camera disabled overlay */}
      {!enabled && (
        <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center z-20">
          <div className="text-center">
            <CameraOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Camera Disabled</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateCamera;
