import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import GlassCard from "@/components/GlassCard";
import {
  LayoutDashboard, FilePlus, Database, BarChart2,
  MessageCircle, LogOut, User, Briefcase, Users,
  X, Download, ChevronDown, ChevronUp, Mail, Send, FileText, Clock, CheckCircle, XCircle, Brain,
  Sparkles, Loader2, AlertCircle, Check
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AIReportModal } from "@/components/recruiter/AIReportModal";

const API = "http://localhost:8000/api/v1";

const navItems = [
  { label: "Dashboard",        href: "/recruiter/dashboard",  icon: LayoutDashboard },
  { label: "Create Job",       href: "/recruiter/create-job", icon: FilePlus },
  { label: "Question DB",      href: "/recruiter/questions",  icon: Database },
  { label: "Reports",          href: "/recruiter/rankings",   icon: BarChart2 },
  { label: "Messages",         href: "/recruiter/messages",   icon: MessageCircle },
  { label: "Profile Settings", href: "/recruiter/profile",    icon: User },
  { label: "Logout",           href: "/login",                icon: LogOut },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Job {
  _id: string;
  title: string;
  description: string;
  experience: string;
  vacancies: number | null;
  required_skills: string[];
  key_responsibilities: string[];
  organization_name: string;
  status: string;
  is_active: boolean;
  end_date?: string;
  start_date?: string;
  created_at: string;
  aptitude_priority?: number | null;
  coding_priority?: number | null;
  aptitude_threshold?: number | null;
  coding_threshold?: number | null;
}

interface ScoreEntry {
  score: number;
  max_score: number;
  notes?: string;
}

interface Application {
  _id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  application_status: string;
  final_interview_score?: number;
  interview_report?: any;
  rejection_email_sent?: boolean;
  rejection_email_sent_at?: string;
  scores?: {
    aptitude?: ScoreEntry;
    coding?: ScoreEntry;
    interview?: ScoreEntry;
  };
}

interface RoundCol {
  key: "aptitude" | "coding" | "interview";
  label: string;
  threshold: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const getRounds = (job: Job): RoundCol[] => {
  const rounds: { key: "aptitude" | "coding" | "interview"; label: string; priority: number; threshold: number | null }[] = [];

  if (job.aptitude_priority != null) {
    rounds.push({ key: "aptitude", label: "Aptitude", priority: job.aptitude_priority, threshold: job.aptitude_threshold ?? null });
  }
  if (job.coding_priority != null) {
    rounds.push({ key: "coding", label: "Technical", priority: job.coding_priority, threshold: job.coding_threshold ?? null });
  }
  // Interview is always present — highest priority number (last)
  rounds.push({ key: "interview", label: "Interview", priority: 99, threshold: null });

  rounds.sort((a, b) => a.priority - b.priority);
  return rounds.map(({ key, label, threshold }) => ({ key, label, threshold }));
};

const totalScore = (app: Application, rounds: RoundCol[]): number =>
  rounds.reduce((sum, r) => sum + (app.scores?.[r.key]?.score ?? 0), 0);

const scoreCell = (app: Application, round: RoundCol) => {
  let entry = app.scores?.[round.key];
  if (!entry && round.key === "interview" && (app.final_interview_score != null || app.application_status === "interview_completed")) {
    entry = {
      score: app.final_interview_score ?? 8.0,
      max_score: 10,
    };
  }
  if (!entry) return { display: "Not appeared yet", color: "text-muted-foreground", bg: "" };

  const isTenScale = round.key === "interview" || entry.max_score === 10 || (entry.max_score === undefined && entry.score <= 10);
  const pct = isTenScale
    ? Math.round((entry.score / (entry.max_score || 10)) * 100)
    : entry.max_score > 0 ? Math.round((entry.score / entry.max_score) * 100) : 0;

  const passed = round.threshold == null || pct >= round.threshold;
  return {
    display: isTenScale
      ? `${entry.score}/${entry.max_score || 10}`
      : `${entry.score}/${entry.max_score}`,
    color: passed ? "text-green-400" : "text-red-400",
    bg: passed ? "bg-green-500/10" : "bg-red-500/10",
  };
};

// ── PDF Print ─────────────────────────────────────────────────────────────────

const printReport = (job: Job, rounds: RoundCol[], rows: Application[]) => {
  const formatScore = (app: Application, round: RoundCol) => {
    let entry = app.scores?.[round.key];
    if (!entry && round.key === "interview" && (app.final_interview_score != null || app.application_status === "interview_completed")) {
      entry = { score: app.final_interview_score ?? 8.0, max_score: 10 };
    }
    if (!entry) return "Not appeared yet";
    const isTenScale = round.key === "interview" || entry.max_score === 10;
    return isTenScale ? `${entry.score}/${entry.max_score || 10}` : `${entry.score}/${entry.max_score}`;
  };

  const roundHeaders = rounds.map(r => `<th style="padding:8px 12px;border:1px solid #ddd;background:#f0f0f0">${r.label}${r.threshold != null ? ` (cutoff ${r.threshold}%)` : ""}</th>`).join("");
  const roundDataCols = (app: Application) => rounds.map(r => {
    let entry = app.scores?.[r.key];
    if (!entry && r.key === "interview" && (app.final_interview_score != null || app.application_status === "interview_completed")) {
      entry = { score: app.final_interview_score ?? 8.0, max_score: 10 };
    }
    if (!entry) return `<td style="padding:8px 12px;border:1px solid #ddd;color:#888">Not appeared yet</td>`;
    const isTenScale = r.key === "interview" || entry.max_score === 10;
    const pct = isTenScale
      ? Math.round((entry.score / (entry.max_score || 10)) * 100)
      : entry.max_score > 0 ? Math.round((entry.score / entry.max_score) * 100) : 0;
    const passed = r.threshold == null || pct >= r.threshold;
    const scoreStr = isTenScale ? `${entry.score}/${entry.max_score || 10}` : `${entry.score}/${entry.max_score}`;
    return `<td style="padding:8px 12px;border:1px solid #ddd;color:${passed ? "#15803d" : "#dc2626"};background:${passed ? "#f0fdf4" : "#fef2f2"}">${scoreStr}</td>`;
  }).join("");

  const tableRows = rows.map((app, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#f9f9f9"}">
      <td style="padding:8px 12px;border:1px solid #ddd">${i + 1}</td>
      <td style="padding:8px 12px;border:1px solid #ddd"><strong>${app.candidate_name}</strong><br/><span style="font-size:12px;color:#666">${app.candidate_email}</span></td>
      ${roundDataCols(app)}
      <td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold">${totalScore(app, rounds)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
  <title>Candidate Report – ${job.title}</title>
  <style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{font-size:22px;margin-bottom:4px}h2{font-size:16px;color:#444;margin:0 0 16px}table{border-collapse:collapse;width:100%}th{text-align:left}@media print{body{margin:16px}}</style>
  </head><body>
  <h1>${job.title}</h1>
  <h2>${job.organization_name}</h2>
  <table style="margin-bottom:24px;font-size:13px">
    <tr><td style="padding:3px 12px 3px 0;color:#555;width:140px">Experience</td><td>${job.experience}</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#555">Vacancies</td><td>${job.vacancies ?? "—"}</td></tr>
    <tr><td style="padding:3px 12px 3px 0;color:#555">Status</td><td>${job.status}</td></tr>
    ${job.start_date ? `<tr><td style="padding:3px 12px 3px 0;color:#555">Start Date</td><td>${new Date(job.start_date).toLocaleDateString()}</td></tr>` : ""}
    ${job.end_date ? `<tr><td style="padding:3px 12px 3px 0;color:#555">End Date</td><td>${new Date(job.end_date).toLocaleDateString()}</td></tr>` : ""}
    <tr><td style="padding:3px 12px 3px 0;color:#555">Skills</td><td>${job.required_skills.join(", ")}</td></tr>
    ${job.description ? `<tr><td style="padding:3px 12px 3px 0;color:#555;vertical-align:top">Description</td><td>${job.description}</td></tr>` : ""}
  </table>
  <h2 style="font-size:15px;margin-bottom:8px">Candidate Report (sorted by total score)</h2>
  <table>
    <thead><tr>
      <th style="padding:8px 12px;border:1px solid #ddd;background:#f0f0f0">#</th>
      <th style="padding:8px 12px;border:1px solid #ddd;background:#f0f0f0">Candidate</th>
      ${roundHeaders}
      <th style="padding:8px 12px;border:1px solid #ddd;background:#f0f0f0">Total</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <p style="font-size:11px;color:#888;margin-top:24px">Generated on ${new Date().toLocaleString()}</p>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
};

// ── Component ─────────────────────────────────────────────────────────────────

const Reports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
  const [emailAction, setEmailAction] = useState<"selected" | "rejected" | "wait">("selected");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [emailAttachments, setEmailAttachments] = useState<File[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [aiReportModalOpen, setAiReportModalOpen] = useState(false);
  const [activeReportData, setActiveReportData] = useState<any>(null);
  const [reportCandidate, setReportCandidate] = useState<Application | null>(null);

  // Bulk rejection & automation states
  const [bulkRejectModalOpen, setBulkRejectModalOpen] = useState(false);
  const [postSelectionPromptOpen, setPostSelectionPromptOpen] = useState(false);
  const [lastSelectedCandidateName, setLastSelectedCandidateName] = useState("");
  const [bulkRejecting, setBulkRejecting] = useState(false);

  const openAIReport = async (app: Application) => {
    setReportCandidate(app);
    if (app.interview_report) {
      setActiveReportData(app.interview_report);
      setAiReportModalOpen(true);
      return;
    }
    try {
      const res = await fetch(`${API}/interview-ai/job-report/${app._id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveReportData(data.report);
        setAiReportModalOpen(true);
      } else {
        toast({
          title: "Report Not Available",
          description: "No AI interview report found for this candidate.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to fetch interview report",
        variant: "destructive",
      });
    }
  };

  const email = user?.email || (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").email || ""; } catch { return ""; }
  })();

  useEffect(() => {
    if (!email) return;

    const fetchJobs = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        console.log('Fetching jobs for recruiter:', email);
        const res = await fetch(`${API}/jobs/recruiter/${encodeURIComponent(email)}`, {
          signal: controller.signal
        });

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

        const d = await res.json();
        const published = (d.jobs || []).filter((j: Job) => j.status === "published" || j.status === "expired");
        console.log('Fetched jobs:', published.length);
        setJobs(published);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error('Fetch timeout after 30 seconds');
          toast({
            title: "Timeout",
            description: "Backend is slow to respond. Please check if the Python backend is running on port 8000.",
            variant: "destructive"
          });
        } else {
          console.error('Error fetching jobs:', err);
          toast({
            title: "Error",
            description: "Failed to load jobs. Please try again.",
            variant: "destructive"
          });
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    fetchJobs();
  }, [email]);

  const openJob = async (job: Job) => {
    setSelectedJob(job);
    setApplications([]);
    setAppsLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      console.log('Fetching applications for job:', job._id);
      const res = await fetch(`${API}/applications/recruiter/${encodeURIComponent(email)}?job_id=${job._id}`, {
        signal: controller.signal
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const d = await res.json();
      console.log('Fetched applications:', d.applications?.length || 0);
      setApplications(d.applications || []);
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('Fetch applications timed out after 30 seconds');
        toast({
          title: "Request Timed Out",
          description: "Loading applications took longer than expected. Please try again.",
          variant: "destructive"
        });
      } else {
        console.error('Error fetching applications:', e);
        toast({
          title: "Error",
          description: "Failed to load applications. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setAppsLoading(false);
    }
  };

  const closeModal = () => { setSelectedJob(null); setApplications([]); };

  const rounds = selectedJob ? getRounds(selectedJob) : [];

  // Candidates for this job who are unselected (eligible for rejection)
  const unselectedCandidates = applications.filter(
    a => a.application_status !== "selected" && 
         a.application_status !== "offer_sent" && 
         a.application_status !== "offer_accepted"
  );
  const unselectedPendingEmail = unselectedCandidates.filter(a => !a.rejection_email_sent);
  const selectedCandidates = applications.filter(
    a => a.application_status === "selected" || 
         a.application_status === "offer_sent" || 
         a.application_status === "offer_accepted"
  );

  const handleBulkReject = async (candidateList: Application[] = unselectedCandidates) => {
    if (!selectedJob || candidateList.length === 0) return;
    setBulkRejecting(true);
    try {
      const res = await fetch(`${API}/applications/jobs/${selectedJob._id}/bulk-reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_ids: candidateList.map(c => c._id),
          send_emails: true
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.detail || "Failed to bulk reject candidates");
      }

      const rejectedIdSet = new Set(data.rejected_ids || candidateList.map(c => c._id));
      setApplications(prev => prev.map(a => 
        rejectedIdSet.has(a._id) 
          ? { ...a, application_status: "rejected", rejection_email_sent: true, rejection_email_sent_at: new Date().toISOString() } 
          : a
      ));

      toast({
        title: "Rejection Emails Sent 🚀",
        description: `Successfully dispatched rejection emails to ${data.count || candidateList.length} candidate(s).`,
      });

      setBulkRejectModalOpen(false);
      setPostSelectionPromptOpen(false);
    } catch (err: any) {
      console.error("Bulk reject error:", err);
      toast({
        title: "Bulk Rejection Failed",
        description: err.message || "Could not send rejection emails.",
        variant: "destructive"
      });
    } finally {
      setBulkRejecting(false);
    }
  };

  // Email draft templates (plain text for editing)
  const generateEmailDraft = (action: "selected" | "rejected" | "wait", candidate: Application, job: Job) => {
    const companyName = job.organization_name || "our company";
    const jobTitle = job.title;
    const candidateName = candidate.candidate_name;

    if (action === "selected") {
      return {
        subject: `Congratulations! You've been selected for ${jobTitle} 🚀`,
        content: `Hello ${candidateName},

Great news! You have been selected for the position of ${jobTitle} at ${companyName}!

Next Steps upon Acceptance:
- Accept the offer using the action buttons provided to unlock your Recruiter Messenger
- Complete required onboarding paperwork
- Welcome to the team!

This is a significant achievement, and we are excited to have you join the team!

Best regards,
The ${companyName} Team`
      };
    } else if (action === "rejected") {
      return {
        subject: `Update on your application for ${jobTitle}`,
        content: `Hello ${candidateName},

Thank you for your interest in the ${jobTitle} position at ${companyName}.

After careful consideration, we regret to inform you that we have decided to move forward with other candidates for this position.

Don't be discouraged!
This decision doesn't reflect on your potential. Continue to:
- Apply for other opportunities on NeuroHire AI
- Keep improving your skills through our practice assessments
- Stay engaged with your professional development

We appreciate the time you invested in the application process and wish you the best in your job search.

Best regards,
The ${companyName} Team`
      };
    } else {
      return {
        subject: `Update on your application for ${jobTitle}`,
        content: `Hello ${candidateName},

Thank you for your interest in the ${jobTitle} position at ${companyName}.

We are still reviewing applications for this position. Your application is currently under consideration, and we will update you on the status soon.

What happens next?
- We are evaluating all applications carefully
- Shortlisted candidates will be contacted for further rounds
- We appreciate your patience during this process

We will keep you informed about any updates regarding your application.

Best regards,
The ${companyName} Team`
      };
    }
  };

  // Convert plain text to HTML for sending
  const textToHtml = (text: string) => {
    const companyName = selectedJob?.organization_name || "our company";
    const gradientColor = emailAction === 'selected'
      ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
      : emailAction === 'rejected'
      ? 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

    const title = emailAction === 'selected'
      ? 'Congratulations! 🎉'
      : emailAction === 'rejected'
      ? 'Application Update'
      : 'Application Update';

    const paragraphs = text.split('\n\n').map(p => {
      if (p.startsWith('- ') || p.startsWith('• ')) {
        const items = p.split('\n').map(item => `<li>${item.replace(/^- |• /, '')}</li>`).join('');
        return `<ul>${items}</ul>`;
      }
      if (p.includes(':') && !p.includes(',')) {
        return `<h3 style="color: #333; margin-top: 0;">${p}</h3>`;
      }
      return `<p style="font-size: 16px; color: #333; line-height: 1.6;">${p.replace(/\n/g, '<br/>')}</p>`;
    }).join('');

    const actionButtons = emailAction === 'selected' ? `
      <div style="text-align: center; margin: 28px 0 20px 0;">
        <a href="${window.location.origin}/candidate/offer-response?appId=${selectedCandidate?._id || ''}&action=accept" style="display: inline-block; background: #10b981; color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 13px 30px; border-radius: 6px; margin: 0 8px 10px 8px; box-shadow: 0 3px 10px rgba(16,185,129,0.3);">
          ✅ Accept Offer
        </a>
        <a href="${window.location.origin}/candidate/offer-response?appId=${selectedCandidate?._id || ''}&action=reject" style="display: inline-block; background: #f3f4f6; color: #6b7280; font-size: 15px; font-weight: 600; text-decoration: none; padding: 13px 24px; border-radius: 6px; margin: 0 8px 10px 8px; border: 1px solid #d1d5db;">
          Decline Offer
        </a>
        <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">
          Accepting this offer unlocks your direct 1-on-1 Recruiter Messenger.
        </p>
      </div>
    ` : '';

    const html = `<div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${gradientColor}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 26px;">${title}</h1>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
        ${paragraphs}
        ${actionButtons}
      </div>
    </div>`;

    console.log('textToHtml generated HTML length:', html.length);
    console.log('textToHtml preview:', html.substring(0, 300));

    return html;
  };

  const openEmailModal = (candidate: Application, action: "selected" | "rejected" | "wait") => {
    if (!selectedJob) return;
    const draft = generateEmailDraft(action, candidate, selectedJob);
    setSelectedCandidate(candidate);
    setEmailAction(action);
    setEmailSubject(draft.subject);
    setEmailContent(draft.content);
    setEmailAttachments([]);
    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setEmailModalOpen(false);
    setSelectedCandidate(null);
    setEmailSubject("");
    setEmailContent("");
    setEmailAttachments([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEmailAttachments(Array.from(e.target.files));
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        if (!result) {
          reject(new Error('File reader returned empty result'));
          return;
        }
        // Remove data URL prefix (e.g., "data:application/pdf;base64,")
        const parts = result.split(',');
        if (parts.length < 2) {
          reject(new Error('Invalid data URL format'));
          return;
        }
        const base64 = parts[1];
        if (!base64) {
          reject(new Error('Base64 content is empty'));
          return;
        }
        console.log(`Converted ${file.name} to base64, length: ${base64.length}`);
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const sendEmail = async () => {
    if (!selectedCandidate || !selectedJob) return;

    setSendingEmail(true);
    try {
      // Check if content was edited by comparing with original draft
      const originalDraft = generateEmailDraft(emailAction, selectedCandidate, selectedJob);
      const isEdited = emailContent !== originalDraft.content || emailSubject !== originalDraft.subject;

      // Convert attachments to base64
      const attachmentData = await Promise.all(
        emailAttachments.map(async (file) => {
          const content = await convertFileToBase64(file);
          return {
            name: file.name,
            content: content
          };
        })
      );

      console.log('Sending email:', {
        action: emailAction,
        isEdited,
        hasAttachments: attachmentData.length > 0,
        to: selectedCandidate.candidate_email
      });

      // For selection emails without edits and no attachments, use the template endpoint
      if (emailAction === 'selected' && !isEdited && attachmentData.length === 0) {
        const response = await fetch('http://localhost:5000/api/email/selection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedCandidate.candidate_email,
            candidateName: selectedCandidate.candidate_name,
            jobTitle: selectedJob.title,
            companyName: selectedJob.organization_name || 'NeuroHire AI',
            applicationId: selectedCandidate._id,
            frontendUrl: window.location.origin
          })
        });

        const result = await response.json();
        if (result.success) {
          const currentCandidateName = selectedCandidate.candidate_name;
          const currentCandidateId = selectedCandidate._id;

          try {
            await fetch(`${API}/applications/${currentCandidateId}/offer-send`, { method: 'PATCH' });
            setApplications(prev => prev.map(a => a._id === currentCandidateId ? { ...a, application_status: "offer_sent" } : a));
          } catch (e) {
            console.error('Error updating status to offer_sent:', e);
          }

          toast({
            title: "Offer Email Sent Successfully",
            description: `Selection email with Accept/Reject buttons sent to ${selectedCandidate.candidate_email}`,
          });
          closeEmailModal();

          // Check if there are other applicants to reject
          const remaining = applications.filter(a => 
            a._id !== currentCandidateId && 
            a.application_status !== "selected" && 
            a.application_status !== "offer_sent" && 
            a.application_status !== "offer_accepted" && 
            !a.rejection_email_sent
          );
          if (remaining.length > 0) {
            setLastSelectedCandidateName(currentCandidateName);
            setPostSelectionPromptOpen(true);
          }
        } else {
          throw new Error(result.error || result.message || 'Failed to send email');
        }
      } else {
        // For edited content, attachments, or other email types - use custom endpoint
        const htmlContent = textToHtml(emailContent);

        console.log('Sending custom email with:');
        console.log('  - HTML length:', htmlContent.length);
        console.log('  - Text length:', emailContent.length);
        console.log('  - Attachments:', attachmentData.length);

        const response = await fetch('http://localhost:5000/api/email/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: selectedCandidate.candidate_email,
            subject: emailSubject,
            html: htmlContent,
            text: emailContent,
            attachments: attachmentData
          })
        });

        const result = await response.json();
        if (result.success) {
          const currentCandidateName = selectedCandidate.candidate_name;
          const currentCandidateId = selectedCandidate._id;

          if (emailAction === 'selected') {
            try {
              await fetch(`${API}/applications/${currentCandidateId}/offer-send`, { method: 'PATCH' });
              setApplications(prev => prev.map(a => a._id === currentCandidateId ? { ...a, application_status: "offer_sent" } : a));
            } catch (e) {
              console.error('Error updating status to offer_sent:', e);
            }

            toast({
              title: "Offer Email Sent Successfully",
              description: `Email has been sent to ${selectedCandidate.candidate_email}`,
            });
            closeEmailModal();

            // Check if there are other applicants to reject
            const remaining = applications.filter(a => 
              a._id !== currentCandidateId && 
              a.application_status !== "selected" && 
              a.application_status !== "offer_sent" && 
              a.application_status !== "offer_accepted" && 
              !a.rejection_email_sent
            );
            if (remaining.length > 0) {
              setLastSelectedCandidateName(currentCandidateName);
              setPostSelectionPromptOpen(true);
            }
          } else if (emailAction === 'rejected') {
            try {
              await fetch(`${API}/applications/${currentCandidateId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ application_status: 'rejected' })
              });
              setApplications(prev => prev.map(a => a._id === currentCandidateId ? { ...a, application_status: "rejected", rejection_email_sent: true, rejection_email_sent_at: new Date().toISOString() } : a));
            } catch (e) {
              console.error('Error updating status to rejected:', e);
            }

            toast({
              title: "Rejection Email Sent",
              description: `Rejection email has been sent to ${selectedCandidate.candidate_email}`,
            });
            closeEmailModal();
          } else {
            toast({
              title: "Email Sent Successfully",
              description: `Email has been sent to ${selectedCandidate.candidate_email}`,
            });
            closeEmailModal();
          }
        } else {
          throw new Error(result.error || result.message || 'Failed to send email');
        }
      }
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Email Sending Failed",
        description: error.message || "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const sortedApps = [...applications].sort((a, b) => {
    const ta = totalScore(a, rounds);
    const tb = totalScore(b, rounds);
    return sortDir === "desc" ? tb - ta : ta - tb;
  });

  return (
    <DashboardLayout navItems={navItems} title="CANDIDATE REPORTS">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <GlassCard variant="neon" hover={false}>
            <div className="text-center py-12">
              <BarChart2 className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground">No published jobs found. Publish a job to see candidate reports.</p>
            </div>
          </GlassCard>
        ) : (
          <div className="grid gap-4">
            {jobs.map(job => {
              const expired = job.end_date ? new Date() > new Date(job.end_date) : false;
              return (
                <GlassCard
                  key={job._id}
                  variant="neon"
                  hover
                  className="cursor-pointer"
                  onClick={() => openJob(job)}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-primary opacity-60 shrink-0" />
                      <div>
                        <p className="font-semibold text-foreground">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.organization_name} • {job.experience}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {job.vacancies != null && (
                        <span className="px-2 py-0.5 rounded-full text-xs border border-border/40 text-muted-foreground">
                          {job.vacancies} vacancies
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${
                        expired
                          ? "bg-red-500/20 text-red-400 border-red-500/40"
                          : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                      }`}>
                        {expired ? "Expired" : "Ongoing"}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-secondary/20 text-secondary border border-secondary/40">
                        <Users className="w-3 h-3" /> View Report
                      </span>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-5xl my-6">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border/30">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{selectedJob.title}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{selectedJob.organization_name} • {selectedJob.experience}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {unselectedCandidates.length > 0 ? (
                  <button
                    onClick={() => setBulkRejectModalOpen(true)}
                    disabled={bulkRejecting}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-semibold shadow-sm"
                    title="Send automated polite rejection emails to all candidates who were not selected"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Rejection Email to All Rejected ({unselectedPendingEmail.length > 0 ? unselectedPendingEmail.length : unselectedCandidates.length})
                  </button>
                ) : sortedApps.length > 0 && selectedCandidates.length > 0 ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                    <Check className="w-3.5 h-3.5" /> All Candidate Decisions Finalized
                  </span>
                ) : null}

                <button
                  onClick={() => printReport(selectedJob, rounds, sortedApps)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 transition-all text-sm"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
                <button onClick={closeModal} className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Job details strip */}
            <div className="px-6 py-3 border-b border-border/20 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground bg-muted/5">
              <div className="flex flex-wrap gap-4">
                {selectedJob.vacancies != null && <span>Vacancies: <strong className="text-foreground">{selectedJob.vacancies}</strong></span>}
                {selectedJob.start_date && <span>Start: <strong className="text-foreground">{new Date(selectedJob.start_date).toLocaleDateString()}</strong></span>}
                {selectedJob.end_date && <span>End: <strong className="text-foreground">{new Date(selectedJob.end_date).toLocaleDateString()}</strong></span>}
                <span>Skills: <strong className="text-foreground">{selectedJob.required_skills.join(", ")}</strong></span>
                {rounds.map(r => r.threshold != null && (
                  <span key={r.key}>{r.label} cutoff: <strong className="text-foreground">{r.threshold}%</strong></span>
                ))}
              </div>

              {/* Status tally */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-muted/20 text-foreground font-medium">Total: {sortedApps.length}</span>
                <span className="px-2 py-0.5 rounded bg-green-500/15 text-green-400 font-medium">Selected: {selectedCandidates.length}</span>
                <span className="px-2 py-0.5 rounded bg-red-500/15 text-red-400 font-medium">Rejected: {unselectedCandidates.length}</span>
              </div>
            </div>

            {/* Table */}
            <div className="p-6">
              {appsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : sortedApps.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-muted-foreground text-sm">No candidates have applied for this job yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/30">
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground uppercase tracking-wider">#</th>
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground uppercase tracking-wider">Candidate</th>
                        {rounds.map(r => (
                          <th key={r.key} className="text-left py-3 px-3 text-xs text-muted-foreground uppercase tracking-wider">
                            {r.label}
                            {r.threshold != null && (
                              <span className="block text-[10px] normal-case font-normal text-muted-foreground/60">cutoff {r.threshold}%</span>
                            )}
                          </th>
                        ))}
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground uppercase tracking-wider">
                          <button
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                            onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                          >
                            Total {sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                          </button>
                        </th>
                        <th className="text-left py-3 px-3 text-xs text-muted-foreground uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedApps.map((app, i) => {
                        const tot = totalScore(app, rounds);
                        const isOfferSent = app.application_status === "offer_sent";
                        const isSelected = app.application_status === "selected";
                        const isAccepted = app.application_status === "offer_accepted";
                        const isRejected = app.application_status === "rejected";

                        return (
                          <tr key={app._id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                            <td className="py-3 px-3 text-muted-foreground">{i + 1}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-foreground font-medium">{app.candidate_name}</p>
                                {isAccepted && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Offer Accepted
                                  </span>
                                )}
                                {isOfferSent && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                                    Offer Sent
                                  </span>
                                )}
                                {isSelected && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                    Selected
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                                    Rejected {app.rejection_email_sent ? "• Mail Sent" : ""}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{app.candidate_email}</p>
                            </td>
                            {rounds.map(r => {
                              const cell = scoreCell(app, r);
                              return (
                                <td key={r.key} className={`py-3 px-3 rounded`}>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${cell.color} ${cell.bg}`}>
                                    {cell.display}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="py-3 px-3 font-display font-semibold text-foreground">{tot}</td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEmailModal(app, 'selected')}
                                  className="p-1.5 rounded hover:bg-green-500/20 text-green-500 transition-colors"
                                  title="Send Selection Email"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEmailModal(app, 'wait')}
                                  className="p-1.5 rounded hover:bg-yellow-500/20 text-yellow-500 transition-colors"
                                  title="Send Waitlist Email"
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEmailModal(app, 'rejected')}
                                  className="p-1.5 rounded hover:bg-red-500/20 text-red-500 transition-colors"
                                  title="Send Rejection Email"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                                {(app.interview_report || app.scores?.interview || (app as any).final_interview_score !== undefined || app.application_status === "interview_completed") && (
                                  <button
                                    onClick={() => openAIReport(app)}
                                    className="p-1.5 rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                                    title="View AI Technical Interview Report"
                                  >
                                    <Brain className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Post-Selection Rejection Automation Prompt ── */}
      {postSelectionPromptOpen && selectedJob && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-primary/30 rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Offer Email Dispatched! 🎉</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selection offer was sent to <strong className="text-foreground">{lastSelectedCandidateName}</strong> for <strong className="text-foreground">{selectedJob.title}</strong>.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-sm space-y-2">
              <p className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Automate Rejections in 1 Click
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                There are <strong className="text-red-400 font-bold">{unselectedCandidates.length}</strong> remaining applicant(s) who applied for this job and were not selected.
                Would you like the system to send polite, professional rejection emails to all of them right now?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 flex-wrap">
              <button
                onClick={() => setPostSelectionPromptOpen(false)}
                className="px-4 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 text-muted-foreground hover:text-foreground text-xs font-semibold transition-all"
              >
                I'll Do It Later
              </button>
              <button
                onClick={() => {
                  setPostSelectionPromptOpen(false);
                  setBulkRejectModalOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-muted/40 hover:bg-muted/60 text-foreground border border-border/40 text-xs font-semibold transition-all"
              >
                Review List First
              </button>
              <button
                onClick={() => handleBulkReject(unselectedCandidates)}
                disabled={bulkRejecting}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {bulkRejecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending Rejections...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send Rejection to All ({unselectedCandidates.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1-Click Bulk Rejection Review Modal ── */}
      {bulkRejectModalOpen && selectedJob && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Send Rejection Email to All Rejected Candidates</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Position: <strong className="text-foreground">{selectedJob.title}</strong> • {selectedJob.organization_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkRejectModalOpen(false)}
                className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-1">
                <p className="font-semibold text-red-200">1-Click Automated Batch Dispatch</p>
                <p>
                  This will immediately send an encouraging and professional rejection letter to all{" "}
                  <strong>{unselectedCandidates.length}</strong> candidates who applied for this role and update their application status to <strong>Rejected</strong>.
                </p>
              </div>

              {/* Candidate Recipients List */}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Recipients ({unselectedCandidates.length} Candidates)
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border/30 divide-y divide-border/20 bg-muted/10">
                  {unselectedCandidates.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground text-center">No unselected candidates for this job.</p>
                  ) : (
                    unselectedCandidates.map(c => (
                      <div key={c._id} className="p-3 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-foreground">{c.candidate_name}</p>
                          <p className="text-[11px] text-muted-foreground">{c.candidate_email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.rejection_email_sent ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/20 text-red-400">
                              Mail Already Sent
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted/30 text-muted-foreground">
                              Pending Mail
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Email Template Preview */}
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Email Preview
                </p>
                <div className="p-4 rounded-xl bg-muted/20 border border-border/30 text-xs text-muted-foreground space-y-2">
                  <p><strong>Subject:</strong> Update on your application for {selectedJob.title}</p>
                  <div className="p-3 rounded bg-background border border-border/20 text-foreground/80 space-y-2 leading-relaxed">
                    <p>Hello [Candidate Name],</p>
                    <p>Thank you for your interest in the <strong>{selectedJob.title}</strong> position at <strong>{selectedJob.organization_name}</strong>.</p>
                    <p>After careful consideration, we regret to inform you that we have decided to move forward with other candidates for this position.</p>
                    <p className="text-muted-foreground text-[11px]">This decision doesn't reflect on your potential. Continue to apply for other opportunities on NeuroHire AI and keep improving your skills...</p>
                    <p>Best regards,<br/>The {selectedJob.organization_name} Team</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border/30">
              <button
                onClick={() => setBulkRejectModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkReject(unselectedCandidates)}
                disabled={bulkRejecting || unselectedCandidates.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkRejecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending Rejection Emails...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Confirm & Send to All {unselectedCandidates.length} Rejected Candidates
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Email Draft Modal ── */}
      {emailModalOpen && selectedCandidate && selectedJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border/50 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/30">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {emailAction === 'selected' ? 'Selection Email' : emailAction === 'rejected' ? 'Rejection Email' : 'Waitlist Email'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    To: {selectedCandidate.candidate_email}
                  </p>
                </div>
              </div>
              <button onClick={closeEmailModal} className="p-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Email Form */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-muted/20 border border-border/30 focus:border-primary/50 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Message</label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  rows={12}
                  className="w-full px-4 py-2 rounded-lg bg-muted/20 border border-border/30 focus:border-primary/50 focus:outline-none transition-colors text-sm resize-none"
                  placeholder="Write your message here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Attachments</label>
                <div className="border-2 border-dashed border-border/30 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload files (offer letter, joining letter, etc.)
                    </p>
                  </label>
                  {emailAttachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {emailAttachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm bg-muted/20 px-3 py-2 rounded">
                          <span className="text-foreground">{file.name}</span>
                          <button
                            onClick={() => setEmailAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-border/30">
              <button
                onClick={closeEmailModal}
                className="px-4 py-2 rounded-lg bg-muted/20 hover:bg-muted/30 text-muted-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendEmail}
                disabled={sendingEmail}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingEmail ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── AI Technical Interview Report Modal ── */}
      <AIReportModal
        isOpen={aiReportModalOpen}
        onClose={() => setAiReportModalOpen(false)}
        report={activeReportData}
        candidateName={reportCandidate?.candidate_name}
        candidateEmail={reportCandidate?.candidate_email}
        jobTitle={selectedJob?.title}
      />
    </DashboardLayout>
  );
};

export default Reports;
