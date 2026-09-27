/**
 * Shared database client — single source of truth for the Neon connection
 * and schema migration. Every data module imports `sql()` and `ensureSchema()` from here.
 */

import { neon } from "@neondatabase/serverless";

let sqlClient: ReturnType<typeof neon> | null = null;
let schemaInitialized: Promise<void> | null = null;

/**
 * Returns the Neon SQL tagged-template client, or null if DATABASE_URL is not set
 * (in which case the caller should fall back to in-memory).
 */
export function sql() {
  if (!process.env.DATABASE_URL) return null;
  sqlClient ??= neon(process.env.DATABASE_URL);
  return sqlClient;
}

/**
 * Returns true when a real Postgres connection is available.
 */
export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Ensure all tables exist. Safe to call many times — the first call runs the
 * DDL and every subsequent call awaits the same cached promise.
 */
export async function ensureSchema(): Promise<void> {
  const client = sql();
  if (!client) return;

  if (!schemaInitialized) {
    schemaInitialized = runMigrations(client).catch((error) => {
      schemaInitialized = null;
      throw error;
    });
  }

  await schemaInitialized;
}

async function runMigrations(client: ReturnType<typeof neon>): Promise<void> {
  // --- Core tables (already existed) ---
  await client`CREATE TABLE IF NOT EXISTS applyflow_users (
    id TEXT PRIMARY KEY,
    email_hash TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    password_salt TEXT,
    workspace JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await client`ALTER TABLE applyflow_users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
  await client`ALTER TABLE applyflow_users ADD COLUMN IF NOT EXISTS password_salt TEXT`;

  await client`CREATE TABLE IF NOT EXISTS applyflow_otp_challenges (
    id TEXT PRIMARY KEY,
    email_hash TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await client`CREATE INDEX IF NOT EXISTS applyflow_otp_email_idx
    ON applyflow_otp_challenges(email_hash, created_at DESC)`;

  // --- Documents ---
  await client`CREATE TABLE IF NOT EXISTS applyflow_documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    file_path TEXT,
    file_size INTEGER DEFAULT 0,
    mime_type TEXT,
    content_text TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'ready',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await client`CREATE INDEX IF NOT EXISTS idx_documents_user
    ON applyflow_documents(user_id)`;

  // --- Cover letters ---
  await client`CREATE TABLE IF NOT EXISTS applyflow_cover_letters (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    company_submitted_to TEXT,
    role_submitted_to TEXT,
    is_template BOOLEAN NOT NULL DEFAULT TRUE,
    source_job_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await client`CREATE INDEX IF NOT EXISTS idx_cover_letters_user
    ON applyflow_cover_letters(user_id)`;

  // --- Jobs ---
  await client`CREATE TABLE IF NOT EXISTS applyflow_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    location TEXT,
    source TEXT NOT NULL,
    source_url TEXT,
    apply_url TEXT,
    fit_score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'discovered',
    tags TEXT[] NOT NULL DEFAULT '{}',
    accent TEXT NOT NULL DEFAULT '#6b5cff',
    initials TEXT NOT NULL DEFAULT 'JO',
    job_description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    generated_cover_letter TEXT,
    application_data JSONB,
    run_id TEXT,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ
  )`;

  await client`CREATE INDEX IF NOT EXISTS idx_jobs_user_status
    ON applyflow_jobs(user_id, status)`;
  await client`CREATE INDEX IF NOT EXISTS idx_jobs_user_source
    ON applyflow_jobs(user_id, source)`;
  await client`CREATE INDEX IF NOT EXISTS idx_jobs_user_discovered
    ON applyflow_jobs(user_id, discovered_at DESC)`;

  // --- Portal connections ---
  await client`CREATE TABLE IF NOT EXISTS applyflow_portal_connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
    portal TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'disconnected',
    auth_data_encrypted TEXT,
    login_url TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, portal)
  )`;

  await client`CREATE INDEX IF NOT EXISTS idx_portal_connections_user
    ON applyflow_portal_connections(user_id, portal)`;

  // --- Engine runs ---
  await client`CREATE TABLE IF NOT EXISTS applyflow_runs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running',
    config JSONB NOT NULL DEFAULT '{}',
    jobs_discovered INTEGER NOT NULL DEFAULT 0,
    jobs_prepared INTEGER NOT NULL DEFAULT 0,
    jobs_pending_review INTEGER NOT NULL DEFAULT 0,
    jobs_submitted INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_log JSONB NOT NULL DEFAULT '[]'
  )`;

  await client`CREATE INDEX IF NOT EXISTS idx_runs_user
    ON applyflow_runs(user_id, started_at DESC)`;

  // --- Activity log ---
  await client`CREATE TABLE IF NOT EXISTS applyflow_activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
    run_id TEXT REFERENCES applyflow_runs(id) ON DELETE SET NULL,
    job_id TEXT REFERENCES applyflow_jobs(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  await client`CREATE INDEX IF NOT EXISTS idx_activity_user
    ON applyflow_activity_log(user_id, created_at DESC)`;
  await client`CREATE INDEX IF NOT EXISTS idx_activity_run
    ON applyflow_activity_log(run_id)`;
}
