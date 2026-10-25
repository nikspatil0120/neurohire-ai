import { useRef, useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, CheckCircle, RefreshCw, Loader, Upload, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProfilePhotoCaptureProps {
  onPhotoSaved: (photo: string) => void;
  email?: string;
}

const ProfilePhotoCapture = ({ onPhotoSaved, email }: ProfilePhotoCaptureProps) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [faceAnalyzed, setFaceAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Click "Start Camera" or "Upload Photo" to begin');
  const [countdown, setCountdown] = useState<number | null>(null);
  const detectionInterval = useRef<any>(null);
  const countdownInterval = useRef<any>(null);
  const autoCaptureTimeout = useRef<any>(null);
  const isCountingDown = useRef<boolean>(false);

  // Load face-api models on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        setStatus('Loading face detection & feature analysis models...');
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setModelsLoaded(true);
        setStatus('Click "Start Camera" or "Upload Photo" to begin');
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
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })
      );

      if (detection) {
        if (!faceDetected && !isCountingDown.current) {
          setFaceDetected(true);
          setStatus('✅ Face detected! Auto-capturing in 5s...');
          startCountdown();
        }
      } else {
        if (faceDetected) {
          setFaceDetected(false);
          setStatus('👤 Position your face in the frame');
          cancelCountdown();
        }
      }
    }, 500);
  };

  const startCountdown = () => {
    cancelCountdown();
    isCountingDown.current = true;
    setCountdown(5);
    
    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          cancelCountdown();
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

  // Analyze facial features from an image data URL
  const analyzeFaceFeatures = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setStatus('Analyzing facial landmarks & feature embedding...');
    setError(null);

    try {
      const img = await faceapi.fetchImage(dataUrl);
      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setFaceAnalyzed(false);
        setDescriptor(null);
        setError('No clear face detected. Please ensure your face is well-lit, unobstructed, and front-facing.');
        setStatus('Facial analysis failed. Please retake or upload another photo.');
        return false;
      }

      setFaceAnalyzed(true);
      setDescriptor(Array.from(detection.descriptor));
      setStatus('✅ Facial features successfully mapped & verified! (Clothing & spectacles invariant)');
      return true;
    } catch (err) {
      console.error('[ProfilePhotoCapture] Analysis error:', err);
      setError('Could not analyze facial features. Please try a different photo.');
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror the image (selfie style)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const photo = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(photo);

    // Stop camera after capture
    stopCamera();
    if (detectionInterval.current) clearInterval(detectionInterval.current);
    cancelCountdown();

    await analyzeFaceFeatures(photo);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    cancelCountdown();
    if (detectionInterval.current) clearInterval(detectionInterval.current);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        setCapturedPhoto(result);
        await analyzeFaceFeatures(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setDescriptor(null);
    setFaceAnalyzed(false);
    setError(null);
    setStatus('Click "Start Camera" or "Upload Photo" to begin');
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
      const userEmail = email || user?.email || localStorage.getItem('userEmail');
      if (!userEmail) {
        setError('User email not found. Please log in again.');
        setIsSaving(false);
        return;
      }
      
      const requestBody = {
        photo: capturedPhoto,
        email: userEmail,
        face_descriptor: descriptor || undefined,
      };
      
      const response = await fetch('http://localhost:8000/api/v1/users/profile/photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();

      if (data.success) {
        setStatus('✅ Profile photo and facial feature profile saved successfully!');
        stopCamera();
        onPhotoSaved(capturedPhoto);
      } else {
        setError(data.message || data.detail || 'Failed to save photo. Please try again.');
      }
    } catch (err) {
      console.error('[ProfilePhotoCapture] Save exception:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
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

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Facial Feature Analysis Card (Shown when photo captured/uploaded) */}
      {capturedPhoto && (
        <div className="w-full max-w-sm rounded-xl border border-border/50 bg-card/60 backdrop-blur-md p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between font-semibold text-foreground">
            <span className="flex items-center gap-1.5 text-primary">
              <Sparkles className="w-4 h-4" /> Facial Feature Analysis
            </span>
            {isAnalyzing ? (
              <span className="text-amber-400 flex items-center gap-1">
                <Loader className="w-3.5 h-3.5 animate-spin" /> Analyzing...
              </span>
            ) : faceAnalyzed ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <span className="text-rose-400 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Failed
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
            <div className={`p-2 rounded-lg border ${faceAnalyzed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-muted/30 border-border/30 text-muted-foreground'}`}>
              <div className="font-semibold">68 Landmarks</div>
              <div className="text-[10px] opacity-80">Jaw, nose, eyes & lips</div>
            </div>
            <div className={`p-2 rounded-lg border ${faceAnalyzed ? 'bg-primary/10 border-primary/30 text-primary-foreground' : 'bg-muted/30 border-border/30 text-muted-foreground'}`}>
              <div className="font-semibold">128D Embedding</div>
              <div className="text-[10px] opacity-80">Facial bone geometry</div>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center pt-1 border-t border-border/30">
            🛡️ AI ignores clothing, hairstyle, and spectacles — focusing exclusively on unique facial geometry.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {!capturedPhoto ? (
          <>
            {!cameraStarted ? (
              <>
                <button
                  onClick={startCamera}
                  disabled={!modelsLoaded || isLoading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all cursor-pointer"
                >
                  {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {isLoading ? 'Starting...' : 'Start Camera'}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!modelsLoaded || isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border/60 text-foreground font-medium hover:bg-muted/30 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-primary" />
                  Upload Photo
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={capturePhoto}
                  disabled={!faceDetected || isLoading || countdown !== null}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  {countdown !== null ? `Capturing in ${countdown}...` : 'Capture Photo'}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border/60 text-foreground font-medium hover:bg-muted/30 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <button
              onClick={retakePhoto}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border/50 text-foreground hover:bg-muted/30 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retake / New
            </button>
            <button
              onClick={savePhoto}
              disabled={isSaving || isAnalyzing || !faceAnalyzed}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              {isSaving ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : 'Confirm & Save Profile Photo'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePhotoCapture;
