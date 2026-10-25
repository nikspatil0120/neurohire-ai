import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  LayoutDashboard,
  FilePlus,
  Database,
  BarChart2,
  MessageCircle,
  LogOut,
  X,
  User,
  Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import WhatsAppChatInterface from "@/components/chat/WhatsAppChatInterface";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },
  { label: "Create Job", href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB", href: "/recruiter/questions", icon: Database },
  { label: "Reports", href: "/recruiter/rankings", icon: BarChart2 },
  { label: "Messages", href: "/recruiter/messages", icon: MessageCircle },
  { label: "Logout", href: "/login", icon: LogOut },
];

interface Job {
  _id: string;
  title: string;
  organization_name: string;
}

interface Application {
  _id: string;
  candidate_name: string;
  candidate_email: string;
  job_id: string;
  job_title: string;
  status: string;
}

const RecruiterMessaging = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
  const [startingChat, setStartingChat] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  const email =
    user?.email ||
    (() => {
      try {
        return JSON.parse(localStorage.getItem("user") || "{}").email || "";
      } catch {
        return "";
      }
    })();

  const name = user?.name || "Recruiter";

  useEffect(() => {
    if (!email) return;
    loadJobs();
  }, [email]);

  const loadJobs = async () => {
    try {
      const res = await fetch(`${API}/jobs/recruiter/${encodeURIComponent(email)}`);
      if (!res.ok) throw new Error("Failed to load jobs");
      const d = await res.json();
      setJobs(d.jobs || []);
    } catch (e) {
      console.error("Error loading jobs:", e);
    }
  };

  const loadApplications = async (jobId: string) => {
    try {
      const res = await fetch(`${API}/applications/job/${jobId}`);
      if (!res.ok) throw new Error("Failed to load applications");
      const d = await res.json();
      setApplications(d.applications || []);
    } catch (e) {
      console.error("Error loading applications:", e);
    }
  };

  const handleStartNewConversation = async () => {
    if (!selectedCandidate || !selectedJob) return;

    const job = jobs.find((j) => j._id === selectedJob);
    if (!job) return;

    setStartingChat(true);

    try {
      const res = await fetch(`${API}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: `${email}_${selectedCandidate.candidate_email}`,
          sender_id: email,
          sender_name: name,
          sender_role: "recruiter",
          recipient_id: selectedCandidate.candidate_email,
          recipient_name: selectedCandidate.candidate_name,
          recipient_role: "candidate",
          content: `Hi ${selectedCandidate.candidate_name}, I'd like to connect regarding your application for ${job.title}.`,
          company_name: job.organization_name
        })
      });

      if (!res.ok) throw new Error("Failed to start conversation");

      setShowNewChatModal(false);
      setSelectedCandidate(null);
      setSelectedJob("");
      setChatKey((prev) => prev + 1);

      toast({
        title: "Conversation Started",
        description: `Chat opened with ${selectedCandidate.candidate_name}`
      });
    } catch (e) {
      console.error("Error starting conversation:", e);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive"
      });
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems} title="MESSAGES">
      <div className="w-full h-full">
        <WhatsAppChatInterface
          key={chatKey}
          currentUser={{
            id: email,
            email: email,
            name: name,
            role: "recruiter"
          }}
          showNewChatButton={true}
          onNewChatClick={() => setShowNewChatModal(true)}
        />
      </div>

      {/* New Chat Modal: Select Job & Candidate */}
      {showNewChatModal && (
        <div
          onClick={() => setShowNewChatModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-[#111b21] p-6 shadow-2xl border border-[#222e35]"
          >
            <div className="flex items-center justify-between border-b border-[#222e35] pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884]/20 text-[#00a884]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#e9edef]">New WhatsApp Chat</h3>
                  <p className="text-xs text-[#8696a0]">Connect with candidates who applied to your jobs</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="rounded-full p-1.5 text-[#8696a0] hover:bg-[#202c33] hover:text-[#e9edef]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Select Job */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#8696a0] mb-1.5">
                  1. Select Job Posting
                </label>
                <select
                  value={selectedJob}
                  onChange={(e) => {
                    setSelectedJob(e.target.value);
                    setSelectedCandidate(null);
                    if (e.target.value) {
                      loadApplications(e.target.value);
                    } else {
                      setApplications([]);
                    }
                  }}
                  className="w-full rounded-xl bg-[#202c33] px-4 py-2.5 text-xs text-[#e9edef] border border-[#222e35] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
                >
                  <option value="">Choose a job posting...</option>
                  {jobs.map((job) => (
                    <option key={job._id} value={job._id}>
                      {job.title} — {job.organization_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Candidate */}
              {selectedJob && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#8696a0] mb-1.5">
                    2. Select Candidate ({applications.length} Applicants)
                  </label>
                  <div className="max-h-56 overflow-y-auto space-y-2 custom-scrollbar p-1">
                    {applications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#8696a0] rounded-xl bg-[#202c33]/50">
                        No candidates have applied to this job posting yet.
                      </div>
                    ) : (
                      applications.map((app) => {
                        const isChosen = selectedCandidate?._id === app._id;
                        return (
                          <div
                            key={app._id}
                            onClick={() => setSelectedCandidate(app)}
                            className={cn(
                              "flex cursor-pointer items-center justify-between rounded-xl p-3 border transition-all",
                              isChosen
                                ? "bg-[#00a884]/20 border-[#00a884] shadow-sm"
                                : "bg-[#202c33] border-[#222e35] hover:bg-[#2a3942]"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#128c7e] to-[#075e54] text-xs font-bold text-white">
                                {app.candidate_name?.[0]?.toUpperCase() || "C"}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#e9edef] truncate">
                                  {app.candidate_name}
                                </p>
                                <p className="text-[11px] text-[#8696a0] truncate">
                                  {app.candidate_email}
                                </p>
                              </div>
                            </div>
                            <span className="rounded-full bg-[#111b21] px-2 py-0.5 text-[10px] font-medium text-[#00a884] capitalize">
                              {app.status || "Applied"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="flex-1 rounded-xl bg-[#202c33] py-2.5 text-xs font-semibold text-[#d1d7db] hover:bg-[#374248] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartNewConversation}
                  disabled={!selectedCandidate || startingChat}
                  className="flex-1 rounded-xl bg-[#00a884] py-2.5 text-xs font-semibold text-white hover:bg-[#02906f] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startingChat ? "Opening Chat..." : "Start Chat"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default RecruiterMessaging;
