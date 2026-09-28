/**
 * Engine orchestrator — the "Start" button.
 *
 * Coordinates the full pipeline:
 * 1. Discover jobs from connected sources
 * 2. Score/rank them against the user's profile
 * 3. Prepare top matches (generate cover letters + pre-fill forms)
 * 4. Mark them "ready_for_review" and STOP — user takes over
 *
 * The engine tracks its state in applyflow_runs so the user can see
 * real-time progress and the system can recover from failures.
 */

import { sql, ensureSchema } from "./db";
import { randomId } from "./auth-crypto";
import { discoverFromCareerSites } from "./engine-discovery";
import { scoreAllDiscoveredJobs, getTopJobs } from "./engine-matcher";
import { prepareJobs } from "./engine-preparer";
import { logActivity } from "./activity";
import { listJobs, transitionJobStatus } from "./jobs";
import type { RunConfig, RunRecord, RunStatus, UserProfile } from "./types";

// ─── In-memory fallback for runs ───
type MemStore = { applyflowRuns?: Map<string, RunRecord> };
const g = globalThis as unknown as MemStore;
const memRuns: Map<string, RunRecord> = g.applyflowRuns ?? new Map();
if (!g.applyflowRuns) g.applyflowRuns = memRuns;

// ─── Row mapper ───
type DbRow = {
  id: string;
  user_id: string;
  status: string;
  config: RunConfig;
  jobs_discovered: number;
  jobs_prepared: number;
  jobs_pending_review: number;
  jobs_submitted: number;
  started_at: string;
  completed_at: string | null;
  error_log: Array<{ message: string; timestamp: string; context?: Record<string, unknown> }>;
};

function rowToRecord(row: DbRow): RunRecord {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status as RunStatus,
    config: row.config,
    jobsDiscovered: row.jobs_discovered,
    jobsPrepared: row.jobs_prepared,
    jobsPendingReview: row.jobs_pending_review,
    jobsSubmitted: row.jobs_submitted,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorLog: row.error_log ?? [],
  };
}

// ─── Default engine config ───

export function defaultRunConfig(profile: UserProfile): RunConfig {
  const targetRoles = profile.targetRoles
    ? profile.targetRoles.split(",").map((r) => r.trim()).filter(Boolean)
    : ["AI/ML Intern", "Software Engineer Intern", "Data Science Intern", "Machine Learning Engineer"];

  const targetLocations = profile.locations
    ? profile.locations.split(",").map((l) => l.trim()).filter(Boolean)
    : ["United States", "Remote"];

  return {
    targetRoles,
    targetLocations,
    sources: ["greenhouse", "lever"],
    companyFilter: [],
    maxJobsPerRun: 25,
  };
}

// ─── Run CRUD ───

/** Create a new engine run */
async function createRun(userId: string, config: RunConfig): Promise<RunRecord> {
  const id = randomId();
  const now = new Date().toISOString();
  const record: RunRecord = {
    id,
    userId,
    status: "running",
    config,
    jobsDiscovered: 0,
    jobsPrepared: 0,
    jobsPendingReview: 0,
    jobsSubmitted: 0,
    startedAt: now,
    completedAt: null,
    errorLog: [],
  };

  const client = sql();
  if (!client) {
    memRuns.set(id, record);
    return record;
  }

  await ensureSchema();
  await client`
    INSERT INTO applyflow_runs (id, user_id, status, config, started_at)
    VALUES (${id}, ${userId}, 'running', ${JSON.stringify(config)}::jsonb, NOW())
  `;
  return record;
}

