import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Brain, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { GoogleLogin } from '@react-oauth/google';

const roles = ["Candidate", "Recruiter", "Admin"] as const;
type RoleType = typeof roles[number];

const LoginWithGoogle = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleType>("Candidate");
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      // Simple validation
      if (formData.email && formData.password.length >= 6) {
        // Mock successful login
        setSuccess(`${isLogin ? 'Login' : 'Account creation'} successful! Redirecting...`);
        setTimeout(() => {
          navigate(`/${selectedRole.toLowerCase()}/dashboard`);
        }, 1500);
      } else {
        setError("Please enter valid credentials (password must be at least 6 characters)");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setError("");
      setSuccess("Google authentication successful! Redirecting...");
      
      // Mock Google login success
      console.log('Google credential:', credentialResponse);
      
      // Store mock user data
      const mockGoogleUser = {
        id: "google_" + Date.now(),
        email: "google.user@example.com",
        name: "Google User",
        role: selectedRole.toLowerCase(),
        avatar: "https://lh3.googleusercontent.com/a/default-user",
        loginMethod: "google"
      };
      
      localStorage.setItem('currentUser', JSON.stringify(mockGoogleUser));
      
      setTimeout(() => {
        navigate(`/${selectedRole.toLowerCase()}/dashboard`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Google authentication failed");
    }
  };

  const handleGoogleError = () => {
    setError("Google authentication failed. Please try again.");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left side – animated brain */}
      <div className="hidden lg:flex flex-1 items-center justify-center">
        <div className="relative">
          <div className="w-80 h-80 rounded-full bg-blue-500/10 flex items-center justify-center">
            <div className="w-60 h-60 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Brain className="w-24 h-24 text-blue-400" />
            </div>
          </div>
          {/* Neural connections */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-blue-400/60 animate-pulse"
              style={{
                top: `${50 + Math.sin(i * 0.785) * 45}%`,
                left: `${50 + Math.cos(i * 0.785) * 45}%`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Right side – auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="text-white text-sm tracking-widest">NEUROHIRE AI</span>
          </Link>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8">
            {/* Toggle between Login and Signup */}
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isLogin
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                    : "bg-gray-700/30 text-gray-400 border border-transparent hover:border-gray-600"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                  !isLogin
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                    : "bg-gray-700/30 text-gray-400 border border-transparent hover:border-gray-600"
                }`}
              >
                Sign Up
              </button>
            </div>

            <h2 className="text-2xl tracking-wider mb-2 text-white">
              {isLogin ? "SIGN IN" : "CREATE ACCOUNT"}
            </h2>
            <p className="text-sm text-gray-400 mb-8">
              {isLogin 
                ? (selectedRole === "Candidate" 
                  ? "Access your NeuroHire portal (Google sign-in available)" 
                  : "Access your NeuroHire portal") 
                : (selectedRole === "Candidate" 
                  ? "Join the future of hiring (Google sign-up available)" 
                  : "Join the future of hiring")
              }
            </p>

            {/* Role selector */}
            <div className="flex gap-2 mb-8">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    selectedRole === role
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      : "bg-gray-700/30 text-gray-400 border border-transparent hover:border-gray-600"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Success message */}
            {success && (
              <div className="mb-6 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-400">{success}</p>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 mb-6">
              {!isLogin && (
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-700/30 border border-gray-600/50 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-700/30 border border-gray-600/50 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-12 py-3 rounded-lg bg-gray-700/30 border border-gray-600/50 text-white placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-all"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm tracking-wide hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isLogin ? "Sign In" : "Create Account"}
              </button>
            </form>

            {/* Google Sign-In - Only for Candidates */}
            {selectedRole === "Candidate" && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-600/30" />
                  </div>
                  <div className="relative flex justify-center text-xs text-gray-400">
                    <span className="px-3 bg-gray-800/50">or continue with</span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                    theme="filled_blue"
                    text="signin_with"
                    shape="rectangular"
                    logo_alignment="left"
                    width="100%"
                  />
                </div>
              </>
            )}

            {/* Additional links */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-400">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginWithGoogle;