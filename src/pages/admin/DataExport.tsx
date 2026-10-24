import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { ADMIN_NAV_ITEMS } from "@/constants/adminNavItems";
import {
  Download, FileText, Users2, FileJson, CheckCircle, 
  Clock, AlertCircle, RefreshCw, Building2, Code, Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  format: "csv" | "json";
  color: string;
}

const DataExport = () => {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<Set<string>>(new Set());
  const [exportHistory, setExportHistory] = useState<Array<{
    id: string;
    title: string;
    timestamp: string;
    status: "success" | "pending" | "error";
  }>>([]);

  const exportOptions: ExportOption[] = [
    {
      id: "users-all",
      title: "All Users",
      description: "Export all registered users (candidates, recruiters, admins)",
      icon: <Users2 className="w-6 h-6" />,
      endpoint: "/admin/export/users",
      format: "csv",
      color: "from-blue-500/20 to-cyan-500/20",
    },
    {
      id: "recruiters",
      title: "Recruiters Only",
      description: "Export all active recruiter accounts with organization details",
      icon: <Building2 className="w-6 h-6" />,
      endpoint: "/admin/export/users?role=recruiter",
      format: "csv",
      color: "from-purple-500/20 to-pink-500/20",
    },
    {
      id: "candidates",
      title: "Candidates Only",
      description: "Export all candidate accounts with profile information",
      icon: <Users className="w-6 h-6" />,
      endpoint: "/admin/export/users?role=candidate",
      format: "csv",
      color: "from-green-500/20 to-emerald-500/20",
    },
    {
      id: "applications",
      title: "All Applications",
      description: "Export application data including status and interview slots",
      icon: <FileText className="w-6 h-6" />,
      endpoint: "/admin/export/applications",
      format: "csv",
      color: "from-orange-500/20 to-red-500/20",
    },
    {
      id: "problems",
      title: "DSA Problems",
      description: "Export coding problem statements with test cases and solutions",
      icon: <Code className="w-6 h-6" />,
      endpoint: "/admin/export/problems",
      format: "csv",
      color: "from-indigo-500/20 to-blue-500/20",
    },
  ];

  const handleExport = async (option: ExportOption) => {
    const newExporting = new Set(exporting);
    newExporting.add(option.id);
    setExporting(newExporting);

    const historyEntry = {
      id: option.id,
      title: option.title,
      timestamp: new Date().toLocaleTimeString(),
      status: "pending" as const,
    };
    setExportHistory([historyEntry, ...exportHistory]);

    try {
      const response = await fetch(`http://localhost:8000/api/v1${option.endpoint}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${option.id}_${new Date().toISOString().split("T")[0]}.${option.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `${option.title} exported successfully`,
      });

      // Update history
      setExportHistory((prev) =>
        prev.map((entry) =>
          entry.id === option.id ? { ...entry, status: "success" } : entry
        )
      );
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Error",
        description: `Failed to export ${option.title}`,
        variant: "destructive",
      });

      // Update history
      setExportHistory((prev) =>
        prev.map((entry) =>
          entry.id === option.id ? { ...entry, status: "error" } : entry
        )
      );
    } finally {
      newExporting.delete(option.id);
      setExporting(newExporting);
    }
  };

  return (
    <DashboardLayout navItems={ADMIN_NAV_ITEMS} title="DATA EXPORT">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display text-foreground mb-1">Data Export Hub</h2>
            <p className="text-sm text-muted-foreground">
              Export platform data for reporting, backup, and compliance purposes
            </p>
          </div>
          <button
            onClick={() => setExportHistory([])}
            className="px-4 py-2 bg-muted/30 text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/50 transition-all flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Clear History
          </button>
        </div>

        {/* Export Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exportOptions.map((option) => (
            <GlassCard
              key={option.id}
              variant="neon"
              hover={true}
              className={`bg-gradient-to-br ${option.color} cursor-pointer group`}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-lg ${option.color} text-primary group-hover:scale-110 transition-transform`}>
                    {option.icon}
                  </div>
                  <span className="text-xs px-2 py-1 bg-muted/30 text-muted-foreground rounded-full font-medium">
                    {option.format.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-foreground font-semibold mb-1 text-lg">{option.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{option.description}</p>

                <button
                  onClick={() => handleExport(option)}
                  disabled={exporting.has(option.id)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {exporting.has(option.id) ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export Now
                    </>
                  )}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Features */}
          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Export Features
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>CSV format for easy spreadsheet compatibility</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>All data exported includes timestamps and IDs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Exports are processed server-side for performance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Large datasets are automatically paginated</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Export history shows all recent operations</span>
              </li>
            </ul>
          </GlassCard>

          {/* Compliance */}
          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              Data Privacy & Security
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">🔒</span>
                <span>All exports are logged for audit trail</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">🔒</span>
                <span>Access restricted to admin users only</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">🔒</span>
                <span>Sensitive data is properly formatted</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">🔒</span>
                <span>Downloads use secure HTTPS connection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">🔒</span>
                <span>Data retention policies are enforced</span>
              </li>
            </ul>
          </GlassCard>
        </div>

        {/* Export History */}
        {exportHistory.length > 0 && (
          <GlassCard variant="neon" hover={false}>
            <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Exports
            </h3>
            <div className="space-y-2">
              {exportHistory.slice(0, 5).map((entry, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted/20 border border-border/30 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                  </div>
                  {entry.status === "success" && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Success
                    </span>
                  )}
                  {entry.status === "pending" && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Processing
                    </span>
                  )}
                  {entry.status === "error" && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Failed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DataExport;
