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
      console.log('Initializing auth...');
      const token = getAuthToken();
      console.log('Token found:', !!token);
      if (token) {
        try {
          // Handle Google/Admin mock tokens
          if (token.startsWith('google_token_') || token.startsWith('admin_token_')) {
            if (token.startsWith('google_token_')) {
              // Extract user ID from Google token
              const parts = token.split('_');
              const googleSub = parts[parts.length - 1];
              
              // Reconstruct user from localStorage if available
              const savedGoogleUser = localStorage.getItem('googleUser');
              if (savedGoogleUser) {
                const googleUser = JSON.parse(savedGoogleUser);
                setUser(googleUser);
                console.log('Google user restored from localStorage:', googleUser);
              } else {
                // Create minimal user object
                setUser({
                  id: `google_${googleSub}`,
                  name: 'Google User',
                  email: 'user@gmail.com',
                  role: 'candidate',
                  isActive: true
                });
              }
            } else if (token.startsWith('admin_token_')) {
              // Restore admin user
              setUser({
                id: 'admin_hardcoded',
                name: 'System Administrator',
                email: 'admin@xyz.com',
                role: 'admin',
                isActive: true
              });
              console.log('Admin user restored');
            }
          } else {
            // Regular JWT token - call API
            console.log('Calling getCurrentUser API...');
            const response = await api.getCurrentUser();
            console.log('getCurrentUser response:', response);
            // Handle both response formats: {success: true, data: {user: ...}} or direct user object
            if (response.success && response.data?.user) {
              setUser(response.data.user);
              console.log('User restored from API (wrapped):', response.data.user);
            } else if (response.email && response.id) {
              // Direct user object response
              setUser({
                id: response.id,
                name: response.full_name || response.name,
                email: response.email,
                role: response.role,
                avatar: response.avatar,
                isActive: response.is_active,
                lastLogin: response.last_login
              });
              console.log('User restored from API (direct):', response);
            } else {
              console.error('Invalid response from getCurrentUser:', response);
              removeAuthToken();
            }
          }
        } catch (error) {
          console.error('Failed to get current user:', error);
          removeAuthToken();
        }
      } else {
        console.log('No token found, user not authenticated');
      }
      setIsInitializing(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Handle admin login with hardcoded credentials (no database)
      if (role === "admin") {
        if (email === "admin@xyz.com" && password === "admin@123") {
          const adminUser: User = {
            id: "admin_hardcoded",
            name: "System Administrator",
            email: "admin@xyz.com",
            role: "admin",
            avatar: undefined,
            isActive: true,
            lastLogin: new Date().toISOString()
          };
          const adminToken = "admin_token_hardcoded_" + Date.now();
          setAuthToken(adminToken);
          setUser(adminUser);
          console.log('Admin logged in (hardcoded)');
          return;
        } else {
          throw new Error("Invalid admin credentials");
        }
      }

      // For candidates and recruiters, use the backend API
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Verify role matches
      if (data.user.role !== role) {
        throw new Error(`This account is registered as ${data.user.role}, not ${role}`);
      }

      // Set token and user
      setAuthToken(data.access_token);
      const userData = {
        id: data.user.id,
        name: data.user.full_name,
        email: data.user.email,
        role: data.user.role,
        avatar: undefined,
        isActive: data.user.is_active,
        lastLogin: data.user.last_login,
        organization_name: data.user.organization_name || '' // Include organization
      };
      setUser(userData);
      
      // Store full user data in localStorage for job creation
      localStorage.setItem('user', JSON.stringify(userData));
      
      console.log('User logged in:', data.user);
      return;
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
      // Block admin signup - admin is hardcoded only
      if (role === "admin") {
        throw new Error("Admin accounts cannot be created. Admin access is restricted to system administrators only.");
      }

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
      
      // Save Google user to localStorage for persistence across refreshes
      localStorage.setItem('googleUser', JSON.stringify(mockGoogleUser));
      
      // Check if profile photo is completed
      const profilePhotoCompleted = localStorage.getItem('profilePhotoCompleted');
      
      console.log('Google user logged in:', mockGoogleUser);
      console.log('Profile photo completed:', profilePhotoCompleted);
      
      // Return flag to indicate if onboarding is needed
      return { needsOnboarding: profilePhotoCompleted !== 'true' };
      
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
      localStorage.removeItem('googleUser'); // Clear Google user data
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
