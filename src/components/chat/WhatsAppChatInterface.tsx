import React, { useState, useEffect, useRef } from "react";
import mammoth from "mammoth";
import {
  Search,
  Paperclip,
  Smile,
  Mic,
  MicOff,
  Send,
  MoreVertical,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  Download,
  Eye,
  X,
  Reply,
  Trash2,
  CornerDownRight,
  ArrowLeft,
  Play,
  Pause,
  Plus,
  SmilePlus,
  Clock,
  Sparkles,
  File,
  Lock,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const API = "http://localhost:8000/api/v1";

export interface Conversation {
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

export interface MessageReaction {
  user_id: string;
  emoji: string;
}

export interface MessageReplyInfo {
  id: string;
  sender_name: string;
  content: string;
  message_type?: string;
}

export interface Message {
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
  message_type?: "text" | "image" | "file" | "audio";
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  reply_to?: MessageReplyInfo;
  reactions?: MessageReaction[];
  is_deleted?: boolean;
}

interface WhatsAppChatProps {
  currentUser: {
    id: string;
    email: string;
    name: string;
    role: "candidate" | "recruiter" | "admin";
  };
  onNewChatClick?: () => void;
  showNewChatButton?: boolean;
  extraHeaderActions?: React.ReactNode;
}

// Quick reaction emojis
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏"];

// Categorized emoji palette
const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😚", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐"]
  },
  {
    name: "Gestures",
    emojis: ["👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👋", "🤚", "🖐️", "✋", "🖖", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🦾"]
  },
  {
    name: "Work & Tech",
    emojis: ["💼", "💻", "🖥️", "📱", "🎯", "📊", "📈", "📅", "🚀", "💡", "🧠", "✨", "🔥", "⭐", "🎉", "🏆", "🥇", "📝", "📋", "📁", "📂", "📌", "📍", "🔒", "🔑", "✉️", "📧", "📞", "🤝", "⚡"]
  },
  {
    name: "Hearts & Symbols",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💯", "✅", "❌", "⚠️", "❓", "❗", "💬", "💭", "🟢", "🔵", "🟣"]
  }
];

// Helpers for document format badges
const getFileExt = (filename?: string): string => {
  if (!filename) return "FILE";
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toUpperCase() : "FILE";
};

