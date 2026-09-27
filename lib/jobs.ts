/**
 * Jobs data layer — CRUD + status management for discovered/queued/submitted jobs.
 *
 * Enforces the job status state machine: discovered → queued → preparing →
 * ready_for_review → approved → submitted → (interview | rejected).
 */

import { sql, ensureSchema } from "./db";
import { randomId } from "./auth-crypto";
import type { JobRecord, JobStatus, JOB_STATUS_TRANSITIONS } from "./types";

// Re-import the transitions map
const STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
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

// ─── In-memory fallback ───
type MemStore = { applyflowJobs?: Map<string, JobRecord> };
const g = globalThis as unknown as MemStore;
const memJobs: Map<string, JobRecord> = g.applyflowJobs ?? new Map();
if (!g.applyflowJobs) g.applyflowJobs = memJobs;

// ─── Row mapper ───
type DbRow = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  location: string | null;
  source: string;
  source_url: string | null;
  apply_url: string | null;
  fit_score: number;
  status: string;
  tags: string[];
  accent: string;
  initials: string;
  job_description: string | null;
  metadata: Record<string, unknown>;
  generated_cover_letter: string | null;
  application_data: Record<string, unknown> | null;
  run_id: string | null;
  discovered_at: string;
  submitted_at: string | null;
  reviewed_at: string | null;
};

function rowToRecord(row: DbRow): JobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    company: row.company,
    role: row.role,
    location: row.location,
    source: row.source,
    sourceUrl: row.source_url,
    applyUrl: row.apply_url,
    fitScore: row.fit_score,
    status: row.status as JobStatus,
    tags: row.tags ?? [],
    accent: row.accent,
    initials: row.initials,
    jobDescription: row.job_description,
    metadata: row.metadata ?? {},
    generatedCoverLetter: row.generated_cover_letter,
    applicationData: row.application_data,
    runId: row.run_id,
    discoveredAt: row.discovered_at,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
  };
}

function makeInitials(company: string): string {
  return company
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "JO";
}

// ─── Public API ───

/** List jobs for a user, optionally filtered by status */
export async function listJobs(
  userId: string,
  options?: { status?: JobStatus; source?: string; limit?: number; offset?: number }
): Promise<JobRecord[]> {
  const client = sql();
  const limit = options?.limit ?? 500;
  const offset = options?.offset ?? 0;

  if (!client) {
    let results = Array.from(memJobs.values()).filter((j) => j.userId === userId);
    if (options?.status) results = results.filter((j) => j.status === options.status);
    if (options?.source) results = results.filter((j) => j.source === options.source);
    results.sort((a, b) => new Date(b.discoveredAt).getTime() - new Date(a.discoveredAt).getTime());
    return results.slice(offset, offset + limit);
  }

  await ensureSchema();

  if (options?.status && options?.source) {
    const rows = (await client`
      SELECT * FROM applyflow_jobs
      WHERE user_id = ${userId} AND status = ${options.status} AND source = ${options.source}
      ORDER BY discovered_at DESC LIMIT ${limit} OFFSET ${offset}
    `) as DbRow[];
    return rows.map(rowToRecord);
  }

  if (options?.status) {
    const rows = (await client`
      SELECT * FROM applyflow_jobs
      WHERE user_id = ${userId} AND status = ${options.status}
      ORDER BY discovered_at DESC LIMIT ${limit} OFFSET ${offset}
    `) as DbRow[];
    return rows.map(rowToRecord);
  }

  if (options?.source) {
    const rows = (await client`
      SELECT * FROM applyflow_jobs
      WHERE user_id = ${userId} AND source = ${options.source}
      ORDER BY discovered_at DESC LIMIT ${limit} OFFSET ${offset}
    `) as DbRow[];
    return rows.map(rowToRecord);
  }

  const rows = (await client`
    SELECT * FROM applyflow_jobs
    WHERE user_id = ${userId}
    ORDER BY discovered_at DESC LIMIT ${limit} OFFSET ${offset}
  `) as DbRow[];
  return rows.map(rowToRecord);
}

