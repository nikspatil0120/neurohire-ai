import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Shield, XCircle, CheckCircle, Loader, AlertTriangle } from 'lucide-react';

interface FaceVerificationGateProps {
  onVerified: () => void;
  onFailed: () => void;
}

const FaceVerificationGate = ({ onVerified, onFailed }: FaceVerificationGateProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'loading' | 'scanning' | 'verifying' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Loading verification system...');
  const [attempts, setAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    initVerification();
    return () => stopCamera();
  }, []);

  const initVerification = async () => {
    try {
      // Load models
      setMessage('Loading face verification models...');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

      // Start camera
      setMessage('Starting camera...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise(resolve => {
          videoRef.current!.onloadedmetadata = resolve;
        });
      }

      setStream(mediaStream);
      setStatus('scanning');
      setMessage('Position your face in the frame...');

      // Auto scan after 2 seconds
      setTimeout(() => verifyFace(mediaStream), 2000);
    } catch (err: any) {
      setStatus('failed');
      setMessage('Camera access denied or system error.');
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  const verifyFace = async (mediaStream?: MediaStream) => {
    if (!videoRef.current) return;

    setStatus('verifying');
    setMessage('Verifying your identity...');

    try {
      // Step 1: Get stored profile photo from backend
      const token = localStorage.getItem('authToken'); // Changed from 'token' to 'authToken'
      const res = await fetch('http://localhost:8000/api/v1/users/profile/photo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (!data.success || !data.photo) {
        setStatus('failed');
        setMessage('No profile photo found. Please set up your profile first.');
        return;
      }

      // Step 2: Get face descriptor from stored photo
      const storedImg = await faceapi.fetchImage(data.photo);
      const storedDetection = await faceapi
        .detectSingleFace(storedImg, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!storedDetection) {
        setStatus('failed');
        setMessage('Could not process profile photo. Please update your profile photo.');
        return;
      }

      // Step 3: Get face descriptor from live webcam
      await new Promise(r => setTimeout(r, 500)); // let video settle
      const liveDetection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!liveDetection) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setStatus('failed');
          setMessage('Face not detected after multiple attempts. Access denied.');
          stopCamera();
          setTimeout(onFailed, 2000);
        } else {
          setStatus('scanning');
          setMessage(`Face not detected. Please look directly at camera. (${newAttempts}/${MAX_ATTEMPTS})`);
          setTimeout(() => verifyFace(), 3000);
        }
        return;
      }

      // Step 4: Compare descriptors
      const distance = faceapi.euclideanDistance(
        storedDetection.descriptor,
        liveDetection.descriptor
      );

      console.log('[FaceVerification] Distance:', distance);

      // Threshold: lower = stricter. 0.5 is standard, 0.45 is strict
      const THRESHOLD = 0.5;

      if (distance < THRESHOLD) {
        setStatus('success');
        setMessage(`✅ Identity verified! Confidence: ${Math.round((1 - distance) * 100)}%`);
        stopCamera();
        setTimeout(onVerified, 1500);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setStatus('failed');
          setMessage('Identity verification failed. This incident has been logged.');
          stopCamera();

          // Log failed attempt to backend
          await fetch('http://localhost:5000/api/profile/verification-failed', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ distance, timestamp: new Date().toISOString() })
          }).catch(() => {});

          setTimeout(onFailed, 2000);
        } else {
          setStatus('scanning');
          setMessage(`Face mismatch. Please try again. (${newAttempts}/${MAX_ATTEMPTS})`);
          setTimeout(() => verifyFace(), 3000);
        }
      }
    } catch (err) {
      console.error('[FaceVerification] Error:', err);
      setStatus('failed');
      setMessage('Verification system error. Please try again.');
    }
  };

  const statusConfig = {
    loading:    { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: <Loader className="w-5 h-5 animate-spin" /> },
    scanning:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <Shield className="w-5 h-5 animate-pulse" /> },
    verifying:  { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: <Loader className="w-5 h-5 animate-spin" /> },
    success:    { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  icon: <CheckCircle className="w-5 h-5" /> },
    failed:     { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    icon: <XCircle className="w-5 h-5" /> },
  };

  const cfg = statusConfig[status];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border/50 rounded-2xl p-8 max-w-md w-full text-center space-y-6 shadow-xl">
        {/* Header */}
        <div>
          <Shield className="w-12 h-12 text-primary mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground">Identity Verification</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Please look at the camera to verify your identity before the interview
          </p>
        </div>

        {/* Camera Feed */}
        <div 
          className="relative rounded-xl overflow-hidden border-2 border-border/50 bg-black mx-auto"
          style={{ width: 280, height: 210 }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* Scanning overlay */}
          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-44 border-4 border-yellow-400 rounded-full animate-pulse opacity-70" />
            </div>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-green-400" />
            </div>
          )}

          {status === 'failed' && (
            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-16 h-16 text-red-400" />
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
          {cfg.icon}
          <span className="text-sm font-medium">{message}</span>
        </div>

        {/* Attempt Counter */}
        {attempts > 0 && status !== 'success' && status !== 'failed' && (
          <div className="flex items-center gap-2 text-yellow-400 text-xs justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Attempt {attempts} of {MAX_ATTEMPTS}</span>
          </div>
        )}

        {/* Retry button on failed */}
        {status === 'failed' && attempts < MAX_ATTEMPTS && (
          <button
            onClick={() => { setAttempts(0); initVerification(); }}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default FaceVerificationGate;
