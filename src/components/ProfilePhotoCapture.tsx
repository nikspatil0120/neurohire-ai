import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, CheckCircle, RefreshCw, Loader } from 'lucide-react';

interface ProfilePhotoCaptureProps {
  onPhotoSaved: (photo: string) => void;
}

const ProfilePhotoCapture = ({ onPhotoSaved }: ProfilePhotoCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Click "Start Camera" to begin');
  const [countdown, setCountdown] = useState<number | null>(null);
  const detectionInterval = useRef<any>(null);
  const countdownInterval = useRef<any>(null);
  const autoCaptureTimeout = useRef<any>(null);
  const isCountingDown = useRef<boolean>(false);

  // Load face-api models on mount (but don't start camera)
  useEffect(() => {
    const loadModels = async () => {
      try {
        setStatus('Loading face detection models...');
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setModelsLoaded(true);
        setStatus('Click "Start Camera" to begin');
      } catch (err) {
        setError('Failed to load face detection models. Please refresh.');
        setIsLoading(false);
      }
    };

    loadModels();

    return () => {
      stopCamera();
      if (detectionInterval.current) clearInterval(detectionInterval.current);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      if (autoCaptureTimeout.current) clearTimeout(autoCaptureTimeout.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setStatus('Starting camera...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setStream(mediaStream);
      setCameraStarted(true);
      setIsLoading(false);
      setStatus('Position your face in the frame');
      startFaceDetection();
    } catch (err) {
      setError('Camera access denied. Please allow camera permission.');
      setIsLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraStarted(false);
    }
  };

  const startFaceDetection = () => {
    detectionInterval.current = setInterval(async () => {
      if (!videoRef.current || !modelsLoaded) return;

      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      );

      if (detection) {
        if (!faceDetected && !isCountingDown.current) {
          // Face just detected and no countdown running - start countdown
          setFaceDetected(true);
          setStatus('✅ Face detected! Auto-capturing...');
          startCountdown();
        }
      } else {
        if (faceDetected) {
          // Face lost - cancel countdown
          setFaceDetected(false);
          setStatus('👤 Position your face in the frame');
          cancelCountdown();
        }
      }
    }, 500);
  };

  const startCountdown = () => {
    // Clear any existing countdown
    cancelCountdown();
    
    // Set flag to prevent multiple countdowns
    isCountingDown.current = true;
    setCountdown(5);
    
    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          cancelCountdown();
          // Auto capture after countdown
          autoCaptureTimeout.current = setTimeout(() => {
            capturePhoto();
          }, 100);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
    }
    if (autoCaptureTimeout.current) {
      clearTimeout(autoCaptureTimeout.current);
      autoCaptureTimeout.current = null;
    }
    setCountdown(null);
    isCountingDown.current = false;
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the image (selfie style)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const photo = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photo);
    setStatus('Photo captured! Save or retake.');

    // Stop camera after capture
    stopCamera();

    // Stop face detection and countdown
    if (detectionInterval.current) clearInterval(detectionInterval.current);
    cancelCountdown();
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setStatus('Click "Start Camera" to begin');
    setFaceDetected(false);
    setCameraStarted(false);
    isCountingDown.current = false;
    cancelCountdown();
  };

  const savePhoto = async () => {
    if (!capturedPhoto) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const userEmail = localStorage.getItem('userEmail') || 'sahilghogaressg06@gmail.com'; // Fallback for development
      console.log('[ProfilePhotoCapture] ===== SAVE PHOTO START =====');
      console.log('[ProfilePhotoCapture] Token found:', token ? 'Yes' : 'No');
      console.log('[ProfilePhotoCapture] Token value:', token);
      console.log('[ProfilePhotoCapture] Photo size:', capturedPhoto.length, 'characters');
      console.log('[ProfilePhotoCapture] User email:', userEmail);
      
      const requestBody = { photo: capturedPhoto, email: userEmail };
      console.log('[ProfilePhotoCapture] Request URL:', 'http://localhost:8000/api/v1/users/profile/photo');
      console.log('[ProfilePhotoCapture] Request headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token?.substring(0, 30)}...`
      });
      
      const response = await fetch('http://localhost:8000/api/v1/users/profile/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[ProfilePhotoCapture] Response status:', response.status);
      console.log('[ProfilePhotoCapture] Response ok:', response.ok);
      
      const data = await response.json();
      console.log('[ProfilePhotoCapture] Response data:', data);

      if (data.success) {
        console.log('[ProfilePhotoCapture] ✅ SUCCESS! Photo saved');
        setStatus('✅ Profile photo saved successfully!');
        stopCamera();
        onPhotoSaved(capturedPhoto);
      } else {
        console.error('[ProfilePhotoCapture] ❌ FAILED:', data);
        console.error('[ProfilePhotoCapture] Full response:', JSON.stringify(data, null, 2));
        setError(data.message || data.detail || 'Failed to save photo. Please try again.');
      }
    } catch (err) {
      console.error('[ProfilePhotoCapture] ❌ EXCEPTION:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
      console.log('[ProfilePhotoCapture] ===== SAVE PHOTO END =====');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-lg font-semibold text-foreground">Profile Photo Setup</h3>
      <p className="text-sm text-muted-foreground text-center">
        Your photo will be used to verify your identity before interviews
      </p>

      {/* Status Bar */}
      <div 
        className={`w-full px-4 py-2 rounded-lg text-sm text-center font-medium ${
          faceDetected 
            ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
        }`}
      >
        {status}
      </div>

      {/* Camera / Photo Display */}
      <div 
        className="relative rounded-xl overflow-hidden border-2 border-border/50 bg-black"
        style={{ width: 320, height: 240 }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
            <div className="text-center">
              <Loader className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </div>
        )}

        {!capturedPhoto ? (
          <>
            {/* Live Video */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />

            {/* Face guide overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                className={`w-40 h-48 rounded-full border-4 transition-colors ${
                  faceDetected ? 'border-green-400' : 'border-red-400'
                }`} 
              />
              {/* Countdown Display */}
              {countdown !== null && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/90 flex items-center justify-center animate-pulse">
                    <span className="text-4xl font-bold text-white">{countdown}</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Captured Photo */
          <img 
            src={capturedPhoto} 
            alt="Captured" 
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Error */}
      {error && (
        <div className="w-full px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!capturedPhoto ? (
          <>
            {!cameraStarted ? (
              <button
                onClick={startCamera}
                disabled={!modelsLoaded || isLoading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
              >
                {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {isLoading ? 'Starting...' : 'Start Camera'}
              </button>
            ) : (
              <button
                onClick={capturePhoto}
                disabled={!faceDetected || isLoading || countdown !== null}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
              >
                <Camera className="w-4 h-4" />
                {countdown !== null ? `Capturing in ${countdown}...` : 'Capture Photo'}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={retakePhoto}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border/50 text-foreground hover:bg-muted/30 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Retake
            </button>
            <button
              onClick={savePhoto}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50 hover:bg-green-700 transition-all"
            >
              {isSaving ? <Loader className="w-4 h-4 animate-spin" />
                : <CheckCircle className="w-4 h-4" />}
              {isSaving ? 'Saving...' : 'Save Photo'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePhotoCapture;
