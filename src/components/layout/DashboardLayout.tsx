import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LucideIcon, CheckCircle, RefreshCw, Settings, Maximize2, Minimize2, Sun, Moon } from "lucide-react";
import UserProfile from "@/components/UserProfile";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  showSolvedCount?: boolean;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  title: string;
  solvedCount?: number;
  totalProblems?: number;
}

const DashboardLayout = ({ children, navItems, title, solvedCount = 0, totalProblems = 0 }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundTheme, setBackgroundTheme] = useState<"normal" | "ruled">("normal");
  const containerRef = useRef<HTMLDivElement>(null);

  // Theme state (Light by default, persisted in localStorage upon user choice)
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neurohire-theme");
      if (saved) return saved === "dark";
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("neurohire-theme", next ? "dark" : "light");
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleFullscreen = () => {
    console.log('Fullscreen clicked in DashboardLayout, current state:', isFullscreen);
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
        console.log('Entered fullscreen');
      }).catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        console.log('Exited fullscreen');
      }).catch(err => {
        console.error('Exit fullscreen error:', err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex min-h-screen",
        backgroundTheme === "ruled" 
          ? "bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:100%_2rem]" 
          : "bg-background"
      )}
    >
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/30 bg-sidebar flex flex-col">
        <div className="p-6 border-b border-border/30">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/neurohire-symbol.png"
              alt="NeuroHire AI Symbol"
              className="w-8 h-8 object-contain transition-transform group-hover:scale-105 drop-shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
            />
            <span className="font-display text-sm tracking-wider text-foreground font-bold">
              NEUROHIRE <span className="text-primary text-xs font-semibold">AI</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            const isLogout = item.label.toLowerCase() === "logout" || item.href === "/login";

            if (isLogout) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-left"
                >
                  <Icon className="w-4 h-4" />
                  <span className="flex-1">{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary neon-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {item.showSolvedCount && (solvedCount > 0 || totalProblems > 0) && (
                  <div className="flex items-center gap-1 text-xs">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-green-400">{solvedCount}/{totalProblems}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/30">
          <div className="glass-panel p-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-glow-pulse" />
              <span>AI System Active</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="border-b border-border/30 px-8 py-4 flex items-center justify-between">
          <h1 className="text-xl font-display tracking-wider text-foreground">{title}</h1>
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle (Light / Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Fullscreen button */}
            <button
              type="button"
              onClick={handleFullscreen}
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={cn(
                "p-2 rounded-lg border border-border/60 hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm",
                showSettings && "bg-primary/10 border-primary/40 text-primary"
              )}
              title="Display Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            <div className="h-6 w-px bg-border/40 mx-1" />

            <UserProfile />
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-8 py-4 border-b border-border/40 bg-card/40 backdrop-blur-md">
            <div className="max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Color Theme</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isDark) toggleTheme();
                    }}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5",
                      isDark
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    Dark Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isDark) toggleTheme();
                    }}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center justify-center gap-1.5",
                      !isDark
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Light Mode
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Background Pattern</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBackgroundTheme("normal")}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      backgroundTheme === "normal"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    Clean Surface
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackgroundTheme("ruled")}
                    className={cn(
                      "flex-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      backgroundTheme === "ruled"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/60 text-muted-foreground hover:bg-muted/40"
                    )}
                  >
                    Grid Lines
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-8">{children}</div>
      </main>
    </div>
  );
};

export default DashboardLayout;
