import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LucideIcon, CheckCircle, RefreshCw, Settings, Maximize2, Minimize2 } from "lucide-react";
import UserProfile from "@/components/UserProfile";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundTheme, setBackgroundTheme] = useState<"normal" | "ruled">("normal");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRefresh = () => {
    console.log('Refresh clicked in DashboardLayout');
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
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">N</span>
            </div>
            <span className="font-display text-sm tracking-wider text-foreground">NEUROHIRE</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
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
          <div className="flex items-center gap-3">
            {/* Debug test button */}
            <button
              onClick={() => {
                console.log('DEBUG: Test button clicked!');
                alert('Button click is working!');
              }}
              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-bold"
            >
              TEST
            </button>
            {/* Corner buttons */}
            <div className="flex items-center gap-2 relative z-50">
              <button
                onClick={() => {
                  console.log('Settings button clicked');
                  setShowSettings(!showSettings);
                }}
                className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors cursor-pointer"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  console.log('Fullscreen button clicked, current state:', isFullscreen);
                  handleFullscreen();
                }}
                className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
            <UserProfile />
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-8 py-4 border-b border-border/30">
            <div className="max-w-md">
              <h3 className="text-sm font-semibold text-foreground mb-3">Background Settings</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setBackgroundTheme("normal")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg text-sm transition-colors",
                    backgroundTheme === "normal"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  Normal
                </button>
                <button
                  onClick={() => setBackgroundTheme("ruled")}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-lg text-sm transition-colors",
                    backgroundTheme === "ruled"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  Ruled Lines
                </button>
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
