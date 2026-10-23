import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNavItems";
import {
  Search, Filter, RefreshCw, Clock, User, FileText, Trash2, AlertCircle, CheckCircle,
} from "lucide-react";

interface AuditLog {
  _id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: Record<string, any>;
  timestamp: string;
  ip_address?: string;
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterResource, setFilterResource] = useState("all");
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [searchQuery, filterAction, filterResource, logs]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/v1/admin/audit-logs?limit=200");
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = [...logs];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.resource_type.toLowerCase().includes(q) ||
          log.resource_id?.toLowerCase().includes(q)
      );
    }

    if (filterAction !== "all") {
      filtered = filtered.filter((log) => log.action === filterAction);
    }

    if (filterResource !== "all") {
      filtered = filtered.filter((log) => log.resource_type === filterResource);
    }

    setFilteredLogs(filtered);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    if (action.includes("create") || action.includes("add"))
      return "text-green-400 bg-green-500/10";
    if (action.includes("update") || action.includes("edit"))
      return "text-blue-400 bg-blue-500/10";
    if (action.includes("delete") || action.includes("remove"))
      return "text-red-400 bg-red-500/10";
    return "text-yellow-400 bg-yellow-500/10";
  };

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)));
  const uniqueResources = Array.from(new Set(logs.map((log) => log.resource_type)));

  return (
    <DashboardLayout navItems={ADMIN_NAV_ITEMS} title="AUDIT LOGS">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground mb-1">Audit Logs</h2>
            <p className="text-sm text-muted-foreground">
              Track all admin actions and system changes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-primary/20 text-primary border border-primary/40 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/30 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <div className="px-4 py-2 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Logs</p>
              <p className="text-2xl font-display text-primary">{logs.length}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <GlassCard variant="neon" hover={false}>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by action, resource, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Action:</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="all">All</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Resource:</label>
              <select
                value={filterResource}
                onChange={(e) => setFilterResource(e.target.value)}
                className="px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                <option value="all">All</option>
                {uniqueResources.map((resource) => (
                  <option key={resource} value={resource}>
                    {resource}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Logs List */}
        <GlassCard variant="neon" hover={false}>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLogs.map((log) => (
                <div
                  key={log._id}
                  className="p-4 rounded-lg bg-muted/10 border border-border/30 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-muted/50 text-muted-foreground rounded text-xs font-medium">
                          {log.resource_type}
                        </span>
                        {log.resource_id && (
                          <span className="text-xs text-muted-foreground font-mono">
                            ID: {log.resource_id.substring(0, 12)}...
                          </span>
                        )}
                      </div>

                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-2 p-2 bg-muted/20 rounded text-xs text-muted-foreground font-mono max-h-12 overflow-hidden">
                          {JSON.stringify(log.changes).substring(0, 100)}...
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(log.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 px-4">
            Showing {filteredLogs.length} of {logs.length} audit log{logs.length !== 1 ? "s" : ""}
          </p>
        </GlassCard>

        {/* Cleanup Info */}
        <GlassCard variant="neon" hover={false}>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary" />
            Data Retention Policy
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              ✓ Audit logs are automatically retained for 30 days for compliance and security purposes.
            </p>
            <p>
              ✓ Logs older than 30 days are automatically purged to maintain optimal database performance.
            </p>
            <p>
              ✓ Each admin action is logged with timestamp, action type, resource, and changes made.
            </p>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  );
};

export default AuditLogs;
