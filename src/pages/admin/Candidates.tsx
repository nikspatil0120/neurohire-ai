import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNavItems";
import { 
  Mail, Calendar, CheckCircle, XCircle, Bug, Search, Eye, ToggleLeft, ToggleRight, Trash2, 
  X, User, RefreshCw, Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  _id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  phone?: string;
}

const Candidates = () => {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  useEffect(() => {
    filterCandidates();
  }, [searchQuery, filterStatus, candidates]);

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
        toast({
          title: "Error",
          description: "Failed to fetch candidates",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching candidates:', error);
      setCandidates([]);
      toast({
        title: "Error",
        description: "Error fetching candidates",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterCandidates = () => {
    let filtered = [...candidates];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Status filter
    if (filterStatus === "active") {
      filtered = filtered.filter(c => c.is_active);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter(c => !c.is_active);
    }
    
    setFilteredCandidates(filtered);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/admin/users/${userId}/toggle-active`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Candidate ${currentStatus ? 'deactivated' : 'activated'} successfully`
        });
        fetchCandidates();
      } else {
        throw new Error('Failed to toggle user status');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/admin/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Candidate deleted successfully"
        });
        fetchCandidates();
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const viewDetails = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowDetailModal(true);
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
    <DashboardLayout navItems={ADMIN_NAV_ITEMS} title="CANDIDATES MANAGEMENT">
      <div className="space-y-6">
        {/* Header with Stats */}
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
            <button
              onClick={fetchCandidates}
              className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded-lg flex items-center gap-2 hover:bg-primary/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <div className="grid grid-cols-3 gap-2">
              <div className="px-3 py-2 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-display text-primary">{candidates.length}</p>
              </div>
              <div className="px-3 py-2 bg-green-500/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-display text-green-400">{candidates.filter(c => c.is_active).length}</p>
              </div>
              <div className="px-3 py-2 bg-red-500/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Inactive</p>
                <p className="text-xl font-display text-red-400">{candidates.filter(c => !c.is_active).length}</p>
              </div>
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

        {/* Search and Filter */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === "all"
                    ? "bg-primary/20 text-primary border border-primary/40"
                    : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus("active")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === "active"
                    ? "bg-green-500/20 text-green-400 border border-green-500/40"
                    : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus("inactive")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === "inactive"
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-muted/30 text-muted-foreground border border-transparent hover:border-border"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Candidates List */}
        <GlassCard variant="neon">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading candidates...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filterStatus !== "all" ? "No candidates match your filters" : "No candidates found"}
              </p>
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
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate) => (
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
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewDetails(candidate)}
                            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(candidate._id, candidate.is_active)}
                            className={`p-2 rounded-lg transition-all ${
                              candidate.is_active
                                ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            }`}
                            title={candidate.is_active ? "Deactivate" : "Activate"}
                          >
                            {candidate.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteUser(candidate._id, candidate.full_name)}
                            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-background rounded-2xl max-w-2xl w-full border border-border/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground">Candidate Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/40">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-foreground">{selectedCandidate.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCandidate.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {selectedCandidate.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 rounded text-sm font-medium">
                      <XCircle className="w-4 h-4" />
                      Inactive
                    </span>
                  )}
                </div>
                <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Role</p>
                  <p className="text-sm font-medium text-foreground capitalize">{selectedCandidate.role}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Joined</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(selectedCandidate.created_at)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Last Login</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(selectedCandidate.last_login)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    toggleUserStatus(selectedCandidate._id, selectedCandidate.is_active);
                    setShowDetailModal(false);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCandidate.is_active
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30"
                      : "bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                  }`}
                >
                  {selectedCandidate.is_active ? "Deactivate Account" : "Activate Account"}
                </button>
                <button
                  onClick={() => {
                    deleteUser(selectedCandidate._id, selectedCandidate.full_name);
                    setShowDetailModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-lg font-medium hover:bg-red-500/30 transition-all"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Candidates;
