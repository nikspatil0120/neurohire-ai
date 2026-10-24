import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  Code,
  BookOpen,
  Download,
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Recruiters", href: "/admin/recruiters", icon: Building2 },
  { label: "Candidates", href: "/admin/candidates", icon: Users },
  { label: "Jobs", href: "/admin/incoming-jobs", icon: Briefcase },
  { label: "Applications", href: "/admin/applications", icon: Users },
  { label: "DSA Problems", href: "/admin/dsa-problems", icon: Code },
  { label: "Aptitude Questions", href: "/admin/aptitude-questions", icon: BookOpen },
  { label: "Data Export", href: "/admin/data-export", icon: Download },
];
