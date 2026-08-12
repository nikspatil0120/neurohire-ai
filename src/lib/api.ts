// API configuration and helper functions
// Backend runs on port 8000
const API_BASE_URL = "http://localhost:8000/api/v1";

class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = "ApiError";
  }
}

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Set auth token in localStorage
const setAuthToken = (token: string) => {
  localStorage.setItem('authToken', token);
};

// Remove auth token from localStorage
const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get auth token
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  // Add auth header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.message || `API Error: ${response.statusText}`, data);
  }

  return data;
}

export const api = {
  // Auth endpoints
  register: (userData: { name: string; email: string; password: string; role: string }) =>
    fetchApi("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: userData.name,
        email: userData.email,
        password: userData.password,
        role: userData.role
      }),
    }),

  login: (credentials: { email: string; password: string }) =>
    fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  googleAuth: (googleData: { email: string; name: string; avatar?: string; googleId: string; role: string }) =>
    fetchApi("/auth/google", {
      method: "POST",
      body: JSON.stringify(googleData),
    }),

  getCurrentUser: () => fetchApi("/auth/me"),

  updateProfile: (profileData: any) =>
    fetchApi("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    }),

  uploadResume: (formData: FormData) => {
    const token = getAuthToken();
    return fetch(`${API_BASE_URL}/auth/upload-resume`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type for FormData, let browser set it
      },
      body: formData,
    }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) {
        throw new ApiError(response.status, data.message || `Upload Error: ${response.statusText}`, data);
      }
      return data;
    });
  },

  downloadResume: (filename: string) => {
    const token = getAuthToken();
    return fetch(`${API_BASE_URL}/auth/download-resume/${filename}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  logout: () =>
    fetchApi("/auth/logout", {
      method: "POST",
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

export { ApiError, getAuthToken, setAuthToken, removeAuthToken };
