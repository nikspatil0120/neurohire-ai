import {
  LayoutDashboard,
  Shield,
  Users,
  Building2,
  Briefcase,
  Code,
  BookOpen,
  Brain,
  FileText,
  Download,
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "System Monitor", href: "/admin/monitoring", icon: Shield },
  { label: "Recruiters", href: "/admin/recruiters", icon: Building2 },
  { label: "Candidates", href: "/admin/candidates", icon: Users },
  { label: "Incoming Jobs", href: "/admin/incoming-jobs", icon: Briefcase },
  { label: "Applications", href: "/admin/applications", icon: Users },
  { label: "DSA Problems", href: "/admin/dsa-problems", icon: Code },
  { label: "Aptitude Questions", href: "/admin/aptitude-questions", icon: BookOpen },
  { label: "AI Performance", href: "/admin/ai-performance", icon: Brain },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: FileText },
  { label: "Data Export", href: "/admin/data-export", icon: Download },
];
