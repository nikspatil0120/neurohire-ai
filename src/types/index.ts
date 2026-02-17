export type UserRole = "candidate" | "recruiter" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  recruiterId: string;
  jobId: string;
  scheduledAt: string;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  type: "technical" | "behavioral" | "aptitude" | "coding";
  score?: number;
  feedback?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string[];
  recruiterId: string;
  status: "active" | "closed" | "draft";
  createdAt: string;
}

export interface Question {
  id: string;
  text: string;
  type: "technical" | "behavioral" | "aptitude" | "coding";
  difficulty: "easy" | "medium" | "hard";
  category: string;
  tags: string[];
  expectedAnswer?: string;
}

export interface Report {
  id: string;
  interviewId: string;
  candidateId: string;
  overallScore: number;
  technicalScore?: number;
  behavioralScore?: number;
  emotionAnalysis?: {
    confidence: number;
    stress: number;
    engagement: number;
  };
  voiceAnalysis?: {
    clarity: number;
    pace: number;
    tone: number;
  };
  recommendations: string[];
  strengths: string[];
  improvements: string[];
  createdAt: string;
}

export interface Candidate extends User {
  role: "candidate";
  skills: string[];
  experience: number;
  education: string;
  resume?: string;
  profileCompletion: number;
}

export interface Recruiter extends User {
  role: "recruiter";
  company: string;
  jobsPosted: number;
}
