export const APP_NAME = "NeuroHire AI";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  
  // Candidate routes
  CANDIDATE_DASHBOARD: "/candidate/dashboard",
  CANDIDATE_PROFILE: "/candidate/profile",
  CANDIDATE_PRACTICE: "/candidate/practice",
  CANDIDATE_INTERVIEWS: "/candidate/interviews",
  CANDIDATE_APTITUDE: "/candidate/aptitude-test",
  CANDIDATE_CODING: "/candidate/technical-coding",
  CANDIDATE_INTERVIEW_ROOM: "/candidate/interview-room",
  CANDIDATE_REPORTS: "/candidate/reports",
  
  // Recruiter routes
  RECRUITER_DASHBOARD: "/recruiter/dashboard",
  RECRUITER_CREATE_JOB: "/recruiter/create-job",
  RECRUITER_QUESTIONS: "/recruiter/questions",
  RECRUITER_RANKINGS: "/recruiter/rankings",
  RECRUITER_MESSAGES: "/recruiter/messages",
  
  // Admin routes
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_MONITORING: "/admin/monitoring",
} as const;

export const QUESTION_TYPES = {
  TECHNICAL: "technical",
  BEHAVIORAL: "behavioral",
  APTITUDE: "aptitude",
  CODING: "coding",
} as const;

export const DIFFICULTY_LEVELS = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export const INTERVIEW_STATUS = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;
