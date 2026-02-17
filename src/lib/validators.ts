import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["candidate", "recruiter", "admin"]),
});

export const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.number().min(0).optional(),
  education: z.string().optional(),
});

export const jobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  company: z.string().min(2, "Company name is required"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  requirements: z.array(z.string()).min(1, "At least one requirement is needed"),
  type: z.enum(["technical", "behavioral", "aptitude", "coding"]),
});

export const questionSchema = z.object({
  text: z.string().min(10, "Question must be at least 10 characters"),
  type: z.enum(["technical", "behavioral", "aptitude", "coding"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  category: z.string().min(2, "Category is required"),
  tags: z.array(z.string()).optional(),
  expectedAnswer: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type JobInput = z.infer<typeof jobSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
