import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { LayoutDashboard, Shield, Users, Building2, Brain, Code, BookOpen, Mail, Calendar, CheckCircle, XCircle, Bug } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "System Monitor", href: "/admin/monitoring", icon: Shield },
  { label: "Recruiters", href: "/admin/recruiters", icon: Building2 },
  { label: "Candidates", href: "/admin/candidates", icon: Users },
  { label: "DSA Problems", href: "/admin/dsa-problems", icon: Code },
  { label: "Aptitude Questions", href: "/admin/aptitude-questions", icon: BookOpen },
  { label: "AI Performance", href: "/admin/ai-performance", icon: Brain },
];

interface Candidate {
  _id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

const Candidates = () => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/users/candidates');
      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch candidates:', response.status, errorText);
        setCandidates([]);
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      setCandidates([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const debugFetch = async () => {
    setDebugInfo("Debugging...");
    try {
      const response = await fetch('http://localhost:8000/api/v1/users/candidates');
      const status = response.status;
      const statusText = response.statusText;
      const headers = Object.fromEntries(response.headers.entries());
      
      let body;
      try {
        body = await response.json();
      } catch {
        body = await response.text();
      }
      
      setDebugInfo(
        `Status: ${status} ${statusText}\n` +
        `Headers: ${JSON.stringify(headers, null, 2)}\n` +
        `Body: ${JSON.stringify(body, null, 2)}`
      );
    } catch (error) {
      setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <DashboardLayout navItems={navItems} title="CANDIDATES MANAGEMENT">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground mb-2">Candidates</h2>
            <p className="text-sm text-muted-foreground">
              Manage and monitor candidate accounts
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={debugFetch}
              className="px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2 text-yellow-500 hover:bg-yellow-500/20 transition-colors"
            >
              <Bug className="w-4 h-4" />
              Debug
            </button>
            <div className="px-4 py-2 bg-primary/10 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Candidates</p>
              <p className="text-2xl font-display text-primary">{candidates.length}</p>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <GlassCard variant="neon" className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-foreground">Debug Information</h4>
              <button
                onClick={() => setDebugInfo(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded overflow-auto max-h-96">
              {debugInfo}
            </pre>
          </GlassCard>
        )}

        {/* Candidates List */}
        <GlassCard variant="neon">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading candidates...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No candidates found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Joined</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Login</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((candidate) => (
                    <tr key={candidate._id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{candidate.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {candidate.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {candidate.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {formatDate(candidate.created_at)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(candidate.last_login)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default Candidates;
