/**
 * Shared TypeScript types for the entire ApplyFlow backend.
 * Every module imports types from here to stay consistent.
 */

// ─── Job Status Machine ───
export type JobStatus =
  | "discovered"
  | "queued"
  | "preparing"
  | "ready_for_review"
  | "approved"
  | "submitted"
  | "rejected"
  | "interview"
  | "discarded";

/** Allowed status transitions */
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  discovered: ["queued", "preparing", "discarded"],
  queued: ["preparing", "discarded"],
  preparing: ["ready_for_review", "queued"],
  ready_for_review: ["approved", "queued", "discarded"],
  approved: ["submitted", "ready_for_review"],
  submitted: ["interview", "rejected"],
  rejected: [],
  interview: [],
  discarded: ["queued"],
};

// ─── Documents ───
export type DocumentKind = "resume" | "cover_letter" | "linkedin_pdf" | "other";
export type DocumentStatus = "ready" | "needs_review" | "processing";

export type DocumentRecord = {
  id: string;
  userId: string;
  name: string;
  kind: DocumentKind;
  filePath: string | null;
  fileSize: number;
  mimeType: string | null;
  contentText: string | null;
  metadata: Record<string, unknown>;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
};

// ─── Cover Letters ───
export type CoverLetterRecord = {
  id: string;
  userId: string;
  name: string;
  content: string;
  companySubmittedTo: string | null;
  roleSubmittedTo: string | null;
  isTemplate: boolean;
  sourceJobId: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Jobs ───
export type JobRecord = {
  id: string;
  userId: string;
  company: string;
  role: string;
  location: string | null;
  source: string;
  sourceUrl: string | null;
  applyUrl: string | null;
  fitScore: number;
  status: JobStatus;
  tags: string[];
  accent: string;
  initials: string;
  jobDescription: string | null;
  metadata: Record<string, unknown>;
  generatedCoverLetter: string | null;
  applicationData: Record<string, unknown> | null;
  runId: string | null;
  discoveredAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
};

// ─── Portal Connections ───
export type PortalId = "linkedin" | "handshake" | "greenhouse" | "lever" | "workday" | "goinglobal" | "simplify" | "jobright";
export type PortalStatus = "disconnected" | "connected" | "expired" | "needs_reauth";

export type PortalConnectionRecord = {
  id: string;
  userId: string;
  portal: PortalId;
  status: PortalStatus;
  authDataEncrypted: string | null;
  loginUrl: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Engine Runs ───
export type RunStatus = "running" | "paused" | "completed" | "failed" | "cancelled";

export type RunConfig = {
  targetRoles: string[];
  targetLocations: string[];
  sources: string[];         // which portals/sites to scan
  companyFilter: string[];   // specific companies to target (empty = all)
  maxJobsPerRun: number;
};

export type RunRecord = {
  id: string;
  userId: string;
  status: RunStatus;
  config: RunConfig;
  jobsDiscovered: number;
  jobsPrepared: number;
  jobsPendingReview: number;
  jobsSubmitted: number;
  startedAt: string;
  completedAt: string | null;
  errorLog: Array<{ message: string; timestamp: string; context?: Record<string, unknown> }>;
};

// ─── Activity Log ───
export type ActivityAction =
  | "engine_started"
  | "engine_stopped"
  | "engine_paused"
  | "engine_completed"
  | "job_discovered"
  | "job_queued"
  | "cover_letter_generated"
  | "form_prefilled"
  | "awaiting_review"
  | "user_approved"
  | "submitted"
  | "document_uploaded"
  | "document_deleted"
  | "portal_connected"
  | "portal_disconnected"
  | "error";

export type ActivityRecord = {
  id: string;
  userId: string;
  runId: string | null;
  jobId: string | null;
  action: ActivityAction;
  details: Record<string, unknown>;
  createdAt: string;
};

// ─── User Profile (from workspace) ───
export type UserProfile = {
  fullName: string;
  email: string;
  linkedin: string;
  handshake: string;
  github: string;
  portfolio: string;
  targetRoles: string;
  locations: string;
  workAuthorization: string;
  coverLetterTemplate: string;
};
