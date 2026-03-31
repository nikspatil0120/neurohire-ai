import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type UserRole = "candidate" | "recruiter" | "admin";

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastLogin?: Date;
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

  const login = async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock validation - works for any email/password combination
      if (email && password.length >= 6) {
        const mockUser: User = {
          id: "mock_" + Date.now(),
          email,
          name: email.split("@")[0],
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
        };
        setUser(mockUser);
        localStorage.setItem('currentUser', JSON.stringify(mockUser));
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock validation
      if (email && password.length >= 6 && name) {
        const mockUser: User = {
          id: "mock_" + Date.now(),
          email,
          name,
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
        };
        setUser(mockUser);
        localStorage.setItem('currentUser', JSON.stringify(mockUser));
      } else {
        throw new Error('Invalid signup information');
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Mock Google authentication without MongoDB calls
      const mockGoogleUser: User = {
        id: "google_" + Date.now(),
        email: "google_user@example.com",
        name: "Google User",
        role,
        avatar: "https://lh3.googleusercontent.com/a/default-user",
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };
      
      setUser(mockGoogleUser);
      localStorage.setItem('currentUser', JSON.stringify(mockGoogleUser));
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.message || 'Google authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  // Check for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

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