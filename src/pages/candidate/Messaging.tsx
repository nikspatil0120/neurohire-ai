import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  LayoutDashboard, 
  MessageCircle, 
  Target,
  Briefcase,
  Building2,
  FileText,
  User,
  LogOut
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import WhatsAppChatInterface from "@/components/chat/WhatsAppChatInterface";

const navItems = [
  { label: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/candidate/practice", icon: Target },
  { label: "Company Interviews", href: "/candidate/interviews", icon: Building2 },
  { label: "Incoming Opportunities", href: "/candidate/incoming-opportunities", icon: Briefcase },
  { label: "Messages", href: "/candidate/messages", icon: MessageCircle },
  { label: "Reports", href: "/candidate/reports", icon: FileText },
  { label: "Profile", href: "/candidate/profile", icon: User },
  { label: "Logout", href: "/login", icon: LogOut },
];

const CandidateMessaging = () => {
  const { user } = useAuth();

  const email = user?.email || (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").email || "";
    } catch {
      return "";
    }
  })();

  const name = user?.name || "Candidate";

  return (
    <DashboardLayout navItems={navItems} title="MESSAGES">
      <div className="w-full h-full">
        <WhatsAppChatInterface
          currentUser={{
            id: email,
            email: email,
            name: name,
            role: "candidate"
          }}
          showNewChatButton={false}
        />
      </div>
    </DashboardLayout>
  );
};

export default CandidateMessaging;
