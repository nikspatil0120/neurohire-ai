// API configuration and helper functions
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string, role: string) =>
    fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, role }),
    }),

  // Candidates
  getCandidateProfile: (id: string) => fetchApi(`/candidates/${id}`),
  updateCandidateProfile: (id: string, data: any) =>
    fetchApi(`/candidates/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Interviews
  getInterviews: (userId: string) => fetchApi(`/interviews?userId=${userId}`),
  getInterview: (id: string) => fetchApi(`/interviews/${id}`),
  scheduleInterview: (data: any) =>
    fetchApi("/interviews", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Jobs
  getJobs: () => fetchApi("/jobs"),
  getJob: (id: string) => fetchApi(`/jobs/${id}`),
  createJob: (data: any) =>
    fetchApi("/jobs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Questions
  getQuestions: (filters?: any) => {
    const params = new URLSearchParams(filters);
    return fetchApi(`/questions?${params}`);
  },
  createQuestion: (data: any) =>
    fetchApi("/questions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Reports
  getReport: (interviewId: string) => fetchApi(`/reports/${interviewId}`),
  getCandidateReports: (candidateId: string) =>
    fetchApi(`/reports?candidateId=${candidateId}`),
};

export { ApiError };
