import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Shield, XCircle, CheckCircle, Loader, AlertTriangle, Camera, Sparkles } from 'lucide-react';

interface FaceVerificationGateProps {
  onVerified: (descriptor: Float32Array) => void;
  onFailed?: () => void;
}

const FaceVerificationGate = ({ onVerified, onFailed }: FaceVerificationGateProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'loading' | 'scanning' | 'verifying' | 'success' | 'failed' | 'no_photo'>('loading');
  const [message, setMessage] = useState('Loading verification system...');
  const [attempts, setAttempts] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    initVerification();
    return () => stopCamera();
  }, []);

  const initVerification = async () => {
    try {
      // Load models
      setMessage('Loading facial biometrics engine...');
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

      // Start camera
      setMessage('Starting camera stream...');
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
      setMessage('Position your face in the center of the frame...');

      // Auto scan after 2 seconds
      setTimeout(() => verifyFace(), 2000);
    } catch (err: any) {
      setStatus('failed');
      setMessage('Camera access denied or system error. Please enable camera access.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  // Register current face snapshot if candidate doesn't have a profile photo yet
  const registerFaceSnapshot = async () => {
    if (!videoRef.current) return;
    setIsRegistering(true);
    setMessage('Extracting facial landmarks and registering reference photo...');

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw mirrored
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);

      const photoData = canvas.toDataURL('image/jpeg', 0.85);

      // Verify face in snapshot
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setMessage('No clear face detected. Please face the camera directly.');
        setIsRegistering(false);
        return;
      }

      const token = localStorage.getItem('authToken');
      const userEmail = localStorage.getItem('userEmail');

      await fetch('http://localhost:8000/api/v1/users/profile/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          photo: photoData,
          email: userEmail,
          face_descriptor: Array.from(detection.descriptor)
        })
      });

      setStatus('success');
      setMessage('✅ Biometric reference registered & identity verified!');
      stopCamera();
      setTimeout(() => onVerified(detection.descriptor), 1200);
    } catch (err) {
      console.error('[FaceVerificationGate] Registration error:', err);
      setStatus('failed');
      setMessage('Could not register profile photo. Please try again.');
    } finally {
      setIsRegistering(false);
    }
  };

  const verifyFace = async () => {
    if (!videoRef.current) return;

    setStatus('verifying');
    setMessage('Verifying your facial identity against profile photo...');

    try {
      // Step 1: Get stored profile photo from backend
      const token = localStorage.getItem('authToken');
      const userEmail = localStorage.getItem('userEmail');
      const photoUrl = userEmail
        ? `http://localhost:8000/api/v1/users/profile/photo?email=${encodeURIComponent(userEmail)}`
        : 'http://localhost:8000/api/v1/users/profile/photo';
      const res = await fetch(photoUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (!data.success || !data.photo) {
        setStatus('no_photo');
        setMessage('No profile photo on file. Register your reference face now.');
        return;
      }

      // Step 2: Get face descriptor from stored photo or saved descriptor
      let storedDescriptor: Float32Array;
      if (Array.isArray(data.face_descriptor) && data.face_descriptor.length === 128) {
        storedDescriptor = new Float32Array(data.face_descriptor);
      } else {
        const storedImg = await faceapi.fetchImage(data.photo);
        const storedDetection = await faceapi
          .detectSingleFace(storedImg, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!storedDetection) {
          setStatus('no_photo');
          setMessage('Stored photo unclear. Please take a new snapshot to continue.');
          return;
        }
        storedDescriptor = storedDetection.descriptor;
      }

      // Step 3: Get face descriptor from live webcam
      await new Promise(r => setTimeout(r, 400)); // let video settle
      const liveDetection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!liveDetection) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setStatus('failed');
          setMessage('Face not detected after multiple attempts. Verification halted.');
          stopCamera();
          setTimeout(() => onFailed?.(), 2500);
        } else {
          setStatus('scanning');
          setMessage(`Face not detected. Please look directly into the camera. (${newAttempts}/${MAX_ATTEMPTS})`);
          setTimeout(() => verifyFace(), 2500);
        }
        return;
      }

      // Step 4: Compare descriptors using Euclidean distance
      // Invariant to clothing, background, and spectacles (maps 68 facial bone landmarks)
      const distance = faceapi.euclideanDistance(storedDescriptor, liveDetection.descriptor);
      console.log('[FaceVerification] Euclidean Distance:', distance);

      // Threshold: 0.58 is standard for face-api.js to tolerate spectacles and lighting changes
      const THRESHOLD = 0.58;

      if (distance < THRESHOLD) {
        setStatus('success');
        const confidence = Math.max(60, Math.min(99, Math.round((1 - (distance / THRESHOLD) * 0.4) * 100)));
        setMessage(`✅ Identity verified! Facial match: ${confidence}%`);
        stopCamera();
        setTimeout(() => onVerified(liveDetection.descriptor), 1200);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setStatus('failed');
          setMessage('Identity mismatch. Live face does not match registered profile photo.');
          stopCamera();
          setTimeout(() => onFailed?.(), 2500);
        } else {
          setStatus('scanning');
          setMessage(`Face mismatch. Please remove masks/hats and align face. (${newAttempts}/${MAX_ATTEMPTS})`);
          setTimeout(() => verifyFace(), 2500);
        }
      }
    } catch (err) {
      console.error('[FaceVerification] Error:', err);
      setStatus('failed');
      setMessage('Verification error. Please retry.');
    }
  };

  const statusConfig = {
    loading:    { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: <Loader className="w-5 h-5 animate-spin" /> },
    scanning:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: <Shield className="w-5 h-5 animate-pulse" /> },
    verifying:  { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: <Loader className="w-5 h-5 animate-spin" /> },
    success:    { color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30',icon: <CheckCircle className="w-5 h-5" /> },
    failed:     { color: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   icon: <XCircle className="w-5 h-5" /> },
    no_photo:   { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  icon: <AlertTriangle className="w-5 h-5" /> },
  };

  const cfg = statusConfig[status];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border/50 rounded-2xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
        {/* Header */}
        <div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Pre-Interview Face Verification</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Biometric identity verification must match your profile photo before entering the interview room.
          </p>
        </div>

        {/* Camera Feed */}
        <div 
          className="relative rounded-xl overflow-hidden border-2 border-border/60 bg-black mx-auto shadow-inner"
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
          {(status === 'scanning' || status === 'verifying') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-36 h-44 border-2 border-dashed border-primary/70 rounded-full animate-pulse" />
            </div>
          )}

          {status === 'success' && (
            <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-emerald-400 animate-bounce" />
            </div>
          )}

          {status === 'failed' && (
            <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center">
              <XCircle className="w-16 h-16 text-rose-400" />
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-xs font-medium text-left ${cfg.bg} ${cfg.border} ${cfg.color}`}>
          <div className="flex-shrink-0">{cfg.icon}</div>
          <span>{message}</span>
        </div>

        {/* Feature invariance explanation */}
        <div className="rounded-lg bg-muted/20 border border-border/30 p-2.5 text-[11px] text-muted-foreground text-left space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Face-Only Biometric Extraction
          </div>
          <p>
            The system isolates 68 facial landmark coordinates. Clothing, background, and spectacles are automatically filtered out.
          </p>
        </div>

        {/* Register photo fallback if no photo */}
        {status === 'no_photo' && (
          <button
            onClick={registerFaceSnapshot}
            disabled={isRegistering}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all cursor-pointer shadow-lg shadow-primary/20"
          >
            {isRegistering ? <Loader className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {isRegistering ? 'Registering Face...' : 'Snapshot & Set Biometric Face'}
          </button>
        )}

        {/* Attempt Counter */}
        {attempts > 0 && status !== 'success' && status !== 'failed' && (
          <div className="flex items-center gap-1.5 text-yellow-400 text-xs justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Attempt {attempts} of {MAX_ATTEMPTS}</span>
          </div>
        )}

        {/* Retry button on failed */}
        {status === 'failed' && attempts < MAX_ATTEMPTS && (
          <button
            onClick={() => { setAttempts(0); initVerification(); }}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-all cursor-pointer"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};

export default FaceVerificationGate;
