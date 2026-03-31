import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const roles = ["Candidate", "Recruiter", "Admin"] as const;
type RoleType = typeof roles[number];

const LoginSimple = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [selectedRole, setSelectedRole] = useState<RoleType>("Candidate");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, signup, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      console.log("Attempting authentication...", { isLogin, selectedRole, email: formData.email });
      
      if (isLogin) {
        await login(formData.email, formData.password, selectedRole.toLowerCase() as any);
      } else {
        await signup(formData.email, formData.password, formData.name, selectedRole.toLowerCase() as any);
      }
      
      console.log("Authentication successful, redirecting...");
      navigate(`/${selectedRole.toLowerCase()}/dashboard`);
    } catch (err: any) {
      console.error("Authentication error:", err);
      setError(err.message || "Authentication failed");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  console.log("LoginSimple rendering, user state:", useAuth());

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: '#fff', padding: '20px' }}>
      <h1>NeuroHire AI - Login (Simple Version)</h1>
      
      <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #333', borderRadius: '8px' }}>
        {/* Toggle between Login and Signup */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => setIsLogin(true)}
            style={{ 
              flex: 1, 
              padding: '10px', 
              background: isLogin ? '#007acc' : '#333', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            style={{ 
              flex: 1, 
              padding: '10px', 
              background: !isLogin ? '#007acc' : '#333', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign Up
          </button>
        </div>

        <h2>{isLogin ? "SIGN IN" : "CREATE ACCOUNT"}</h2>
        
        {/* Role selector */}
        <div style={{ marginBottom: '20px' }}>
          <label>Select Role:</label>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            {roles.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                style={{ 
                  flex: 1, 
                  padding: '8px', 
                  background: selectedRole === role ? '#007acc' : '#333', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{ marginBottom: '20px', padding: '10px', background: '#ff4444', color: '#fff', borderRadius: '4px' }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ marginBottom: '15px' }}>
              <label>Name:</label>
              <input
                type="text"
                name="name"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleInputChange}
                required={!isLogin}
                style={{ width: '100%', padding: '10px', marginTop: '5px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
              />
            </div>
          )}

          <div style={{ marginBottom: '15px' }}>
            <label>Email:</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleInputChange}
              required
              style={{ width: '100%', padding: '10px', marginTop: '5px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label>Password:</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={6}
              style={{ width: '100%', padding: '10px', marginTop: '5px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: isLoading ? '#666' : '#007acc', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: 'none', border: 'none', color: '#007acc', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginSimple;