/** Update run stats */
async function updateRunStats(
  runId: string,
  updates: Partial<Pick<RunRecord, "jobsDiscovered" | "jobsPrepared" | "jobsPendingReview" | "jobsSubmitted" | "status" | "errorLog">>
): Promise<void> {
  const client = sql();
  if (!client) {
    const run = memRuns.get(runId);
    if (!run) return;
    if (updates.jobsDiscovered !== undefined) run.jobsDiscovered = updates.jobsDiscovered;
    if (updates.jobsPrepared !== undefined) run.jobsPrepared = updates.jobsPrepared;
    if (updates.jobsPendingReview !== undefined) run.jobsPendingReview = updates.jobsPendingReview;
    if (updates.jobsSubmitted !== undefined) run.jobsSubmitted = updates.jobsSubmitted;
    if (updates.status !== undefined) {
      run.status = updates.status;
      if (["completed", "failed", "cancelled"].includes(updates.status)) {
        run.completedAt = new Date().toISOString();
      }
    }
    if (updates.errorLog !== undefined) run.errorLog = updates.errorLog;
    return;
  }

  await ensureSchema();
  if (updates.jobsDiscovered !== undefined) {
    await client`UPDATE applyflow_runs SET jobs_discovered = ${updates.jobsDiscovered} WHERE id = ${runId}`;
  }
  if (updates.jobsPrepared !== undefined) {
    await client`UPDATE applyflow_runs SET jobs_prepared = ${updates.jobsPrepared} WHERE id = ${runId}`;
  }
  if (updates.jobsPendingReview !== undefined) {
    await client`UPDATE applyflow_runs SET jobs_pending_review = ${updates.jobsPendingReview} WHERE id = ${runId}`;
  }
  if (updates.status !== undefined) {
    if (["completed", "failed", "cancelled"].includes(updates.status)) {
      await client`UPDATE applyflow_runs SET status = ${updates.status}, completed_at = NOW() WHERE id = ${runId}`;
    } else {
      await client`UPDATE applyflow_runs SET status = ${updates.status} WHERE id = ${runId}`;
    }
  }
  if (updates.errorLog !== undefined) {
    await client`UPDATE applyflow_runs SET error_log = ${JSON.stringify(updates.errorLog)}::jsonb WHERE id = ${runId}`;
  }
}

