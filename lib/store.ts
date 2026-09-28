import { neon } from "@neondatabase/serverless";
import { emailHash, generateSalt, hashOtp, hashPassword, randomId, verifyPassword } from "./auth-crypto";

export type WorkspaceData = {
  jobs?: unknown[];
  profile?: Record<string, unknown>;
  documents?: unknown[];
  portalStatuses?: Record<string, unknown>;
};

export type StoredUser = {
  id: string;
  emailHash: string;
  passwordHash?: string | null;
  passwordSalt?: string | null;
  workspace: WorkspaceData;
};

type StoredChallenge = {
  id: string;
  emailHash: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
};

type GlobalStore = {
  applyflowUsers?: Map<string, StoredUser>;
  applyflowChallenges?: Map<string, StoredChallenge>;
};

const globalForStore = globalThis as unknown as GlobalStore;

const memoryUsers: Map<string, StoredUser> = globalForStore.applyflowUsers ?? new Map<string, StoredUser>();
if (!globalForStore.applyflowUsers) {
  globalForStore.applyflowUsers = memoryUsers;
}

const memoryChallenges: Map<string, StoredChallenge> = globalForStore.applyflowChallenges ?? new Map<string, StoredChallenge>();
if (!globalForStore.applyflowChallenges) {
  globalForStore.applyflowChallenges = memoryChallenges;
}

let sqlClient: ReturnType<typeof neon> | null = null;
let schemaPromise: Promise<void> | null = null;

function sql() {
  if (!process.env.DATABASE_URL) return null;
  sqlClient ??= neon(process.env.DATABASE_URL);
  return sqlClient;
}

