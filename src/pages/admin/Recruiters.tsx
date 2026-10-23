import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNavItems";
import { 
  Mail, Calendar, CheckCircle, XCircle, Search, Filter, Eye, ToggleLeft, ToggleRight, Trash2, 
  X, User, RefreshCw, Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Recruiter {
  _id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  organization_name?: string;
  phone?: string;
}

const Recruiters = () => {
  const { toast } = useToast();
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [filteredRecruiters, setFilteredRecruiters] = useState<Recruiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [selectedRecruiter, setSelectedRecruiter] = useState<Recruiter | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchRecruiters();
  }, []);

  useEffect(() => {
    filterRecruiters();
  }, [searchQuery, filterStatus, recruiters]);

  const fetchRecruiters = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/users/recruiters');
      if (response.ok) {
        const data = await response.json();
        setRecruiters(data);
      } else {
        console.error('Failed to fetch recruiters');
        toast({
          title: "Error",
          description: "Failed to fetch recruiters",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching recruiters:', error);
      toast({
        title: "Error",
        description: "Error fetching recruiters",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterRecruiters = () => {
    let filtered = [...recruiters];
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(r => 
        r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.organization_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Status filter
    if (filterStatus === "active") {
      filtered = filtered.filter(r => r.is_active);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter(r => !r.is_active);
    }
    
    setFilteredRecruiters(filtered);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/admin/users/${userId}/toggle-active`, {
        method: 'PUT'
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Recruiter ${currentStatus ? 'deactivated' : 'activated'} successfully`
        });
        fetchRecruiters();
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
          description: "Recruiter deleted successfully"
        });
        fetchRecruiters();
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

  const viewDetails = (recruiter: Recruiter) => {
    setSelectedRecruiter(recruiter);
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

  return (
    <DashboardLayout navItems={ADMIN_NAV_ITEMS} title="RECRUITERS MANAGEMENT">
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground mb-2">Recruiters</h2>
            <p className="text-sm text-muted-foreground">
              Manage and monitor recruiter accounts
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchRecruiters}
              className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded-lg flex items-center gap-2 hover:bg-primary/30 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <div className="grid grid-cols-3 gap-2">
              <div className="px-3 py-2 bg-primary/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-display text-primary">{recruiters.length}</p>
              </div>
              <div className="px-3 py-2 bg-green-500/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-xl font-display text-green-400">{recruiters.filter(r => r.is_active).length}</p>
              </div>
              <div className="px-3 py-2 bg-red-500/10 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Inactive</p>
                <p className="text-xl font-display text-red-400">{recruiters.filter(r => !r.is_active).length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or organization..."
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

        {/* Recruiters List */}
        <GlassCard variant="neon">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading recruiters...</p>
            </div>
          ) : filteredRecruiters.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || filterStatus !== "all" ? "No recruiters match your filters" : "No recruiters found"}
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
                  {filteredRecruiters.map((recruiter) => (
                    <tr key={recruiter._id} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-foreground block">{recruiter.full_name}</span>
                            {recruiter.organization_name && (
                              <span className="text-xs text-muted-foreground">{recruiter.organization_name}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          {recruiter.email}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {recruiter.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {formatDate(recruiter.created_at)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(recruiter.last_login)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewDetails(recruiter)}
                            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleUserStatus(recruiter._id, recruiter.is_active)}
                            className={`p-2 rounded-lg transition-all ${
                              recruiter.is_active
                                ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                                : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            }`}
                            title={recruiter.is_active ? "Deactivate" : "Activate"}
                          >
                            {recruiter.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteUser(recruiter._id, recruiter.full_name)}
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
      {showDetailModal && selectedRecruiter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-background rounded-2xl max-w-2xl w-full border border-border/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <h3 className="text-lg font-semibold text-foreground">Recruiter Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/40">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-foreground">{selectedRecruiter.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRecruiter.email}</p>
                  {selectedRecruiter.organization_name && (
                    <p className="text-xs text-muted-foreground mt-1">📍 {selectedRecruiter.organization_name}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  {selectedRecruiter.is_active ? (
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
                  <p className="text-sm font-medium text-foreground capitalize">{selectedRecruiter.role}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Joined</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(selectedRecruiter.created_at)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/20 border border-border/40">
                  <p className="text-xs text-muted-foreground mb-1">Last Login</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(selectedRecruiter.last_login)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    toggleUserStatus(selectedRecruiter._id, selectedRecruiter.is_active);
                    setShowDetailModal(false);
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedRecruiter.is_active
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30"
                      : "bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
                  }`}
                >
                  {selectedRecruiter.is_active ? "Deactivate Account" : "Activate Account"}
                </button>
                <button
                  onClick={() => {
                    deleteUser(selectedRecruiter._id, selectedRecruiter.full_name);
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

export default Recruiters;
