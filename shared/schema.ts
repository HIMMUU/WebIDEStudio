import { z } from "zod";

// File node types for the file explorer
export const fileNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: z.enum(["file", "folder"]),
  content: z.string().optional(),
  children: z.array(z.lazy((): z.ZodTypeAny => fileNodeSchema)).optional(),
  isExpanded: z.boolean().optional(),
});

export type FileNode = z.infer<typeof fileNodeSchema>;

// Tab for the editor
export const tabSchema = z.object({
  id: z.string(),
  path: z.string(),
  name: z.string(),
  content: z.string(),
  language: z.string(),
  isModified: z.boolean(),
  isActive: z.boolean(),
});

export type Tab = z.infer<typeof tabSchema>;

// Project loaded from GitHub
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  owner: z.string(),
  repoUrl: z.string(),
  files: z.array(fileNodeSchema),
  loadedAt: z.string(),
});

export type Project = z.infer<typeof projectSchema>;

// GitHub repo info request
export const loadRepoRequestSchema = z.object({
  repoUrl: z.string().url(),
});

export type LoadRepoRequest = z.infer<typeof loadRepoRequestSchema>;

// Terminal output entry
export const terminalOutputSchema = z.object({
  id: z.string(),
  type: z.enum(["stdout", "stderr", "info", "command"]),
  content: z.string(),
  timestamp: z.number(),
});

export type TerminalOutput = z.infer<typeof terminalOutputSchema>;

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// File content response
export const fileContentResponseSchema = z.object({
  path: z.string(),
  content: z.string(),
  encoding: z.string(),
});

export type FileContentResponse = z.infer<typeof fileContentResponseSchema>;

// Create/update file request
export const fileOperationSchema = z.object({
  path: z.string(),
  content: z.string().optional(),
  newPath: z.string().optional(),
});

export type FileOperation = z.infer<typeof fileOperationSchema>;

// Legacy user schema (keeping for compatibility)
export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

export interface User {
  id: string;
  username: string;
  password: string;
}