/** Get current (latest active) run for a user */
export async function getCurrentRun(userId: string): Promise<RunRecord | null> {
  const client = sql();
  if (!client) {
    return Array.from(memRuns.values())
      .filter((r) => r.userId === userId && r.status === "running")
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0] ?? null;
  }
  await ensureSchema();
  const rows = (await client`
    SELECT * FROM applyflow_runs WHERE user_id = ${userId} AND status = 'running'
    ORDER BY started_at DESC LIMIT 1
  `) as DbRow[];
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** Get the latest run for a user (any status) */
export async function getLatestRun(userId: string): Promise<RunRecord | null> {
  const client = sql();
  if (!client) {
    return Array.from(memRuns.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0] ?? null;
  }
  await ensureSchema();
  const rows = (await client`
    SELECT * FROM applyflow_runs WHERE user_id = ${userId}
    ORDER BY started_at DESC LIMIT 1
  `) as DbRow[];
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** List recent runs */
export async function listRuns(userId: string, limit: number = 10): Promise<RunRecord[]> {
  const client = sql();
  if (!client) {
    return Array.from(memRuns.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }
  await ensureSchema();
  const rows = (await client`
    SELECT * FROM applyflow_runs WHERE user_id = ${userId}
    ORDER BY started_at DESC LIMIT ${limit}
  `) as DbRow[];
  return rows.map(rowToRecord);
}

// ─── Engine Pipeline ───

/**
 * START the engine — the main entry point.
 *
 * This is what runs when the user clicks "Start". It:
 * 1. Creates a new run record
 * 2. Discovers jobs from all sources
 * 3. Scores them against the user's profile
 * 4. Prepares top matches with cover letters
 * 5. Marks them ready for review and completes the run
 *
 * NOTE: This runs in a single request. For production, consider
 * moving to a background job queue (e.g., Vercel Edge Functions,
 * Inngest, or a cron-based approach).
 */
export async function startEngine(
  userId: string,
  profile: UserProfile,
  configOverrides?: Partial<RunConfig>
): Promise<RunRecord> {
  // Check if there's already a running engine
  const existing = await getCurrentRun(userId);
  if (existing) {
    throw new Error("An engine run is already in progress. Stop it first or wait for it to complete.");
  }

  const config = { ...defaultRunConfig(profile), ...configOverrides };
  const run = await createRun(userId, config);

  await logActivity(userId, "engine_started", {
    runId: run.id,
    details: { config },
  });

  const errors: Array<{ message: string; timestamp: string }> = [];

  try {
    // ── Phase 1: Discovery ──
    let totalDiscovered = 0;

    // Greenhouse boards (user can add board tokens in the future — for now use career site directory)
    // Lever boards (same)
    // Career sites directory
    if (config.sources.includes("greenhouse") || config.sources.includes("lever") || config.sources.includes("career_sites")) {
      const result = await discoverFromCareerSites(userId, {
        ...config,
        sources: config.sources.includes("career_sites")
          ? ["greenhouse", "lever"]
          : config.sources,
      }, run.id);
      totalDiscovered += result.jobsNew;
      for (const err of result.errors) {
        errors.push({ message: err, timestamp: new Date().toISOString() });
      }
    }

    await updateRunStats(run.id, { jobsDiscovered: totalDiscovered, errorLog: errors });
    run.jobsDiscovered = totalDiscovered;

    // ── Phase 2: Scoring ──
    const scoreResults = await scoreAllDiscoveredJobs(userId, profile);

    // ── Phase 3: Queue top matches ──
    const topJobs = await getTopJobs(userId, config.maxJobsPerRun, 50);
    const jobsToQueue = topJobs.filter((j) => j.status === "discovered");

    for (const job of jobsToQueue) {
      try {
        await transitionJobStatus(userId, job.id, "queued");
        await logActivity(userId, "job_queued", {
          runId: run.id,
          jobId: job.id,
          details: { company: job.company, role: job.role, fitScore: job.fitScore },
        });
      } catch {
        // Skip jobs that can't transition
      }
    }

    // ── Phase 4: Prepare top jobs ──
    const jobsToPrepare = jobsToQueue
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 8);

    const prepResults = await prepareJobs(
      userId,
      jobsToPrepare.map((j) => j.id),
      profile,
      run.id
    );

    const prepared = prepResults.filter((r) => r.coverLetterGenerated).length;
    const pendingReview = prepResults.filter((r) => !r.error).length;

    for (const r of prepResults) {
      if (r.error) {
        errors.push({ message: r.error, timestamp: new Date().toISOString() });
      }
    }

    // ── Complete the run ──
    await updateRunStats(run.id, {
      jobsPrepared: prepared,
      jobsPendingReview: pendingReview,
      status: "completed",
      errorLog: errors,
    });

    run.jobsPrepared = prepared;
    run.jobsPendingReview = pendingReview;
    run.status = "completed";
    run.completedAt = new Date().toISOString();
    run.errorLog = errors;

    await logActivity(userId, "engine_completed", {
      runId: run.id,
      details: {
        jobsDiscovered: totalDiscovered,
        jobsPrepared: prepared,
        jobsPendingReview: pendingReview,
        errorsCount: errors.length,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown engine failure";
    errors.push({ message: msg, timestamp: new Date().toISOString() });

    await updateRunStats(run.id, { status: "failed", errorLog: errors });
    run.status = "failed";
    run.errorLog = errors;

    await logActivity(userId, "error", {
      runId: run.id,
      details: { error: msg, stage: "engine_pipeline" },
    });
  }

  return run;
}

/**
 * STOP the engine — cancels a running engine run.
 */
export async function stopEngine(userId: string): Promise<RunRecord | null> {
  const run = await getCurrentRun(userId);
  if (!run) return null;

  await updateRunStats(run.id, { status: "cancelled" });
  run.status = "cancelled";
  run.completedAt = new Date().toISOString();

  await logActivity(userId, "engine_stopped", {
    runId: run.id,
    details: { reason: "User stopped the engine" },
  });

  return run;
}

/**
 * Get the full engine status (for the status API endpoint).
 */
export async function getEngineStatus(userId: string): Promise<{
  isRunning: boolean;
  latestRun: RunRecord | null;
  jobCounts: Record<string, number>;
}> {
  const currentRun = await getCurrentRun(userId);
  const latestRun = currentRun ?? await getLatestRun(userId);

  // Get job counts from the jobs table
  const jobs = await listJobs(userId);
  const jobCounts: Record<string, number> = {};
  for (const job of jobs) {
    jobCounts[job.status] = (jobCounts[job.status] ?? 0) + 1;
  }

  return {
    isRunning: !!currentRun,
    latestRun,
    jobCounts,
  };
}

/**
 * Reset pipeline data for a user — clears all discovered jobs, engine runs,
 * and engine activity logs to start from an absolute clean zero-slate.
 */
export async function resetPipelineData(userId: string): Promise<{
  jobsDeleted: number;
  runsDeleted: number;
}> {
  // Clear runs from memory fallback
  let memRunsDeleted = 0;
  for (const [id, r] of memRuns.entries()) {
    if (r.userId === userId) {
      memRuns.delete(id);
      memRunsDeleted++;
    }
  }

  // Clear jobs via jobs helper
  const { deleteAllJobs } = await import("./jobs");
  const jobsDeleted = await deleteAllJobs(userId);

  const client = sql();
  if (!client) {
    return { jobsDeleted, runsDeleted: memRunsDeleted };
  }

  await ensureSchema();
  // Delete activities, runs from database
  await client`DELETE FROM applyflow_activity_log WHERE user_id = ${userId}`;
  const runsRes = await client`DELETE FROM applyflow_runs WHERE user_id = ${userId}`;

  return {
    jobsDeleted,
    runsDeleted: (runsRes as unknown[]).length ?? 0,
  };
}

