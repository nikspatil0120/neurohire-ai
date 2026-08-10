import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { api, setAuthToken, removeAuthToken, getAuthToken } from "@/lib/api";

type UserRole = "candidate" | "recruiter" | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  lastLogin?: string;
  profile?: {
    phone?: string;
    location?: string;
    bio?: string;
    skills?: string[];
    experience?: string;
    education?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  signup: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  loginWithGoogle: (credential: string, role: UserRole) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Check for existing auth token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const response = await api.getCurrentUser();
          if (response.success && response.data?.user) {
            setUser(response.data.user);
          }
        } catch (error) {
          console.error('Failed to get current user:', error);
          removeAuthToken();
        }
      }
      setIsInitializing(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Handle admin login with hardcoded credentials
      if (role === "admin") {
        if (email === "admin@xyz.com" && password === "admin@123") {
          const adminUser: User = {
            id: "admin_001",
            name: "Admin User",
            email: "admin@xyz.com",
            role: "admin",
            avatar: undefined,
            isActive: true,
            lastLogin: new Date().toISOString()
          };
          const adminToken = "admin_token_" + Date.now();
          setAuthToken(adminToken);
          setUser(adminUser);
          return;
        } else {
          throw new Error("Invalid admin credentials");
        }
      }

      // Mock login for candidates and recruiters (no backend required)
      // In production, this would call the backend API
      if (email && password) {
        const mockUser: User = {
          id: `${role}_${Date.now()}`,
          name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          email: email,
          role: role,
          avatar: undefined,
          isActive: true,
          lastLogin: new Date().toISOString()
        };
        const mockToken = `${role}_token_${Date.now()}`;
        setAuthToken(mockToken);
        setUser(mockUser);
        console.log('User logged in (mock):', mockUser);
        return;
      }

      throw new Error("Invalid credentials");
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const response = await api.register({ name, email, password, role });
      
      if (response.success && response.data) {
        const { user: userData, token } = response.data;
        setAuthToken(token);
        setUser(userData);
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      throw new Error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Disable Google login for admin role
      if (role === "admin") {
        throw new Error("Google authentication is not available for admin accounts. Please use email/password login.");
      }

      // Decode Google JWT token to get user info
      const base64Url = credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const googleUser = JSON.parse(jsonPayload);
      
      // Create user object from Google data (mock authentication)
      const mockGoogleUser: User = {
        id: `google_${googleUser.sub}`,
        name: googleUser.name || googleUser.email.split('@')[0],
        email: googleUser.email,
        role: role,
        avatar: googleUser.picture,
        isActive: true,
        lastLogin: new Date().toISOString()
      };

      // Create mock token
      const mockToken = `google_token_${Date.now()}_${googleUser.sub}`;
      
      setAuthToken(mockToken);
      setUser(mockGoogleUser);
      
      console.log('Google user logged in:', mockGoogleUser);
      
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeAuthToken();
      setUser(null);
    }
  };

  // Don't render children until initialization is complete
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
