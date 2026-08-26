import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfilePhotoCapture from '@/components/ProfilePhotoCapture';
import { Shield, ArrowRight } from 'lucide-react';

const ProfilePhotoOnboarding = () => {
  const navigate = useNavigate();
  const [photoSaved, setPhotoSaved] = useState(false);

  const handlePhotoSaved = (photo: string) => {
    setPhotoSaved(true);
    // Mark profile photo as completed in localStorage
    localStorage.setItem('profilePhotoCompleted', 'true');
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      navigate('/candidate/dashboard');
    }, 2000);
  };

  const handleSkip = () => {
    // Allow skip but mark as incomplete
    localStorage.setItem('profilePhotoCompleted', 'false');
    navigate('/candidate/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to NeuroHire!
          </h1>
          <p className="text-muted-foreground">
            Before you start, we need to set up face verification for secure interviews
          </p>
        </div>

        {/* Photo Capture Card */}
        <div className="bg-card border border-border/50 rounded-2xl p-8 shadow-xl">
          {!photoSaved ? (
            <>
              <ProfilePhotoCapture onPhotoSaved={handlePhotoSaved} />
              
              {/* Skip Button */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now (you can set this up later in profile)
                </button>
              </div>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Profile Photo Saved!
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your identity verification is set up. Redirecting to dashboard...
              </p>
              <div className="flex items-center justify-center gap-2 text-primary">
                <span className="text-sm">Taking you to dashboard</span>
                <ArrowRight className="w-4 h-4 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            🔒 Your photo is securely stored and used only for interview verification
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePhotoOnboarding;
