import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import { 
  LayoutDashboard, 
  Database, 
  BarChart2, 
  MessageCircle, 
  LogOut, 
  Send, 
  ChevronLeft, 
  ShieldAlert, 
  UserCheck, 
  Building2, 
  Search, 
  Sparkles 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "System Monitoring", href: "/admin/monitoring", icon: Database },
  { label: "Recruiters", href: "/admin/recruiters", icon: BarChart2 },
  { label: "Candidates", href: "/admin/candidates", icon: BarChart2 },
  { label: "Messages", href: "/admin/messages", icon: MessageCircle },
  { label: "Logout", href: "/login", icon: LogOut },
];

interface Conversation {
  _id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  recruiter_id: string;
  recruiter_name: string;
  recruiter_email: string;
  company_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  enabled?: boolean;
}

interface Message {
  _id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  recipient_id: string;
  recipient_name: string;
  recipient_role: string;
  content: string;
  company_name: string;
  created_at: string;
  read: boolean;
  message_type?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
}

const AdminMessaging = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminMessage, setAdminMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const adminEmail = user?.email || "admin@neurohire.ai";
  const adminName = user?.name || "System Admin";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => {
      loadConversations(true);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;
    loadMessages(selectedConversation);
    const interval = setInterval(() => {
      loadMessages(selectedConversation, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConversation?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async (silent = false) => {
    try {
      const res = await fetch(`${API}/messages/conversations/all`);
      if (!res.ok) throw new Error("Failed to load conversations");
      const d = await res.json();
      const list = d.conversations || [];
      setConversations(list);

      if (selectedConversation) {
        const updated = list.find((c: Conversation) => c._id === selectedConversation._id);
        if (updated) setSelectedConversation(updated);
      }
    } catch (e) {
      if (!silent) {
        console.error("Error loading conversations:", e);
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive"
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadMessages = async (conversation: Conversation, silent = false) => {
    try {
      const res = await fetch(`${API}/messages/conversation/${conversation._id}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const d = await res.json();
      setMessages(d.messages || []);
    } catch (e) {
      if (!silent) console.error("Error loading messages:", e);
    }
  };

  const handleAdminSend = async () => {
    if (!adminMessage.trim() || !selectedConversation || sending) return;

    const text = adminMessage.trim();
    setSending(true);

    try {
      const res = await fetch(`${API}/messages/admin/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: selectedConversation._id,
          admin_id: adminEmail,
          admin_name: adminName,
          content: text
        })
      });

      if (!res.ok) throw new Error("Failed to deliver admin message");

      setAdminMessage("");
      await loadMessages(selectedConversation);
      await loadConversations(true);

      toast({
        title: "Interference Message Sent",
        description: "Your message was posted to both Candidate and Recruiter."
      });
    } catch (e) {
      console.error("Error sending admin message:", e);
      toast({
        title: "Failed to send",
        description: "Could not post message to conversation.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const parseTimestamp = (timestamp: string): Date => {
    if (!timestamp) return new Date();
    if (!timestamp.endsWith("Z") && !timestamp.includes("+") && !timestamp.slice(10).includes("-")) {
      return new Date(timestamp + "Z");
    }
    return new Date(timestamp);
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = parseTimestamp(timestamp);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const filteredConversations = conversations.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      (c.candidate_name || "").toLowerCase().includes(q) ||
      (c.candidate_email || "").toLowerCase().includes(q) ||
      (c.recruiter_name || "").toLowerCase().includes(q) ||
      (c.company_name || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <DashboardLayout navItems={navItems} title="ADMIN MESSAGES & MODERATION">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={navItems} title="ADMIN MESSAGES & MODERATION">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-170px)]">
        {/* Left Side: Conversations List */}
        <div className={`lg:col-span-1 flex flex-col h-full ${selectedConversation ? "hidden lg:flex" : "flex"}`}>
          <GlassCard variant="neon" hover={false} className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="pb-3 border-b border-border/30 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  All Conversations
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {conversations.length}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter candidate or company..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-muted/20 border border-border/40 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 px-3 text-muted-foreground text-xs">
                  No conversations matching criteria
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedConversation?._id === conv._id;
                  return (
                    <div
                      key={conv._id}
                      onClick={() => {
                        setSelectedConversation(conv);
                        loadMessages(conv);
                      }}
                      className={`p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-amber-500/15 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                          : "bg-muted/10 border-border/30 hover:bg-muted/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {conv.candidate_name || conv.candidate_email}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            ⇄ {conv.recruiter_name || conv.company_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-2.5 h-2.5" />
                            <span className="truncate">{conv.company_name}</span>
                          </p>
                        </div>
                        <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap ml-1">
                          {formatTime(conv.last_message_time)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-2 bg-muted/20 px-2 py-1 rounded">
                        {conv.last_message || "No messages yet"}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Conversation stream & Interference Input */}
        <div className={`lg:col-span-3 flex flex-col h-full ${!selectedConversation ? "hidden lg:flex" : "flex"}`}>
          {selectedConversation ? (
            <GlassCard variant="neon" hover={false} className="flex-1 flex flex-col p-4 overflow-hidden">
              {/* Header */}
              <div className="border-b border-border/30 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="lg:hidden p-1.5 hover:bg-muted/20 rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm sm:text-base flex items-center gap-2">
                      <span>{selectedConversation.candidate_name}</span>
                      <span className="text-xs text-muted-foreground">({selectedConversation.candidate_email})</span>
                      <span className="text-muted-foreground">⇄</span>
                      <span>{selectedConversation.recruiter_name}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="font-medium text-foreground/80">{selectedConversation.company_name}</span>
                      <span>&bull;</span>
                      <span>{selectedConversation.recruiter_email}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Admin Oversight Mode
                  </span>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 px-1">
                {messages.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-xs space-y-2">
                    <Sparkles className="w-6 h-6 mx-auto text-primary" />
                    <p>No messages exchanged in this conversation yet.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isCandidate = m.sender_role === "candidate";
                    const isAdmin = m.sender_role === "admin";
                    const isRecruiter = m.sender_role === "recruiter";

                    return (
                      <div
                        key={m._id}
                        className={`flex flex-col ${
                          isAdmin ? "items-center" : isCandidate ? "items-start" : "items-end"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            {m.sender_name}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                              isAdmin
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : isCandidate
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-primary/20 text-primary"
                            }`}
                          >
                            {m.sender_role.toUpperCase()}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isAdmin
                              ? "bg-amber-500/15 border-2 border-amber-500/40 text-foreground shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                              : isCandidate
                              ? "bg-emerald-500/10 border border-emerald-500/30 text-foreground rounded-tl-none"
                              : "bg-primary/10 border border-primary/30 text-foreground rounded-tr-none"
                          }`}
                        >
                          {m.message_type === "image" && m.file_url && (
                            <div className="mb-2 overflow-hidden rounded-lg">
                              <img src={m.file_url} alt={m.file_name || "Attachment"} className="max-h-60 rounded object-cover" />
                            </div>
                          )}
                          {m.message_type === "file" && m.file_url && (
                            <div className="mb-2 flex items-center justify-between gap-3 p-2 rounded bg-background/50 border border-border/40">
                              <span className="text-xs truncate max-w-[180px] font-medium">{m.file_name || "Document"}</span>
                              <a href={m.file_url} download target="_blank" rel="noreferrer" className="text-xs text-primary underline">
                                Download
                              </a>
                            </div>
                          )}
                          <p className="break-words">{m.content}</p>
                          <div className="flex items-center justify-end mt-1 text-[10px] text-muted-foreground">
                            <span>{formatTime(m.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Admin Interference Box */}
              <div className="border-t border-border/30 pt-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAdminSend();
                  }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-amber-400 px-1">
                    <span className="flex items-center gap-1 font-medium">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Interfere in this conversation
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Visible to both candidate and recruiter as Administrator
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={adminMessage}
                      onChange={(e) => setAdminMessage(e.target.value)}
                      placeholder="Type admin intervention / moderation message..."
                      className="flex-1 px-4 py-2.5 rounded-xl bg-muted/30 border border-amber-500/30 text-foreground text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-500/60 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!adminMessage.trim() || sending}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm flex items-center gap-2 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </div>
            </GlassCard>
          ) : (
            <GlassCard variant="neon" hover={false} className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/30">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Select a Chat to Monitor</h3>
              <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                As an administrator, you have full visibility into all candidate-recruiter messaging. You can read any conversation stream and interfere with messages whenever moderation or support is required.
              </p>
            </GlassCard>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminMessaging;