const getFileBadgeStyle = (filename?: string): string => {
  const ext = (filename?.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return "bg-red-500/20 text-red-400 border border-red-500/30";
  if (["doc", "docx"].includes(ext)) return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  if (["xls", "xlsx", "csv"].includes(ext)) return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
  if (["zip", "rar", "tar", "7z", "gz"].includes(ext)) return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
  if (["txt", "json", "py", "js", "ts", "html", "css", "md", "xml", "log"].includes(ext)) {
    return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  }
  return "bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30";
};

export const WhatsAppChatInterface: React.FC<WhatsAppChatProps> = ({
  currentUser,
  onNewChatClick,
  showNewChatButton = false,
  extraHeaderActions
}) => {
  const { toast } = useToast();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);

  // Attachment states
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedEmojiTab, setSelectedEmojiTab] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl?: string;
    type: "image" | "file" | "audio";
    name: string;
    size: number;
  } | null>(null);

  // Quoted reply state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Full-screen image lightbox modal
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // In-chat Document preview modal state
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    name: string;
    size?: number;
    type?: string;
  } | null>(null);
  const [docTextContent, setDocTextContent] = useState<string>("");
  const [docHtmlContent, setDocHtmlContent] = useState<string>("");
  const [loadingDocPreview, setLoadingDocPreview] = useState<boolean>(false);

  // Programmatic download function (guaranteed to download to user device)
  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch file");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast({
        title: "Download Complete",
        description: `${filename} has been saved to your device.`
      });
    } catch (e) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.target = "_blank";
      link.click();
    }
  };

  // Open Document Preview helper (supports PDF, Word .docx, Code, Text, JSON)
  const openDocPreview = async (doc: { url: string; name: string; size?: number; type?: string }) => {
    setPreviewDoc(doc);
    setDocTextContent("");
    setDocHtmlContent("");
    setLoadingDocPreview(true);

    const ext = (doc.name.split(".").pop() || "").toLowerCase();

    try {
      if (ext === "docx") {
        const res = await fetch(doc.url);
        const arrayBuffer = await res.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocHtmlContent(result.value || "<p>Empty document</p>");
      } else if (["txt", "json", "csv", "md", "py", "js", "ts", "html", "css", "xml", "log"].includes(ext)) {
        const res = await fetch(doc.url);
        const text = await res.text();
        setDocTextContent(text);
      }
    } catch (err) {
      console.error("Error loading preview:", err);
    } finally {
      setLoadingDocPreview(false);
    }
  };

  // Active hover message for action popover
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeReactionMenuId, setActiveReactionMenuId] = useState<string | null>(null);

  // Audio player state for voice notes in messages
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const myEmail = currentUser.email;

  // Auto-scroll to bottom of chat
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  // 1. Initial Load & Conversation Polling
  useEffect(() => {
    if (!myEmail) return;
    loadConversations();
    const interval = setInterval(() => {
      loadConversations(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [myEmail]);

  // 2. Load messages on conversation selection and poll messages
  useEffect(() => {
    if (!selectedConversation) return;
    loadMessages(selectedConversation);
    const interval = setInterval(() => {
      loadMessages(selectedConversation, true);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConversation?._id]);

  useEffect(() => {
    scrollToBottom(false);
  }, [selectedConversation?._id]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length]);

  // Load conversations from API
  const loadConversations = async (silent = false) => {
    try {
      const res = await fetch(
        `${API}/messages/conversations/user/${encodeURIComponent(myEmail)}?user_role=${currentUser.role}`
      );
      if (!res.ok) throw new Error("Failed to load conversations");
      const d = await res.json();
      const list: Conversation[] = (d.conversations || []).filter((c: Conversation) => c.enabled !== false);
      
      // If a conversation is currently selected/active, its unread badge should be removed because it's been seen
      const adjustedList = list.map((c: Conversation) =>
        selectedConversation && c._id === selectedConversation._id
          ? { ...c, unread_count: 0 }
          : c
      );
      setConversations(adjustedList);

      // Auto-select first conversation if none selected
      if (!selectedConversation && adjustedList.length > 0) {
        setSelectedConversation(adjustedList[0]);
      } else if (selectedConversation) {
        const found = adjustedList.find((c: Conversation) => c._id === selectedConversation._id);
        if (found) setSelectedConversation(found);
      }
    } catch (e) {
      if (!silent) console.error("Error loading conversations:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversation: Conversation, silent = false) => {
    try {
      // Immediately remove notification badge in UI as the user is seeing the messages
      setConversations((prev) =>
        prev.map((c) => (c._id === conversation._id ? { ...c, unread_count: 0 } : c))
      );

      // Reset unread count and mark messages read on the backend
      fetch(`${API}/messages/conversation/${conversation._id}/read?user_id=${encodeURIComponent(myEmail)}`, {
        method: "PATCH"
      }).catch(() => {});

      const res = await fetch(`${API}/messages/conversation/${conversation._id}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const d = await res.json();
      const msgList: Message[] = d.messages || [];

      setMessages(msgList);

      // Mark unread messages addressed to me as read
      msgList.forEach((m: Message) => {
        if (!m.read && (m.recipient_id === myEmail || m.sender_id !== myEmail)) {
          fetch(`${API}/messages/message/${m._id}/read`, { method: "PATCH" }).catch(() => {});
        }
      });
    } catch (e) {
      if (!silent) console.error("Error loading messages:", e);
    }
  };

  // Upload file helper
  const uploadFileToBackend = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API}/messages/upload`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "File upload failed");
    }

    return await res.json();
  };

  // Send message handler (text, image, document, voice note)
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !pendingAttachment) || !selectedConversation || sending) {
      return;
    }

    setSending(true);

    try {
      // Determine recipient info
      const isCandidate = currentUser.role === "candidate";
      const recipientId = isCandidate ? selectedConversation.recruiter_id : selectedConversation.candidate_id;
      const recipientName = isCandidate ? selectedConversation.recruiter_name : selectedConversation.candidate_name;
      const recipientRole = isCandidate ? "recruiter" : "candidate";

      let messageType: "text" | "image" | "file" | "audio" = "text";
      let fileUrl: string | undefined = undefined;
      let fileName: string | undefined = undefined;
      let fileSize: number | undefined = undefined;
      let fileCategory: string | undefined = undefined;

      // Handle file attachment upload if pending
      if (pendingAttachment) {
        setUploadingFile(true);
        const uploadResult = await uploadFileToBackend(pendingAttachment.file);
        fileUrl = uploadResult.file_url;
        fileName = uploadResult.file_name;
        fileSize = uploadResult.file_size;
        fileCategory = uploadResult.file_type;
        messageType = pendingAttachment.type;
        setUploadingFile(false);
      }

      // Format reply_to object if quoting a message
      const replyData = replyingTo
        ? {
            id: replyingTo._id,
            sender_name: replyingTo.sender_name,
            content: replyingTo.content || (replyingTo.message_type === "image" ? "📷 Photo" : "📄 File"),
            message_type: replyingTo.message_type || "text"
          }
        : undefined;

      const payload = {
        conversation_id: selectedConversation._id,
        sender_id: myEmail,
        sender_name: currentUser.name || (isCandidate ? "Candidate" : "Recruiter"),
        sender_role: currentUser.role,
        recipient_id: recipientId,
        recipient_name: recipientName,
        recipient_role: recipientRole,
        content: newMessage.trim(),
        company_name: selectedConversation.company_name || "",
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileCategory,
        reply_to: replyData
      };

      const res = await fetch(`${API}/messages/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to send message");

      // Reset state
      setNewMessage("");
      setPendingAttachment(null);
      setReplyingTo(null);
      setShowEmojiPicker(false);
      setShowAttachMenu(false);

      // Reload
      await loadMessages(selectedConversation);
      loadConversations(true);

      // Focus input
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (e) {
      console.error("Error sending message:", e);
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setSending(false);
      setUploadingFile(false);
    }
  };

  // Handle Emoji Selection
  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  // Handle Reactions toggle
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    setActiveReactionMenuId(null);
    try {
      const res = await fetch(`${API}/messages/message/${messageId}/reaction`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: myEmail, emoji })
      });
      if (!res.ok) throw new Error("Failed to update reaction");
      const data = await res.json();

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions: data.reactions } : m))
      );
    } catch (e) {
      console.error("Error toggling reaction:", e);
    }
  };

  // Handle Delete Message (WhatsApp style)
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`${API}/messages/message/${messageId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete message");

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, is_deleted: true, content: "This message was deleted", file_url: undefined, file_name: undefined }
            : m
        )
      );

      toast({
        title: "Message Deleted",
        description: "Message was deleted for everyone."
      });
    } catch (e) {
      console.error("Error deleting message:", e);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  // Handle file picker selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 25MB",
        variant: "destructive"
      });
      return;
    }

    const previewUrl = type === "image" ? URL.createObjectURL(file) : undefined;

    setPendingAttachment({
      file,
      previewUrl,
      type,
      name: file.name,
      size: file.size
    });

    setShowAttachMenu(false);
    e.target.value = "";
  };

  // Voice note recording logic using MediaRecorder
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new window.File([audioBlob], `voice_note_${Date.now()}.webm`, {
          type: "audio/webm"
        });

        // Set as pending attachment ready to send
        setPendingAttachment({
          file: audioFile,
          previewUrl: URL.createObjectURL(audioBlob),
          type: "audio",
          name: "Voice message",
          size: audioBlob.size
        });

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (e) {
      console.error("Microphone access error:", e);
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record voice notes.",
        variant: "destructive"
      });
    }
  };

  const stopVoiceRecording = (cancel = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && isRecording) {
      if (cancel) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setRecordingSeconds(0);
        return;
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingSeconds(0);
    }
  };

  // Play audio voice note in message bubble
  const togglePlayAudio = (id: string, url: string) => {
    if (playingAudioId === id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      setPlayingAudioId(id);
      audio.play().catch(() => setPlayingAudioId(null));
      audio.onended = () => setPlayingAudioId(null);
    }
  };

  // Format timestamp helpers
  const parseTimestamp = (timestamp: string): Date => {
    if (!timestamp) return new Date();
    if (!timestamp.endsWith("Z") && !timestamp.includes("+") && !timestamp.slice(10).includes("-")) {
      return new Date(timestamp + "Z");
    }
    return new Date(timestamp);
  };

  const formatConversationTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = parseTimestamp(timestamp);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (isYesterday) {
      return "Yesterday";
    }
    if (diff < 7 * 86400000) {
      return date.toLocaleDateString([], { weekday: "short" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = parseTimestamp(timestamp);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateHeader = (timestamp: string) => {
    if (!timestamp) return "";
    const date = parseTimestamp(timestamp);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    if (date.toDateString() === now.toDateString()) return "Today";

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const contactName = currentUser.role === "candidate" ? c.recruiter_name : c.candidate_name;
    const company = c.company_name || "";
    const matchesSearch =
      contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.last_message || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (filterUnread) {
      return matchesSearch && c.unread_count > 0;
    }
    return matchesSearch;
  });

  // Filter messages in active conversation
  const displayedMessages = chatSearchQuery.trim()
    ? messages.filter((m) =>
        (m.content || "").toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
        (m.file_name || "").toLowerCase().includes(chatSearchQuery.toLowerCase())
      )
    : messages;

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  displayedMessages.forEach((msg) => {
    const dateKey = formatDateHeader(msg.created_at);
    const existingGroup = groupedMessages.find((g) => g.date === dateKey);
    if (existingGroup) {
      existingGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, messages: [msg] });
    }
  });

  const activeContactName = selectedConversation
    ? currentUser.role === "candidate"
      ? selectedConversation.recruiter_name
      : selectedConversation.candidate_name
    : "";

  const activeContactCompany = selectedConversation
    ? selectedConversation.company_name || (currentUser.role === "candidate" ? "Recruiter" : "Candidate")
    : "";

  return (
    <div className="relative flex h-[calc(100vh-140px)] w-full overflow-hidden rounded-2xl border border-[#222e35]/60 bg-[#111b21] shadow-2xl">
      {/* Hidden inputs for File / Image selection */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleFileChange(e, "image")}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileChange(e, "file")}
        accept=".pdf,.doc,.docx,.txt,.zip,.rar,.tar,.csv,.xls,.xlsx,.json,.js,.ts,.py"
        className="hidden"
      />

      {/* ─────────────────────────────────────────────────────────────
          LEFT SIDEBAR: Conversation List
      ───────────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "w-full flex-col border-r border-[#222e35] bg-[#111b21] transition-all duration-300 md:flex md:w-[380px] lg:w-[420px]",
          selectedConversation ? "hidden md:flex" : "flex"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-[#222e35] bg-[#202c33] px-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#00a884] to-[#005c4b] text-base font-bold text-white shadow-md">
              {currentUser.name?.[0]?.toUpperCase() || "U"}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#202c33] bg-[#00a884]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#e9edef] leading-tight">{currentUser.name}</p>
              <p className="text-[11px] capitalize text-[#8696a0]">
                {currentUser.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* New Chat Button (For Recruiters or when enabled) */}
            {showNewChatButton && onNewChatClick && (
              <button
                onClick={onNewChatClick}
                className="flex items-center gap-1.5 rounded-lg bg-[#00a884] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#02906f] transition-all shadow-md active:scale-95"
                title="Start a new chat with candidates"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Chat</span>
              </button>
            )}

            {extraHeaderActions}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="border-b border-[#222e35] bg-[#111b21] p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8696a0]" />
              <input
                type="text"
                placeholder="Search or start new chat"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-[#202c33] py-2 pl-9 pr-8 text-xs text-[#d1d7db] placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-[#8696a0] hover:text-[#e9edef]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Unread Filter Toggle */}
            <button
              onClick={() => setFilterUnread(!filterUnread)}
              className={cn(
                "rounded-lg p-2 text-xs transition-colors",
                filterUnread
                  ? "bg-[#00a884] text-white"
                  : "bg-[#202c33] text-[#8696a0] hover:text-[#d1d7db]"
              )}
              title="Filter unread chats"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#222e35]/40 custom-scrollbar">
          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
              <p className="text-xs text-[#8696a0]">Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center p-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#202c33] text-[#00a884]">
                <Lock className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-[#e9edef]">No chats found</p>
              <p className="mt-1 text-xs text-[#8696a0] max-w-[240px]">
                {searchQuery
                  ? "No conversations match your search query."
                  : showNewChatButton
                  ? "Click 'New Chat' above to start a conversation with applied candidates."
                  : "When recruiters or employers message you, your chats will appear here."}
              </p>
              {showNewChatButton && onNewChatClick && !searchQuery && (
                <button
                  onClick={onNewChatClick}
                  className="mt-4 flex items-center gap-2 rounded-lg bg-[#00a884] px-4 py-2 text-xs font-semibold text-white hover:bg-[#02906f] transition-all"
                >
                  <Plus className="h-4 w-4" /> Start First Chat
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConversation?._id === conv._id;
              const contactName =
                currentUser.role === "candidate" ? conv.recruiter_name : conv.candidate_name;
              const companyName = conv.company_name;

              return (
                <div
                  key={conv._id}
                  onClick={() => {
                    setSelectedConversation(conv);
                    setConversations((prev) =>
                      prev.map((c) => (c._id === conv._id ? { ...c, unread_count: 0 } : c))
                    );
                    loadMessages(conv);
                  }}
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-3.5 px-4 py-3 transition-colors",
                    isSelected ? "bg-[#2a3942]" : "hover:bg-[#202c33]/70"
                  )}
                >
                  {/* Contact Avatar */}
                  <div className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#128c7e] to-[#075e54] text-base font-semibold text-white shadow-sm">
                    {contactName?.[0]?.toUpperCase() || "?"}
                    <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-[#111b21] bg-[#00a884]" />
                  </div>

                  {/* Info & Snippet */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-sm font-semibold text-[#e9edef] truncate">
                          {contactName}
                        </span>
                        {companyName && (
                          <span className="rounded bg-[#202c33] px-1.5 py-0.5 text-[10px] text-[#00a884] font-medium truncate max-w-[100px]">
                            {companyName}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#8696a0] flex-shrink-0 ml-2">
                        {formatConversationTime(conv.last_message_time)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <p className="flex items-center gap-1 text-xs text-[#8696a0] truncate">
                        {conv.unread_count === 0 && (
                          <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb] flex-shrink-0" />
                        )}
                        <span className="truncate">{conv.last_message || "No messages yet"}</span>
                      </p>

                      {/* Unread Pill - automatically removed once seen or selected */}
                      {conv.unread_count > 0 && selectedConversation?._id !== conv._id && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00a884] px-1.5 text-[11px] font-bold text-[#111b21] shadow-sm">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT MAIN PANE: WhatsApp Active Chat Window
      ───────────────────────────────────────────────────────────── */}
      {selectedConversation ? (
        <div className="relative flex flex-1 flex-col h-full bg-[#0b141a]">
          {/* 1. Chat Header */}
          <div className="flex h-16 items-center justify-between border-b border-[#222e35] bg-[#202c33] px-4 z-10">
            <div className="flex items-center gap-3">
              {/* Back button for mobile */}
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden rounded-full p-1.5 text-[#aebac1] hover:bg-[#374248]"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {/* Contact Avatar */}
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#128c7e] to-[#075e54] text-sm font-semibold text-white">
                {activeContactName?.[0]?.toUpperCase() || "?"}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#202c33] bg-[#00a884]" />
              </div>

              {/* Title & Online Status */}
              <div>
                <p className="text-sm font-semibold text-[#e9edef] leading-tight">
                  {activeContactName}
                </p>
                <p className="text-[11px] text-[#00a884] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00a884] animate-pulse" />
                  online • {activeContactCompany}
                </p>
              </div>
            </div>

            {/* Chat Header Actions */}
            <div className="flex items-center gap-1 text-[#aebac1]">
              <button
                onClick={() => setShowChatSearch(!showChatSearch)}
                className={cn(
                  "rounded-full p-2 hover:bg-[#374248] transition-colors",
                  showChatSearch && "text-[#00a884] bg-[#374248]"
                )}
                title="Search messages"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* In-chat search banner if toggled */}
          {showChatSearch && (
            <div className="flex items-center gap-2 border-b border-[#222e35] bg-[#202c33] px-4 py-2 text-xs">
              <Search className="h-4 w-4 text-[#8696a0]" />
              <input
                type="text"
                placeholder="Search in conversation..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent text-[#e9edef] placeholder-[#8696a0] focus:outline-none"
              />
              {chatSearchQuery && (
                <button
                  onClick={() => setChatSearchQuery("")}
                  className="text-[#8696a0] hover:text-[#e9edef]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* 2. Messages Canvas with WhatsApp Doodle Background */}
          <div
            className="relative flex-1 overflow-y-auto px-4 py-3 custom-scrollbar"
            style={{
              backgroundImage: `radial-gradient(circle at center, rgba(17, 27, 33, 0.4) 0%, rgba(11, 20, 26, 0.98) 100%)`
            }}
          >
            {/* WhatsApp authentic subtle doodle SVG overlay */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.04] bg-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-rule='evenodd'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' /%3E%3C/g%3E%3C/svg%3E")`
              }}
            />

            {/* WhatsApp End-to-End Encryption Banner */}
            <div className="mx-auto my-3 flex max-w-md items-center justify-center gap-2 rounded-lg bg-[#182229] px-3 py-1.5 text-center text-[11px] text-[#ffd279] shadow-sm border border-[#ffd279]/10">
              <Lock className="h-3 w-3 flex-shrink-0" />
              <span>Messages are end-to-end encrypted. No one outside of this chat can read them.</span>
            </div>

            {/* Grouped Messages by Date */}
            {groupedMessages.map((group) => (
              <div key={group.date} className="my-4">
                {/* Date Header Pill */}
                <div className="sticky top-2 z-10 flex justify-center mb-3">
                  <span className="rounded-md bg-[#182229] px-3 py-1 text-[11px] font-medium text-[#8696a0] shadow-md border border-[#222e35]/40">
                    {group.date}
                  </span>
                </div>

                {/* Message Bubbles in this date group */}
                <div className="space-y-2">
                  {group.messages.map((msg) => {
                    const isFromMe = msg.sender_id === myEmail || msg.sender_role === currentUser.role;
                    const isHovered = hoveredMessageId === msg._id;
                    const showReactionMenu = activeReactionMenuId === msg._id;

                    return (
                      <div
                        key={msg._id}
                        onMouseEnter={() => setHoveredMessageId(msg._id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                        className={cn(
                          "group relative flex items-end gap-1.5",
                          isFromMe ? "justify-end" : "justify-start"
                        )}
                      >
                        {/* Hover Quick Action Menu for OUTGOING messages (left side of bubble) */}
                        {isFromMe && isHovered && !msg.is_deleted && (
                          <div className="flex items-center gap-1 rounded-full bg-[#202c33] px-1.5 py-0.5 shadow-md border border-[#222e35] text-[#8696a0] animate-in fade-in zoom-in-90 duration-150">
                            <button
                              onClick={() =>
                                setActiveReactionMenuId(showReactionMenu ? null : msg._id)
                              }
                              className="p-1 hover:text-[#00a884] rounded-full"
                              title="React"
                            >
                              <SmilePlus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="p-1 hover:text-[#00a884] rounded-full"
                              title="Reply"
                            >
                              <Reply className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg._id)}
                              className="p-1 hover:text-red-400 rounded-full"
                              title="Delete message"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        {/* WhatsApp Message Bubble */}
                        <div
                          className={cn(
                            "relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-md transition-all",
                            isFromMe
                              ? "bg-[#005c4b] text-[#e9edef] rounded-br-none"
                              : "bg-[#202c33] text-[#e9edef] rounded-bl-none",
                            msg.is_deleted && "italic opacity-70 bg-[#182229]"
                          )}
                        >
                          {/* Sender name for received messages */}
                          {!isFromMe && (
                            <p className="text-[11px] font-bold text-[#53bdeb] mb-1">
                              {msg.sender_name}
                            </p>
                          )}

                          {/* Quoted message if this message is a reply */}
                          {msg.reply_to && (
                            <div
                              className={cn(
                                "mb-2 rounded-md border-l-4 px-2 py-1 text-xs",
                                isFromMe
                                  ? "border-[#00a884] bg-[#025144]/80 text-[#d1d7db]"
                                  : "border-[#53bdeb] bg-[#182229]/80 text-[#d1d7db]"
                              )}
                            >
                              <p className="font-semibold text-[11px] text-[#00a884]">
                                {msg.reply_to.sender_name}
                              </p>
                              <p className="line-clamp-1 text-[11px] text-[#8696a0]">
                                {msg.reply_to.content}
                              </p>
                            </div>
                          )}

                          {/* Deleted Message Notice */}
                          {msg.is_deleted ? (
                            <div className="flex items-center gap-1.5 text-xs text-[#8696a0]">
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>This message was deleted</span>
                            </div>
                          ) : (
                            <>
                              {/* 1. Image Attachment */}
                              {msg.message_type === "image" && msg.file_url && (
                                <div className="mb-1.5 overflow-hidden rounded-lg">
                                  <img
                                    src={msg.file_url}
                                    alt={msg.file_name || "Attachment"}
                                    onClick={() =>
                                      setLightboxImage({
                                        url: msg.file_url!,
                                        title: msg.file_name || "Photo"
                                      })
                                    }
                                    className="max-h-72 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity rounded-lg"
                                    loading="lazy"
                                  />
                                </div>
                              )}

                              {/* 2. Document/File Attachment with in-chat Preview and Device Download */}
                              {msg.message_type === "file" && msg.file_url && (
                                <div className="mb-2 overflow-hidden rounded-xl bg-[#182229]/90 border border-[#222e35] shadow-sm">
                                  <div className="flex items-center gap-3 p-3">
                                    <div
                                      className={cn(
                                        "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl font-bold text-xs uppercase shadow-sm",
                                        getFileBadgeStyle(msg.file_name)
                                      )}
                                    >
                                      {getFileExt(msg.file_name)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs sm:text-sm font-semibold text-[#e9edef]" title={msg.file_name}>
                                        {msg.file_name || "Document"}
                                      </p>
                                      <p className="text-[10px] text-[#8696a0] mt-0.5">
                                        {formatFileSize(msg.file_size)} • {getFileExt(msg.file_name)} file
                                      </p>
                                    </div>
                                  </div>

                                  {/* In-Chat Preview & Download Buttons */}
                                  <div className="flex items-center border-t border-[#222e35] bg-[#111b21]/80 divide-x divide-[#222e35]">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openDocPreview({
                                          url: msg.file_url!,
                                          name: msg.file_name || "Document",
                                          size: msg.file_size,
                                          type: msg.file_type
                                        })
                                      }
                                      className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#00a884] hover:bg-[#202c33] active:scale-95 transition-all"
                                      title="Preview document in chat"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      <span>Preview</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDownloadFile(msg.file_url!, msg.file_name || "document")}
                                      className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#53bdeb] hover:bg-[#202c33] active:scale-95 transition-all"
                                      title="Download file to device"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      <span>Download</span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* 3. Audio / Voice Note Message */}
                              {msg.message_type === "audio" && msg.file_url && (
                                <div className="mb-2 flex items-center gap-3 rounded-lg bg-[#182229]/70 p-2 border border-[#222e35]">
                                  <button
                                    onClick={() => togglePlayAudio(msg._id, msg.file_url!)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#02906f] transition-all"
                                  >
                                    {playingAudioId === msg._id ? (
                                      <Pause className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4 ml-0.5" />
                                    )}
                                  </button>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1">
                                      {[40, 70, 30, 90, 60, 40, 80, 50, 90, 30, 70, 45, 60, 30].map(
                                        (h, idx) => (
                                          <div
                                            key={idx}
                                            className={cn(
                                              "w-1 rounded-full bg-[#00a884] transition-all",
                                              playingAudioId === msg._id && "animate-pulse"
                                            )}
                                            style={{ height: `${h * 0.25}px` }}
                                          />
                                        )
                                      )}
                                    </div>
                                    <p className="mt-1 text-[10px] text-[#8696a0]">
                                      Voice Note • {msg.file_size ? formatFileSize(msg.file_size) : ""}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Message Text Body */}
                              {msg.content && (
                                <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed select-text">
                                  {msg.content}
                                </p>
                              )}
                            </>
                          )}

                          {/* Message Footer: Timestamp + WhatsApp Checkmarks */}
                          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#8696a0]">
                            <span>{formatMessageTime(msg.created_at)}</span>
                            {isFromMe && (
                              <span>
                                {msg.read ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                                ) : (
                                  <CheckCheck className="h-3.5 w-3.5 text-[#8696a0]" />
                                )}
                              </span>
                            )}
                          </div>

                          {/* Reactions Pill Display at bottom of bubble */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className="absolute -bottom-2.5 right-2 flex items-center gap-1 rounded-full bg-[#182229] px-1.5 py-0.5 text-[11px] shadow-md border border-[#222e35]">
                              {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji) => {
                                const count = msg.reactions!.filter((r) => r.emoji === emoji).length;
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleToggleReaction(msg._id, emoji)}
                                    className="flex items-center gap-0.5 hover:scale-110 transition-transform"
                                  >
                                    <span>{emoji}</span>
                                    {count > 1 && (
                                      <span className="text-[9px] text-[#8696a0] font-bold">{count}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Reaction Picker floating popover */}
                          {showReactionMenu && (
                            <div
                              className={cn(
                                "absolute -top-10 z-30 flex items-center gap-1 rounded-full bg-[#202c33] p-1 shadow-2xl border border-[#222e35] animate-in fade-in zoom-in-95",
                                isFromMe ? "right-0" : "left-0"
                              )}
                            >
                              {QUICK_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(msg._id, emoji)}
                                  className="h-7 w-7 rounded-full text-base hover:bg-[#374248] hover:scale-125 transition-all flex items-center justify-center"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Hover Quick Action Menu for INCOMING messages (right side of bubble) */}
                        {!isFromMe && isHovered && !msg.is_deleted && (
                          <div className="flex items-center gap-1 rounded-full bg-[#202c33] px-1.5 py-0.5 shadow-md border border-[#222e35] text-[#8696a0] animate-in fade-in zoom-in-90 duration-150">
                            <button
                              onClick={() =>
                                setActiveReactionMenuId(showReactionMenu ? null : msg._id)
                              }
                              className="p-1 hover:text-[#00a884] rounded-full"
                              title="React"
                            >
                              <SmilePlus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setReplyingTo(msg)}
                              className="p-1 hover:text-[#00a884] rounded-full"
                              title="Reply"
                            >
                              <Reply className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* 3. Input & Attachment Area */}
          <div className="relative border-t border-[#222e35] bg-[#202c33] px-4 py-2.5">
            {/* Quoted Reply Banner above input */}
            {replyingTo && (
              <div className="mb-2 flex items-center justify-between rounded-lg border-l-4 border-[#00a884] bg-[#111b21] p-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#00a884] text-[11px]">
                    Replying to {replyingTo.sender_name}
                  </p>
                  <p className="truncate text-[#8696a0] text-[11px]">
                    {replyingTo.content || (replyingTo.message_type === "image" ? "📷 Photo" : "📄 File")}
                  </p>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="rounded-full p-1 text-[#8696a0] hover:text-[#e9edef]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Pending Attachment Preview Drawer */}
            {pendingAttachment && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-[#111b21] p-3 border border-[#222e35]">
                <div className="flex items-center gap-3 min-w-0">
                  {pendingAttachment.type === "image" && pendingAttachment.previewUrl ? (
                    <img
                      src={pendingAttachment.previewUrl}
                      alt="Preview"
                      className="h-12 w-12 rounded object-cover border border-[#222e35]"
                    />
                  ) : pendingAttachment.type === "audio" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-[#00a884]/20 text-[#00a884]">
                      <Mic className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-[#00a884]/20 text-[#00a884]">
                      <File className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-[#e9edef]">
                      {pendingAttachment.name}
                    </p>
                    <p className="text-[10px] text-[#8696a0]">
                      {formatFileSize(pendingAttachment.size)} • Ready to send
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPendingAttachment(null)}
                  className="rounded-full p-1.5 text-[#8696a0] hover:text-red-400"
                  title="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Attachment Menu Popup (Paperclip menu) */}
            {showAttachMenu && (
              <div className="absolute bottom-16 left-6 z-30 flex flex-col gap-1 rounded-2xl bg-[#202c33] p-2 shadow-2xl border border-[#222e35] animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  onClick={() => {
                    imageInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs text-[#e9edef] hover:bg-[#111b21] transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ac44cf] to-[#7f27a6] text-white">
                    <ImageIcon className="h-4 w-4" />
                  </div>
                  <span>Photos & Videos</span>
                </button>

                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachMenu(false);
                  }}
                  className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs text-[#e9edef] hover:bg-[#111b21] transition-colors"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#5f66cd] to-[#424cb8] text-white">
                    <FileText className="h-4 w-4" />
                  </div>
                  <span>Document / Files</span>
                </button>
              </div>
            )}

            {/* Emoji Picker Tray */}
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-2 sm:left-4 z-30 w-80 sm:w-96 rounded-2xl bg-[#202c33] shadow-2xl border border-[#222e35] p-3 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between border-b border-[#222e35] pb-2 mb-2">
                  <div className="flex gap-2">
                    {EMOJI_CATEGORIES.map((cat, idx) => (
                      <button
                        key={cat.name}
                        onClick={() => setSelectedEmojiTab(idx)}
                        className={cn(
                          "px-2 py-1 text-xs font-medium rounded-lg transition-colors",
                          selectedEmojiTab === idx
                            ? "bg-[#00a884] text-white"
                            : "text-[#8696a0] hover:text-[#e9edef]"
                        )}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-[#8696a0] hover:text-[#e9edef]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto custom-scrollbar p-1">
                  {EMOJI_CATEGORIES[selectedEmojiTab].emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="h-8 w-8 text-lg rounded-lg hover:bg-[#111b21] hover:scale-125 transition-all flex items-center justify-center"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Live Voice Recording UI Bar */}
            {isRecording ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#111b21] px-4 py-2 border border-red-500/30">
                <div className="flex items-center gap-2 text-red-400">
                  <span className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
                  <span className="font-mono text-xs font-bold">
                    {Math.floor(recordingSeconds / 60)}:
                    {(recordingSeconds % 60).toString().padStart(2, "0")}
                  </span>
                  <span className="text-xs text-[#8696a0]">Recording audio note...</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => stopVoiceRecording(true)}
                    className="flex items-center gap-1 rounded-lg bg-[#202c33] px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button
                    onClick={() => stopVoiceRecording(false)}
                    className="flex items-center gap-1 rounded-lg bg-[#00a884] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#02906f] transition-all shadow-md"
                  >
                    <Check className="h-3.5 w-3.5" /> Attach Audio
                  </button>
                </div>
              </div>
            ) : (
              /* Regular Message Input Row */
              <div className="flex items-end gap-2">
                {/* Emoji Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(!showEmojiPicker);
                    setShowAttachMenu(false);
                  }}
                  className={cn(
                    "rounded-full p-2.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374248] transition-colors",
                    showEmojiPicker && "text-[#00a884]"
                  )}
                  title="Insert emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>

                {/* Attachment Menu Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(!showAttachMenu);
                    setShowEmojiPicker(false);
                  }}
                  className={cn(
                    "rounded-full p-2.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374248] transition-colors",
                    showAttachMenu && "text-[#00a884]"
                  )}
                  title="Attach file or photo"
                >
                  <Paperclip className="h-5 w-5" />
                </button>

                {/* Auto-expanding Input Area */}
                <textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={
                    pendingAttachment ? "Add an optional caption..." : "Type a message..."
                  }
                  className="flex-1 max-h-32 min-h-[42px] resize-none rounded-xl bg-[#2a3942] px-4 py-2.5 text-xs sm:text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884] transition-all custom-scrollbar"
                />

                {/* Send Button or Voice Note Mic Button */}
                {newMessage.trim() || pendingAttachment ? (
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || uploadingFile}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white hover:bg-[#02906f] active:scale-95 transition-all shadow-md disabled:opacity-50"
                    title="Send message"
                  >
                    {sending || uploadingFile ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-5 w-5 ml-0.5" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#2a3942] text-[#00a884] hover:bg-[#00a884] hover:text-white active:scale-95 transition-all"
                    title="Hold to record voice note"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty Chat State (No conversation selected) */
        <div className="hidden flex-1 flex-col items-center justify-center bg-[#222e35]/30 p-8 text-center md:flex">
          <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#202c33] text-[#00a884] shadow-xl">
            <Lock className="h-10 w-10" />
          </div>
          <h3 className="text-xl font-bold text-[#e9edef]">NeuroHire Messages</h3>
          <p className="mt-2 max-w-sm text-xs text-[#8696a0] leading-relaxed">
            Send and receive real-time messages, candidate portfolios, resumes, and voice notes with
            instant end-to-end encryption.
          </p>
          <div className="mt-6 flex items-center gap-2 rounded-full bg-[#202c33] px-4 py-1.5 text-xs text-[#8696a0]">
            <Lock className="h-3.5 w-3.5 text-[#00a884]" />
            <span>End-to-end encrypted</span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          IMAGE LIGHTBOX MODAL
      ───────────────────────────────────────────────────────────── */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-[#111b21] p-2 shadow-2xl border border-[#222e35]"
          >
            <div className="mb-2 flex items-center justify-between px-2 pt-1 text-xs text-[#e9edef]">
              <span className="font-semibold truncate max-w-xs">{lightboxImage.title}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadFile(lightboxImage.url, lightboxImage.title)}
                  className="flex items-center gap-1 rounded-lg bg-[#00a884] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#02906f] transition-colors"
                  title="Download Image"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="rounded-lg bg-[#202c33] p-1.5 text-[#8696a0] hover:text-[#e9edef]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              className="max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DOCUMENT PREVIEW MODAL (In-chat document viewer)
      ───────────────────────────────────────────────────────────── */}
      {previewDoc && (
        <div
          onClick={() => setPreviewDoc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative flex flex-col h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-[#111b21] shadow-2xl border border-[#222e35]"
          >
            {/* Modal Top Header */}
            <div className="flex h-14 items-center justify-between border-b border-[#222e35] bg-[#202c33] px-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold uppercase shadow-sm",
                    getFileBadgeStyle(previewDoc.name)
                  )}
                >
                  {getFileExt(previewDoc.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs sm:text-sm font-semibold text-[#e9edef] max-w-xs sm:max-w-md">
                    {previewDoc.name}
                  </p>
                  <p className="text-[10px] text-[#8696a0]">
                    {formatFileSize(previewDoc.size)} • In-chat Document Preview
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download to Device */}
                <button
                  type="button"
                  onClick={() => handleDownloadFile(previewDoc.url, previewDoc.name)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#00a884] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#02906f] active:scale-95 transition-all shadow-md"
                  title="Download file to device"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>

                {/* Open in new tab */}
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-[#2a3942] p-2 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374248] transition-colors"
                  title="Open original file in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>

                {/* Close modal */}
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="rounded-lg bg-[#2a3942] p-2 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#374248] transition-colors"
                  title="Close preview"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Document Content Preview */}
            <div className="relative flex-1 overflow-auto bg-[#0b141a] p-2 sm:p-4 custom-scrollbar">
              {loadingDocPreview ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#00a884] border-t-transparent" />
                  <p className="text-xs text-[#8696a0]">Loading document preview...</p>
                </div>
              ) : getFileExt(previewDoc.name) === "PDF" ? (
                <div className="h-full w-full rounded-xl overflow-hidden bg-white shadow-inner">
                  <iframe
                    src={`${previewDoc.url}#toolbar=1`}
                    className="h-full w-full border-0"
                    title={previewDoc.name}
                  />
                </div>
              ) : getFileExt(previewDoc.name) === "DOCX" ? (
                <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 text-black shadow-xl min-h-full">
                  <div
                    className="prose max-w-none text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: docHtmlContent || "<p>No content available to preview.</p>"
                    }}
                  />
                </div>
              ) : docTextContent ? (
                <div className="h-full w-full rounded-xl bg-[#111b21] p-4 border border-[#222e35] overflow-auto">
                  <pre className="font-mono text-xs text-[#e9edef] whitespace-pre-wrap leading-relaxed select-text">
                    {docTextContent}
                  </pre>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center p-6">
                  <div
                    className={cn(
                      "flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold uppercase shadow-lg",
                      getFileBadgeStyle(previewDoc.name)
                    )}
                  >
                    {getFileExt(previewDoc.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#e9edef]">{previewDoc.name}</p>
                    <p className="mt-1 text-xs text-[#8696a0]">
                      {formatFileSize(previewDoc.size)} • Document File
                    </p>
                  </div>
                  <p className="max-w-md text-xs text-[#8696a0]">
                    Click download below to save this file directly to your device or open it in your local application.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(previewDoc.url, previewDoc.name)}
                    className="flex items-center gap-2 rounded-xl bg-[#00a884] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#02906f] active:scale-95 transition-all shadow-md"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download to Device ({formatFileSize(previewDoc.size)})</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppChatInterface;