async function ensureSchema() {
  const client = sql();
  if (!client) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
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
      await client`CREATE INDEX IF NOT EXISTS applyflow_otp_email_idx ON applyflow_otp_challenges(email_hash, created_at DESC)`;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

/**
 * Authenticate an existing user or register a new user using their private passkey.
 * Returns the authenticated user record and a flag indicating if this was a new registration.
 */
function nameFromEmail(email: string): string {
  const handle = email.split("@")[0] || "";
  const parts = handle.split(/[._-]/).filter(Boolean);
  if (parts.length === 0) return "Candidate";
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

export async function authenticateOrRegisterUser(
  email: string,
  passkey: string
): Promise<{ user: StoredUser; isNewUser: boolean }> {
  const hashedEmail = emailHash(email);
  const client = sql();
  const friendlyName = nameFromEmail(email);

  if (!client) {
    let user = memoryUsers.get(hashedEmail);
    if (!user) {
      const salt = generateSalt();
      const hash = hashPassword(passkey, salt);
      user = {
        id: randomId(),
        emailHash: hashedEmail,
        passwordHash: hash,
        passwordSalt: salt,
        workspace: {
          profile: {
            email,
            fullName: friendlyName,
          },
        },
      };
      memoryUsers.set(hashedEmail, user);
      return { user, isNewUser: true };
    }

    if (user.passwordHash && user.passwordSalt) {
      const isValid = verifyPassword(passkey, user.passwordSalt, user.passwordHash);
      if (!isValid) {
        throw new Error("Incorrect passkey. Please check your password and try again.");
      }
      if (!user.workspace) user.workspace = {};
      if (!user.workspace.profile) user.workspace.profile = {};
      if (!user.workspace.profile.email) user.workspace.profile.email = email;
      if (!user.workspace.profile.fullName) user.workspace.profile.fullName = friendlyName;
      return { user, isNewUser: false };
    }

    // Set passkey for existing legacy user without password
    const salt = generateSalt();
    user.passwordSalt = salt;
    user.passwordHash = hashPassword(passkey, salt);
    if (!user.workspace) user.workspace = {};
    if (!user.workspace.profile) user.workspace.profile = {};
    if (!user.workspace.profile.email) user.workspace.profile.email = email;
    if (!user.workspace.profile.fullName) user.workspace.profile.fullName = friendlyName;
    return { user, isNewUser: false };
  }

  await ensureSchema();
  const rows = (await client`
    SELECT id, email_hash, password_hash, password_salt, workspace 
    FROM applyflow_users 
    WHERE email_hash = ${hashedEmail} 
    LIMIT 1
  `) as Array<{
    id: string;
    email_hash: string;
    password_hash: string | null;
    password_salt: string | null;
    workspace: WorkspaceData;
  }>;

  if (rows.length === 0) {
    const id = randomId();
    const salt = generateSalt();
    const hash = hashPassword(passkey, salt);
    const initialWorkspace: WorkspaceData = {
      profile: {
        email,
        fullName: friendlyName,
      },
    };
    await client`
      INSERT INTO applyflow_users (id, email_hash, password_hash, password_salt, workspace)
      VALUES (${id}, ${hashedEmail}, ${hash}, ${salt}, ${JSON.stringify(initialWorkspace)}::jsonb)
    `;
    return { user: { id, emailHash: hashedEmail, workspace: initialWorkspace }, isNewUser: true };
  }

  const row = rows[0];
  const workspace: WorkspaceData = row.workspace ?? {};
  let workspaceUpdated = false;
  if (!workspace.profile) {
    workspace.profile = { email, fullName: friendlyName };
    workspaceUpdated = true;
  } else {
    if (!workspace.profile.email) {
      workspace.profile.email = email;
      workspaceUpdated = true;
    }
    if (!workspace.profile.fullName) {
      workspace.profile.fullName = friendlyName;
      workspaceUpdated = true;
    }
  }

  if (row.password_hash && row.password_salt) {
    const isValid = verifyPassword(passkey, row.password_salt, row.password_hash);
    if (!isValid) {
      throw new Error("Incorrect passkey. Please check your password and try again.");
    }
    if (workspaceUpdated) {
      await client`
        UPDATE applyflow_users 
        SET workspace = ${JSON.stringify(workspace)}::jsonb, updated_at = NOW() 
        WHERE id = ${row.id}
      `;
    }
    return { user: { id: row.id, emailHash: row.email_hash, workspace }, isNewUser: false };
  }

  // Set passkey if record had null password
  const salt = generateSalt();
  const hash = hashPassword(passkey, salt);
  await client`
    UPDATE applyflow_users 
    SET password_hash = ${hash}, password_salt = ${salt}, workspace = ${JSON.stringify(workspace)}::jsonb, updated_at = NOW() 
    WHERE id = ${row.id}
  `;
  return { user: { id: row.id, emailHash: row.email_hash, workspace }, isNewUser: false };
}

export async function createOtpChallenge(email: string) {
  const hashedEmail = emailHash(email);
  const id = randomId();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const otpHash = hashOtp(hashedEmail, id, code);
  const client = sql();

  if (!client) {
    memoryChallenges.set(id, { id, emailHash: hashedEmail, otpHash, expiresAt, attempts: 0 });
    return { code, emailHash: hashedEmail, challengeId: id };
  }

  await ensureSchema();
  await client`INSERT INTO applyflow_otp_challenges (id, email_hash, otp_hash, expires_at) VALUES (${id}, ${hashedEmail}, ${otpHash}, ${new Date(expiresAt).toISOString()})`;
  return { code, emailHash: hashedEmail, challengeId: id };
}

export async function verifyOtpChallenge(email: string, code: string) {
  const hashedEmail = emailHash(email);
  const now = Date.now();
  const client = sql();

  if (!client) {
    const challenges = Array.from(memoryChallenges.values())
      .filter((challenge) => challenge.emailHash === hashedEmail)
      .sort((left, right) => right.expiresAt - left.expiresAt);
    const challenge = challenges[0];
    if (!challenge || challenge.expiresAt <= now || challenge.attempts >= 5) return null;
    challenge.attempts += 1;
    if (challenge.otpHash !== hashOtp(hashedEmail, challenge.id, code)) return null;
    memoryChallenges.delete(challenge.id);
    return getOrCreateUserByEmailHash(hashedEmail);
  }

  await ensureSchema();
  const rows = (await client`SELECT id, otp_hash, expires_at, attempts FROM applyflow_otp_challenges WHERE email_hash = ${hashedEmail} ORDER BY created_at DESC LIMIT 1`) as Array<{ id: string; otp_hash: string; expires_at: string; attempts: number }>;
  const challenge = rows[0];
  if (!challenge || new Date(challenge.expires_at).getTime() <= now || challenge.attempts >= 5) return null;
  await client`UPDATE applyflow_otp_challenges SET attempts = attempts + 1 WHERE id = ${challenge.id}`;
  if (challenge.otp_hash !== hashOtp(hashedEmail, challenge.id, code)) return null;
  await client`DELETE FROM applyflow_otp_challenges WHERE id = ${challenge.id}`;
  return getOrCreateUserByEmailHash(hashedEmail);
}

export async function getOrCreateUserByEmailHash(hashedEmail: string) {
  const client = sql();
  if (!client) {
    const existing = memoryUsers.get(hashedEmail);
    if (existing) return existing;
    const created = { id: randomId(), emailHash: hashedEmail, workspace: {} } satisfies StoredUser;
    memoryUsers.set(hashedEmail, created);
    return created;
  }

  await ensureSchema();
  const rows = (await client`SELECT id, email_hash, workspace FROM applyflow_users WHERE email_hash = ${hashedEmail} LIMIT 1`) as Array<{ id: string; email_hash: string; workspace: WorkspaceData }>;
  if (rows[0]) return { id: rows[0].id, emailHash: rows[0].email_hash, workspace: rows[0].workspace ?? {} } satisfies StoredUser;
  const id = randomId();
  await client`INSERT INTO applyflow_users (id, email_hash, workspace) VALUES (${id}, ${hashedEmail}, '{}'::jsonb)`;
  return { id, emailHash: hashedEmail, workspace: {} } satisfies StoredUser;
}

export async function getWorkspace(userId: string) {
  const client = sql();
  if (!client) {
    return Array.from(memoryUsers.values()).find((user) => user.id === userId)?.workspace ?? null;
  }
  await ensureSchema();
  const rows = (await client`SELECT workspace FROM applyflow_users WHERE id = ${userId} LIMIT 1`) as Array<{ workspace: WorkspaceData }>;
  return rows[0]?.workspace ?? null;
}

export async function saveWorkspace(userId: string, workspace: WorkspaceData) {
  const safeWorkspace: WorkspaceData = {
    jobs: Array.isArray(workspace.jobs) ? workspace.jobs : [],
    profile: workspace.profile && typeof workspace.profile === "object" ? workspace.profile : {},
    documents: Array.isArray(workspace.documents) ? workspace.documents : [],
    portalStatuses: workspace.portalStatuses && typeof workspace.portalStatuses === "object" ? workspace.portalStatuses : {},
  };
  const client = sql();
  if (!client) {
    const user = Array.from(memoryUsers.values()).find((item) => item.id === userId);
    if (!user) return false;
    user.workspace = safeWorkspace;
    return true;
  }
  await ensureSchema();
  await client`UPDATE applyflow_users SET workspace = ${JSON.stringify(safeWorkspace)}::jsonb, updated_at = NOW() WHERE id = ${userId}`;
  return true;
}