/** Get a single job */
export async function getJob(userId: string, jobId: string): Promise<JobRecord | null> {
  const client = sql();
  if (!client) {
    const job = memJobs.get(jobId);
    return job && job.userId === userId ? job : null;
  }
  await ensureSchema();
  const rows = (await client`
    SELECT * FROM applyflow_jobs WHERE id = ${jobId} AND user_id = ${userId} LIMIT 1
  `) as DbRow[];
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** Create a new job listing */
export async function createJob(
  userId: string,
  data: {
    company: string;
    role: string;
    location?: string;
    source: string;
    sourceUrl?: string;
    applyUrl?: string;
    fitScore?: number;
    status?: JobStatus;
    tags?: string[];
    accent?: string;
    jobDescription?: string;
    metadata?: Record<string, unknown>;
    runId?: string;
  }
): Promise<JobRecord> {
  const id = randomId();
  const now = new Date().toISOString();
  const record: JobRecord = {
    id,
    userId,
    company: data.company,
    role: data.role,
    location: data.location ?? null,
    source: data.source,
    sourceUrl: data.sourceUrl ?? null,
    applyUrl: data.applyUrl ?? null,
    fitScore: data.fitScore ?? 0,
    status: data.status ?? "discovered",
    tags: data.tags ?? [],
    accent: data.accent ?? "#6b5cff",
    initials: makeInitials(data.company),
    jobDescription: data.jobDescription ?? null,
    metadata: data.metadata ?? {},
    generatedCoverLetter: null,
    applicationData: null,
    runId: data.runId ?? null,
    discoveredAt: now,
    submittedAt: null,
    reviewedAt: null,
  };

  const client = sql();
  if (!client) {
    memJobs.set(id, record);
    return record;
  }

  await ensureSchema();
  await client`
    INSERT INTO applyflow_jobs
      (id, user_id, company, role, location, source, source_url, apply_url, fit_score, status, tags, accent, initials, job_description, metadata, run_id)
    VALUES
      (${id}, ${userId}, ${record.company}, ${record.role}, ${record.location}, ${record.source}, ${record.sourceUrl}, ${record.applyUrl}, ${record.fitScore}, ${record.status}, ${record.tags}, ${record.accent}, ${record.initials}, ${record.jobDescription}, ${JSON.stringify(record.metadata)}::jsonb, ${record.runId})
  `;
  return record;
}

/** Transition a job's status (enforces the state machine) */
export async function transitionJobStatus(
  userId: string,
  jobId: string,
  newStatus: JobStatus
): Promise<JobRecord | null> {
  const job = await getJob(userId, jobId);
  if (!job) return null;

  const allowed = STATUS_TRANSITIONS[job.status];
  if (!allowed?.includes(newStatus)) {
    throw new Error(`Cannot transition job from "${job.status}" to "${newStatus}". Allowed: ${allowed?.join(", ") ?? "none"}`);
  }

  const client = sql();
  const now = new Date().toISOString();

  if (!client) {
    job.status = newStatus;
    if (newStatus === "submitted") job.submittedAt = now;
    if (newStatus === "ready_for_review" || newStatus === "approved") job.reviewedAt = now;
    return job;
  }

  await ensureSchema();
  await client`
    UPDATE applyflow_jobs
    SET status = ${newStatus},
        submitted_at = ${newStatus === "submitted" ? now : job.submittedAt},
        reviewed_at = ${["ready_for_review", "approved"].includes(newStatus) ? now : job.reviewedAt}
    WHERE id = ${jobId} AND user_id = ${userId}
  `;
  return getJob(userId, jobId);
}

/** Update job fields (cover letter, application data, fit score, etc.) */
export async function updateJob(
  userId: string,
  jobId: string,
  updates: {
    generatedCoverLetter?: string;
    applicationData?: Record<string, unknown>;
    fitScore?: number;
    jobDescription?: string;
    tags?: string[];
    applyUrl?: string;
  }
): Promise<JobRecord | null> {
  const client = sql();
  if (!client) {
    const job = memJobs.get(jobId);
    if (!job || job.userId !== userId) return null;
    if (updates.generatedCoverLetter !== undefined) job.generatedCoverLetter = updates.generatedCoverLetter;
    if (updates.applicationData !== undefined) job.applicationData = updates.applicationData;
    if (updates.fitScore !== undefined) job.fitScore = updates.fitScore;
    if (updates.jobDescription !== undefined) job.jobDescription = updates.jobDescription;
    if (updates.tags !== undefined) job.tags = updates.tags;
    if (updates.applyUrl !== undefined) job.applyUrl = updates.applyUrl;
    return job;
  }

  await ensureSchema();
  if (updates.generatedCoverLetter !== undefined) {
    await client`UPDATE applyflow_jobs SET generated_cover_letter = ${updates.generatedCoverLetter} WHERE id = ${jobId} AND user_id = ${userId}`;
  }
  if (updates.applicationData !== undefined) {
    await client`UPDATE applyflow_jobs SET application_data = ${JSON.stringify(updates.applicationData)}::jsonb WHERE id = ${jobId} AND user_id = ${userId}`;
  }
  if (updates.fitScore !== undefined) {
    await client`UPDATE applyflow_jobs SET fit_score = ${updates.fitScore} WHERE id = ${jobId} AND user_id = ${userId}`;
  }
  if (updates.jobDescription !== undefined) {
    await client`UPDATE applyflow_jobs SET job_description = ${updates.jobDescription} WHERE id = ${jobId} AND user_id = ${userId}`;
  }
  if (updates.tags !== undefined) {
    await client`UPDATE applyflow_jobs SET tags = ${updates.tags} WHERE id = ${jobId} AND user_id = ${userId}`;
  }
  if (updates.applyUrl !== undefined) {
    await client`UPDATE applyflow_jobs SET apply_url = ${updates.applyUrl} WHERE id = ${jobId} AND user_id = ${userId}`;
  }

  return getJob(userId, jobId);
}

/** Delete a job */
export async function deleteJob(userId: string, jobId: string): Promise<boolean> {
  const client = sql();
  if (!client) {
    const job = memJobs.get(jobId);
    if (!job || job.userId !== userId) return false;
    memJobs.delete(jobId);
    return true;
  }
  await ensureSchema();
  await client`DELETE FROM applyflow_jobs WHERE id = ${jobId} AND user_id = ${userId}`;
  return true;
}

/** Count jobs by status for a user */
export async function countJobsByStatus(userId: string): Promise<Record<string, number>> {
  const client = sql();
  if (!client) {
    const jobs = Array.from(memJobs.values()).filter((j) => j.userId === userId);
    const counts: Record<string, number> = {};
    for (const j of jobs) {
      counts[j.status] = (counts[j.status] ?? 0) + 1;
    }
    return counts;
  }
  await ensureSchema();
  const rows = (await client`
    SELECT status, COUNT(*)::int as count FROM applyflow_jobs WHERE user_id = ${userId} GROUP BY status
  `) as Array<{ status: string; count: number }>;
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.status] = row.count;
  }
  return counts;
}

/**
 * Check if a job with the same company + role + source already exists for this user.
 * Used to avoid duplicate discoveries.
 */
export async function jobExists(userId: string, company: string, role: string, source: string, applyUrl?: string): Promise<boolean> {
  const client = sql();
  if (!client) {
    return Array.from(memJobs.values()).some((j) => {
      if (j.userId !== userId) return false;
      if (applyUrl && j.applyUrl === applyUrl) return true;
      return j.company === company && j.role === role && j.source === source;
    });
  }
  await ensureSchema();
  if (applyUrl) {
    const byUrl = (await client`
      SELECT 1 FROM applyflow_jobs
      WHERE user_id = ${userId} AND apply_url = ${applyUrl}
      LIMIT 1
    `) as Array<Record<string, unknown>>;
    if (byUrl.length > 0) return true;
  }
  const rows = (await client`
    SELECT 1 FROM applyflow_jobs
    WHERE user_id = ${userId} AND company = ${company} AND role = ${role} AND source = ${source}
    LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows.length > 0;
}
