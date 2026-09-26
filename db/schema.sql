-- =============================================================
-- ApplyFlow — Full Database Schema
-- =============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS applyflow_users (
  id TEXT PRIMARY KEY,
  email_hash TEXT UNIQUE NOT NULL,
  workspace JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. OTP challenges (login)
CREATE TABLE IF NOT EXISTS applyflow_otp_challenges (
  id TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS applyflow_otp_email_idx
  ON applyflow_otp_challenges(email_hash, created_at DESC);

-- 3. User documents (resumes, cover letters, LinkedIn PDFs)
CREATE TABLE IF NOT EXISTS applyflow_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,                -- 'resume' | 'cover_letter' | 'linkedin_pdf' | 'other'
  file_path TEXT,                    -- relative path inside uploads/<user_id>/
  file_size INTEGER DEFAULT 0,
  mime_type TEXT,
  content_text TEXT,                 -- extracted plain text for AI processing
  metadata JSONB NOT NULL DEFAULT '{}',  -- extracted skills, education, experience, etc.
  status TEXT NOT NULL DEFAULT 'ready',  -- 'ready' | 'needs_review' | 'processing'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user
  ON applyflow_documents(user_id);

-- 4. Cover letter templates (multiple per user, grows over time)
CREATE TABLE IF NOT EXISTS applyflow_cover_letters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                -- "Google ML Intern", "Fintech General", etc.
  content TEXT NOT NULL,             -- the full text (with or without placeholders)
  company_submitted_to TEXT,         -- if this was already submitted somewhere
  role_submitted_to TEXT,            -- the role it was submitted for
  is_template BOOLEAN NOT NULL DEFAULT TRUE,  -- TRUE = reusable template, FALSE = generated for a specific job
  source_job_id TEXT,                -- if generated for a specific job, link it
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_user
  ON applyflow_cover_letters(user_id);

-- 5. Job listings — discovered/queued/submitted jobs
CREATE TABLE IF NOT EXISTS applyflow_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT,
  source TEXT NOT NULL,              -- 'greenhouse', 'lever', 'linkedin', 'handshake', 'career_site', 'manual'
  source_url TEXT,                   -- original posting URL
  apply_url TEXT,                    -- direct application URL
  fit_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'discovered',
  -- status: 'discovered' | 'queued' | 'preparing' | 'ready_for_review' | 'approved' | 'submitted' | 'rejected' | 'interview' | 'discarded'
  tags TEXT[] NOT NULL DEFAULT '{}',
  accent TEXT NOT NULL DEFAULT '#6b5cff',
  initials TEXT NOT NULL DEFAULT 'JO',
  job_description TEXT,              -- full JD text for AI matching
  metadata JSONB NOT NULL DEFAULT '{}',       -- extra scraped data (department, salary, etc.)
  generated_cover_letter TEXT,       -- AI-generated cover letter for this specific job
  application_data JSONB,            -- pre-filled form fields ready for submission
  run_id TEXT,                       -- which engine run discovered this
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_status
  ON applyflow_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_user_source
  ON applyflow_jobs(user_id, source);
CREATE INDEX IF NOT EXISTS idx_jobs_user_discovered
  ON applyflow_jobs(user_id, discovered_at DESC);

-- 6. Portal connections — tracks login state for each career portal
CREATE TABLE IF NOT EXISTS applyflow_portal_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
  portal TEXT NOT NULL,              -- 'linkedin', 'handshake', 'greenhouse', 'goinglobal', 'simplify', 'jobright'
  status TEXT NOT NULL DEFAULT 'disconnected',
  -- status: 'disconnected' | 'connected' | 'expired' | 'needs_reauth'
  auth_data_encrypted TEXT,          -- encrypted OAuth token or session cookie (future use)
  login_url TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, portal)
);

CREATE INDEX IF NOT EXISTS idx_portal_connections_user
  ON applyflow_portal_connections(user_id, portal);

-- 7. Automation runs — tracks each "Start" engine execution
CREATE TABLE IF NOT EXISTS applyflow_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running',
  -- status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  config JSONB NOT NULL DEFAULT '{}',    -- target roles, locations, sources, preferences
  jobs_discovered INTEGER NOT NULL DEFAULT 0,
  jobs_prepared INTEGER NOT NULL DEFAULT 0,
  jobs_pending_review INTEGER NOT NULL DEFAULT 0,
  jobs_submitted INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_log JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_runs_user
  ON applyflow_runs(user_id, started_at DESC);

-- 8. Activity log — audit trail of everything the engine does
CREATE TABLE IF NOT EXISTS applyflow_activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES applyflow_users(id) ON DELETE CASCADE,
  run_id TEXT REFERENCES applyflow_runs(id) ON DELETE SET NULL,
  job_id TEXT REFERENCES applyflow_jobs(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  -- actions: 'engine_started', 'engine_stopped', 'job_discovered', 'job_queued',
  --          'cover_letter_generated', 'form_prefilled', 'awaiting_review',
  --          'user_approved', 'submitted', 'document_uploaded', 'error'
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user
  ON applyflow_activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_run
  ON applyflow_activity_log(run_id);
