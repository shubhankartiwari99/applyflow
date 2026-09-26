/**
 * Activity log data layer — audit trail of everything the engine does.
 *
 * Every discovery, cover letter generation, form fill, and submission
 * is logged here so the user has full transparency into engine actions.
 */

import { sql, ensureSchema } from "./db";
import { randomId } from "./auth-crypto";
import type { ActivityRecord, ActivityAction } from "./types";

// ─── In-memory fallback ───
type MemStore = { applyflowActivity?: ActivityRecord[] };
const g = globalThis as unknown as MemStore;
const memActivity: ActivityRecord[] = g.applyflowActivity ?? [];
if (!g.applyflowActivity) g.applyflowActivity = memActivity;

// ─── Row mapper ───
type DbRow = {
  id: string;
  user_id: string;
  run_id: string | null;
  job_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

function rowToRecord(row: DbRow): ActivityRecord {
  return {
    id: row.id,
    userId: row.user_id,
    runId: row.run_id,
    jobId: row.job_id,
    action: row.action as ActivityAction,
    details: row.details ?? {},
    createdAt: row.created_at,
  };
}

// ─── Public API ───

/** Log an activity event */
export async function logActivity(
  userId: string,
  action: ActivityAction,
  options?: {
    runId?: string;
    jobId?: string;
    details?: Record<string, unknown>;
  }
): Promise<ActivityRecord> {
  const id = randomId();
  const now = new Date().toISOString();
  const record: ActivityRecord = {
    id,
    userId,
    runId: options?.runId ?? null,
    jobId: options?.jobId ?? null,
    action,
    details: options?.details ?? {},
    createdAt: now,
  };

  const client = sql();
  if (!client) {
    memActivity.unshift(record);
    // Keep memory bounded
    if (memActivity.length > 500) memActivity.length = 500;
    return record;
  }

  await ensureSchema();
  await client`
    INSERT INTO applyflow_activity_log (id, user_id, run_id, job_id, action, details)
    VALUES (${id}, ${userId}, ${record.runId}, ${record.jobId}, ${record.action}, ${JSON.stringify(record.details)}::jsonb)
  `;
  return record;
}

/** List recent activity for a user */
export async function listActivity(
  userId: string,
  options?: { limit?: number; offset?: number; runId?: string }
): Promise<ActivityRecord[]> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const client = sql();
  if (!client) {
    let results = memActivity.filter((a) => a.userId === userId);
    if (options?.runId) results = results.filter((a) => a.runId === options.runId);
    return results.slice(offset, offset + limit);
  }

  await ensureSchema();

  if (options?.runId) {
    const rows = (await client`
      SELECT * FROM applyflow_activity_log
      WHERE user_id = ${userId} AND run_id = ${options.runId}
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `) as DbRow[];
    return rows.map(rowToRecord);
  }

  const rows = (await client`
    SELECT * FROM applyflow_activity_log
    WHERE user_id = ${userId}
    ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
  `) as DbRow[];
  return rows.map(rowToRecord);
}

/** Count activities by action type for a user */
export async function countActivitiesByAction(userId: string): Promise<Record<string, number>> {
  const client = sql();
  if (!client) {
    const counts: Record<string, number> = {};
    for (const a of memActivity.filter((r) => r.userId === userId)) {
      counts[a.action] = (counts[a.action] ?? 0) + 1;
    }
    return counts;
  }
  await ensureSchema();
  const rows = (await client`
    SELECT action, COUNT(*)::int as count
    FROM applyflow_activity_log
    WHERE user_id = ${userId}
    GROUP BY action
  `) as Array<{ action: string; count: number }>;
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.action] = row.count;
  }
  return counts;
}

/**
 * Human-readable description of an activity action.
 * Used in the frontend activity feed.
 */
export function describeAction(action: ActivityAction): string {
  const descriptions: Record<ActivityAction, string> = {
    engine_started: "Engine started a new discovery run",
    engine_stopped: "Engine was stopped",
    engine_paused: "Engine was paused",
    engine_completed: "Engine completed its run",
    job_discovered: "New job opportunity discovered",
    job_queued: "Job added to the application queue",
    cover_letter_generated: "Tailored cover letter generated",
    form_prefilled: "Application form pre-filled",
    awaiting_review: "Application ready for your review",
    user_approved: "You approved the application",
    submitted: "Application submitted",
    document_uploaded: "Document uploaded to workspace",
    document_deleted: "Document removed from workspace",
    portal_connected: "Portal connection established",
    portal_disconnected: "Portal disconnected",
    error: "An error occurred",
  };
  return descriptions[action] ?? action;
}
