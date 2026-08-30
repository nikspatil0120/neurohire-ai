import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { 
  LayoutDashboard, Target, Building2, FileText, User, LogOut, 
  Code, CheckCircle, ThumbsUp, Users, Filter, Search, Check, Briefcase
} from "lucide-react";
import { getPublishedProblems, getAllProblems, Problem } from "@/lib/problemStore";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target, showSolvedCount: true },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Incoming Opportunities", href: "/candidate/incoming-opportunities", icon: Briefcase },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const ProblemList = () => {
  const [publishedProblems, setPublishedProblems] = useState<Problem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<"All" | "Easy" | "Medium" | "Hard">("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Solved" | "Attempted">("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [solvedProblems, setSolvedProblems] = useState<Set<string>>(new Set());
  const [attemptedProblems, setAttemptedProblems] = useState<Set<string>>(new Set());
  const [totalSolved, setTotalSolved] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);

  // Use a mock user ID for now - in production, this would come from auth
  const userId = "demo-user";

  // Load published problems from API
  useEffect(() => {
    loadProblems();
    loadUserProgress();
  }, []);

  const loadProblems = async () => {
    console.log('Loading published problems from API...');
    setIsLoading(true);
    setError(null);
    try {
      const problems = await getPublishedProblems();
      console.log('Published problems loaded:', problems);
      setPublishedProblems(Array.isArray(problems) ? problems : []);
    } catch (err) {
      console.error('Error loading problems:', err);
      setError('Failed to load problems. Please make sure the backend is running.');
      setPublishedProblems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProgress = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/progress/${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const solvedSet = new Set<string>(data.solvedProblems.map((sp: any) => sp.problemId.toString() as string));
          const attemptedSet = new Set<string>(data.attemptedProblems.map((ap: any) => ap.problemId.toString() as string));
          setSolvedProblems(solvedSet);
          setAttemptedProblems(attemptedSet);
          setTotalSolved(data.totalSolved);
          setTotalAttempted(data.totalAttempted);
        }
      }
    } catch (err) {
      console.error('Error loading user progress:', err);
    }
  };

  // Filter problems
  const filteredProblems = (publishedProblems || []).filter(problem => {
    const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         problem.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDifficulty = difficultyFilter === "All" || problem.difficulty === difficultyFilter;
    const matchesStatus = statusFilter === "All" ||
                         (statusFilter === "Solved" && solvedProblems.has(problem.id || '')) ||
                         (statusFilter === "Attempted" && attemptedProblems.has(problem.id || ''));
    return matchesSearch && matchesDifficulty && matchesStatus;
  });

  return (
    <DashboardLayout navItems={navItems} title="DSA PROBLEM LIST" solvedCount={totalSolved} totalProblems={publishedProblems.length}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground mb-2">Coding Challenges</h2>
            <p className="text-sm text-muted-foreground">
              Practice data structures and algorithms problems · {publishedProblems.length} problems available
            </p>
          </div>
          <button
            onClick={loadProblems}
            disabled={isLoading}
            className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded-lg text-sm font-medium hover:bg-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔄 {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Search and Filter Bar */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search problems by title or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-all"
              />
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <div className="flex gap-2">
                {["All", "Easy", "Medium", "Hard"].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficultyFilter(diff as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      difficultyFilter === diff
                        ? diff === "Easy" ? "bg-green-500/20 text-green-400 border border-green-500/40"
                        : diff === "Medium" ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                        : diff === "Hard" ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-primary/20 text-primary border border-primary/40"
                        : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Problems Table */}
        {error && (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <div className="text-red-400 mb-4">⚠️ Error Loading Problems</div>
              <p className="text-muted-foreground mb-4">{error}</p>
              <button
                onClick={loadProblems}
                className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded-lg hover:bg-primary/30"
              >
                Try Again
              </button>
            </div>
          </GlassCard>
        )}
        
        {isLoading && !error && (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading problems...</p>
            </div>
          </GlassCard>
        )}
        
        {!isLoading && !error && filteredProblems.length === 0 && (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <Code className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No problems found</p>
              <p className="text-sm text-muted-foreground">
                {publishedProblems.length === 0 
                  ? 'No problems have been published yet' 
                  : 'Try adjusting your search or filters'}
              </p>
            </div>
          </GlassCard>
        )}
        
        {!isLoading && !error && filteredProblems.length > 0 && (
        <GlassCard variant="neon" hover={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Title</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Difficulty</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Acceptance</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tags</th>
                </tr>
              </thead>
              <tbody>
                {filteredProblems.map((problem) => (
                  <tr key={problem.id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      {solvedProblems.has(problem.id || '') ? (
                        <div className="w-6 h-6 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-green-500" />
                        </div>
                      ) : attemptedProblems.has(problem.id || '') ? (
                        <div className="w-6 h-6 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Link
                        to={`/candidate/technical-coding?problemId=${problem.id}`}
                        className="text-foreground hover:text-primary transition-colors font-medium"
                      >
                        {problem.title}
                      </Link>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          <span>{(problem.stats.likes / 1000).toFixed(1)}k</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{problem.stats.submissions}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                        problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-sm text-foreground">{problem.stats.acceptance}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {problem.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {problem.tags.length > 2 && (
                          <span className="px-2 py-0.5 bg-muted/50 text-muted-foreground rounded text-xs">
                            +{problem.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredProblems.length === 0 && (
            <div className="text-center py-12">
              <Code className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No problems found matching your criteria</p>
            </div>
          )}
        </GlassCard>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard 
            variant="neon" 
            className={`cursor-pointer transition-all ${statusFilter === "All" ? "ring-2 ring-primary/50" : ""}`}
            onClick={() => setStatusFilter("All")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Problems</p>
                <p className="text-2xl font-display text-foreground">{publishedProblems.length}</p>
              </div>
              <Code className="w-8 h-8 text-primary opacity-40" />
            </div>
          </GlassCard>

          <GlassCard 
            variant="neon" 
            className={`cursor-pointer transition-all ${statusFilter === "Solved" ? "ring-2 ring-green-500/50" : ""}`}
            onClick={() => setStatusFilter("Solved")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Solved</p>
                <p className="text-2xl font-display text-green-400">{totalSolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400 opacity-40" />
            </div>
          </GlassCard>

          <GlassCard 
            variant="neon" 
            className={`cursor-pointer transition-all ${statusFilter === "Attempted" ? "ring-2 ring-yellow-500/50" : ""}`}
            onClick={() => setStatusFilter("Attempted")}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Attempted</p>
                <p className="text-2xl font-display text-yellow-400">{totalAttempted}</p>
              </div>
              <Target className="w-8 h-8 text-yellow-400 opacity-40" />
            </div>
          </GlassCard>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProblemList;
