// Shared problem store using Backend API
// All data is stored in MongoDB via FastAPI backend

const API_BASE_URL = "http://localhost:8000/api/v1";

export interface TestCase {
  inputs: {
    value: string;
    type: "int" | "int[]" | "string" | "string[]" | "long" | "double";
    description: string;
  }[];
  expectedOutput: string;
  visibility: "visible" | "hidden";
}

export interface FunctionSignature {
  functionName: string;
  returnType: string;
  parameters: {
    name: string;
    type: string;
  }[];
}

export interface CodeTemplate {
  python: string;
  java: string;
  cpp: string;
  c: string;
}

export interface Example {
  input: string;
  output: string;
  explanation?: string;
}

export interface Problem {
  id?: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  companies: string[];
  description: string;
  examples: Example[];
  constraints: string[];
  testCases: TestCase[];
  codeTemplates: CodeTemplate;
  functionSignatures?: {
    python: FunctionSignature;
    java: FunctionSignature;
    cpp: FunctionSignature;
    c: FunctionSignature;
  };
  stats: {
    likes: number;
    dislikes: number;
    acceptance: string;
    submissions: string;
  };
  published: boolean;
}

// Get all problems from API (for admin)
export const getAllProblems = async (): Promise<Problem[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/problems`);
    if (!response.ok) {
      throw new Error('Failed to fetch problems');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching all problems:', error);
    return [];
  }
};

// Save a new problem to API
export const createProblem = async (problem: Omit<Problem, 'id'>): Promise<Problem | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/problems`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(problem),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.details && Array.isArray(errorData.details)) {
        const fieldErrors = errorData.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
        throw new Error(`Validation error: ${fieldErrors}`);
      }
      throw new Error(errorData.message || errorData.error || 'Failed to create problem');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating problem:', error);
    throw error;
  }
};

// Update an existing problem
export const updateProblem = async (id: string, problem: Partial<Problem>): Promise<Problem | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/problems/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(problem),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update problem');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating problem:', error);
    return null;
  }
};

// Delete a problem
export const deleteProblem = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/problems/${id}`, {
      method: 'DELETE',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error deleting problem:', error);
    return false;
  }
};

// Toggle publish status
export const togglePublishProblem = async (id: string): Promise<Problem | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/problems/${id}/publish`, {
      method: 'PATCH',
    });
    
    if (!response.ok) {
      throw new Error('Failed to toggle publish status');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error toggling publish status:', error);
    return null;
  }
};

// Get only published problems (for candidates)
export const getPublishedProblems = async (): Promise<Problem[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/problems/?published_only=true`);
    if (!response.ok) {
      throw new Error('Failed to fetch published problems');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching published problems:', error);
    return [];
  }
};

// Get a single problem by ID
export const getProblemById = async (id: string): Promise<Problem | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/problems/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch problem');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching problem:', error);
    return null;
  }
};
