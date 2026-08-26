import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ParticleBackground from "@/components/ParticleBackground";
import GlassCard from "@/components/GlassCard";
import { Brain, Chrome, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { GoogleLogin } from '@react-oauth/google';

const roles = ["Candidate", "Recruiter", "Admin"] as const;
type RoleType = typeof roles[number];

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleType>("Candidate");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, signup, loginWithGoogle, isLoading } = useAuth();

  // Show Admin role only in Sign In mode
  const availableRoles = isLogin ? roles : roles.filter(r => r !== "Admin");

  // Reset to Candidate if switching to signup with Admin selected
  const handleToggleMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    if (!loginMode && selectedRole === "Admin") {
      setSelectedRole("Candidate");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (isLogin) {
        await login(formData.email, formData.password, selectedRole.toLowerCase() as any);
      } else {
        await signup(formData.email, formData.password, formData.name, selectedRole.toLowerCase() as any);
      }
      navigate(`/${selectedRole.toLowerCase()}/dashboard`);
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const result = await loginWithGoogle(credentialResponse.credential, selectedRole.toLowerCase() as any);
      
      // Check if onboarding is needed for candidates
      if (selectedRole.toLowerCase() === 'candidate' && result?.needsOnboarding) {
        navigate('/candidate/profile-photo-setup');
      } else {
        navigate(`/${selectedRole.toLowerCase()}/dashboard`);
      }
    } catch (err: any) {
      setError(err.message || "Google authentication failed");
    }
  };

  const handleGoogleError = () => {
    setError("Google authentication failed");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <ParticleBackground />

      {/* Left side – animated brain */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
        <div className="relative">
          <div className="w-80 h-80 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center animate-fade-in">
            <div className="w-60 h-60 rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center pulse-glow">
              <Brain className="w-24 h-24 text-primary neon-glow" />
            </div>
          </div>
          {/* Neural connections */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary/60"
              style={{
                top: `${50 + Math.sin(i * 0.785) * 45}%`,
                left: `${50 + Math.cos(i * 0.785) * 45}%`,
                animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Right side – auth form */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md animate-fade-in-up">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="font-display text-sm tracking-widest neon-glow">NEUROHIRE AI</span>
          </Link>

          <GlassCard variant="neon" hover={false} className="p-8">
            {/* Toggle between Login and Signup */}
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => handleToggleMode(true)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300",
                  isLogin
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
                )}
              >
                Sign In
              </button>
              <button
                onClick={() => handleToggleMode(false)}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300",
                  !isLogin
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
                )}
              >
                Sign Up
              </button>
            </div>

            <h2 className="font-display text-2xl tracking-wider mb-2 text-foreground">
              {isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              {isLogin 
                ? (selectedRole === "Candidate" 
                  ? "Access your NeuroHire portal (Google sign-in available)" 
                  : selectedRole === "Admin"
                  ? "Admin access - Email/Password only"
                  : "Access your NeuroHire portal") 
                : (selectedRole === "Candidate" 
                  ? "Join the future of hiring (Google sign-up available)" 
                  : "Join the future of hiring")
              }
            </p>

            {/* Role selector */}
            <div className="flex gap-2 mb-8">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300",
                    selectedRole === role
                      ? "bg-primary/20 text-primary border border-primary/40"
                      : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
                  )}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              {!isLogin && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_15px_hsl(185_100%_50%/0.1)] transition-all"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_15px_hsl(185_100%_50%/0.1)] transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-muted/30 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_15px_hsl(185_100%_50%/0.1)] transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-neon-cyan text-primary-foreground font-semibold text-sm tracking-wide hover:shadow-[0_0_30px_hsl(185_100%_50%/0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    {isLogin ? "Signing In..." : "Creating Account..."}
                  </>
                ) : (
                  <>{isLogin ? "Sign In" : "Create Account"}</>
                )}
              </button>
            </form>

            {/* Google Sign-In - Only for Candidates (not Admin or Recruiter) */}
            {selectedRole === "Candidate" && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/30" />
                  </div>
                  <div className="relative flex justify-center text-xs text-muted-foreground">
                    <span className="px-3 bg-card">or continue with</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap
                    theme="filled_blue"
                    text="signin_with"
                    shape="rectangular"
                    logo_alignment="left"
                  />
                </div>
              </>
            )}

            {/* Additional links */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary hover:text-primary/80 transition-colors font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Login;
