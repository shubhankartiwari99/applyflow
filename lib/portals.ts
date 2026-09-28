/**
 * Portal connections data layer — manages login/session state for
 * external career portals (LinkedIn, Handshake, Greenhouse, etc.).
 *
 * Credentials are never stored by ApplyFlow — only connection status
 * markers and optional encrypted OAuth tokens for future API integrations.
 */

import { sql, ensureSchema } from "./db";
import { randomId } from "./auth-crypto";
import type { PortalConnectionRecord, PortalId, PortalStatus } from "./types";

// ─── Portal definitions (source of truth) ───
export type PortalDefinition = {
  id: PortalId;
  name: string;
  subtitle: string;
  loginUrl: string;
  accent: string;
  initials: string;
  capability: string;
  type: "ats_import" | "bookmark";
};

export const PORTAL_DEFINITIONS: PortalDefinition[] = [
  { id: "greenhouse", name: "Greenhouse", subtitle: "Public applicant tracking board API", loginUrl: "https://boards.greenhouse.io/", accent: "#00a86b", initials: "GH", capability: "Direct ATS ingest — import live job postings via public API", type: "ats_import" },
  { id: "lever", name: "Lever Co", subtitle: "Public job postings API", loginUrl: "https://jobs.lever.co/", accent: "#4285f4", initials: "LV", capability: "Direct ATS ingest — import live postings & descriptions via public API", type: "ats_import" },
  { id: "ashby", name: "Ashby HQ", subtitle: "Public modern ATS postings API", loginUrl: "https://jobs.ashbyhq.com/", accent: "#9945FF", initials: "AS", capability: "Direct ATS ingest — import live postings & descriptions via public API", type: "ats_import" },
  { id: "handshake", name: "Handshake", subtitle: "Columbia Engineering campus recruitment", loginUrl: "https://columbiaengineering.joinhandshake.com/login", accent: "#f05d35", initials: "HS", capability: "Campus recruitment bookmark — open portal in new tab", type: "bookmark" },
  { id: "linkedin", name: "LinkedIn", subtitle: "Professional network & job listings", loginUrl: "https://www.linkedin.com/login", accent: "#0a66c2", initials: "in", capability: "Professional network bookmark — browse & Easy Apply in new tab", type: "bookmark" },
  { id: "workday", name: "Workday", subtitle: "Enterprise career portals", loginUrl: "https://www.myworkday.com/", accent: "#f78200", initials: "WD", capability: "Enterprise application bookmark — open company portal in new tab", type: "bookmark" },
  { id: "simplify", name: "Simplify", subtitle: "Job search & autofill copilot", loginUrl: "https://simplify.jobs/", accent: "#7b63d5", initials: "SF", capability: "Autofill copilot bookmark — open portal in new tab", type: "bookmark" },
  { id: "jobright", name: "Jobright AI", subtitle: "AI internship & job search engine", loginUrl: "https://jobright.ai/", accent: "#ef9b45", initials: "JR", capability: "AI job search bookmark — open portal in new tab", type: "bookmark" },
  { id: "goinglobal", name: "GoinGlobal", subtitle: "Global & visa-sponsored positions", loginUrl: "https://online.goinglobal.com/", accent: "#258e71", initials: "GG", capability: "Global career bookmark — open portal in new tab", type: "bookmark" },
];

// ─── In-memory fallback ───
type MemStore = { applyflowPortals?: Map<string, PortalConnectionRecord> };
const g = globalThis as unknown as MemStore;
const memPortals: Map<string, PortalConnectionRecord> = g.applyflowPortals ?? new Map();
if (!g.applyflowPortals) g.applyflowPortals = memPortals;

// ─── Row mapper ───
type DbRow = {
  id: string;
  user_id: string;
  portal: string;
  status: string;
  auth_data_encrypted: string | null;
  login_url: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToRecord(row: DbRow): PortalConnectionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    portal: row.portal as PortalId,
    status: row.status as PortalStatus,
    authDataEncrypted: row.auth_data_encrypted,
    loginUrl: row.login_url,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function memKey(userId: string, portal: PortalId): string {
  return `${userId}:${portal}`;
}

// ─── Public API ───

/** Get all portal connections for a user (initializes defaults if missing) */
export async function listPortalConnections(userId: string): Promise<PortalConnectionRecord[]> {
  const client = sql();
  if (!client) {
    const results: PortalConnectionRecord[] = [];
    for (const def of PORTAL_DEFINITIONS) {
      const key = memKey(userId, def.id);
      if (!memPortals.has(key)) {
        const now = new Date().toISOString();
        memPortals.set(key, {
          id: randomId(),
          userId,
          portal: def.id,
          status: "disconnected",
          authDataEncrypted: null,
          loginUrl: def.loginUrl,
          lastSyncedAt: null,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        memPortals.get(key)!.loginUrl = def.loginUrl;
      }
      results.push(memPortals.get(key)!);
    }
    return results;
  }

  await ensureSchema();
  const rows = (await client`
    SELECT * FROM applyflow_portal_connections WHERE user_id = ${userId} ORDER BY portal
  `) as DbRow[];

  // Initialize missing portals
  const existing = new Set(rows.map((r) => r.portal));
  for (const def of PORTAL_DEFINITIONS) {
    if (!existing.has(def.id)) {
      const id = randomId();
      await client`
        INSERT INTO applyflow_portal_connections (id, user_id, portal, status, login_url)
        VALUES (${id}, ${userId}, ${def.id}, 'disconnected', ${def.loginUrl})
        ON CONFLICT (user_id, portal) DO NOTHING
      `;
    } else {
      await client`
        UPDATE applyflow_portal_connections
        SET login_url = ${def.loginUrl}
        WHERE user_id = ${userId} AND portal = ${def.id} AND login_url != ${def.loginUrl}
      `;
    }
  }

  // Re-fetch to include any newly created rows
  const allRows = (await client`
    SELECT * FROM applyflow_portal_connections WHERE user_id = ${userId} ORDER BY portal
  `) as DbRow[];
  return allRows.map(rowToRecord);
}

/** Get a specific portal connection */
export async function getPortalConnection(userId: string, portal: PortalId): Promise<PortalConnectionRecord | null> {
  const client = sql();
  if (!client) {
    return memPortals.get(memKey(userId, portal)) ?? null;
  }
  await ensureSchema();
  const rows = (await client`
    SELECT * FROM applyflow_portal_connections WHERE user_id = ${userId} AND portal = ${portal} LIMIT 1
  `) as DbRow[];
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** Update portal connection status */
export async function updatePortalStatus(
  userId: string,
  portal: PortalId,
  status: PortalStatus
): Promise<PortalConnectionRecord | null> {
  const client = sql();
  if (!client) {
    const key = memKey(userId, portal);
    const conn = memPortals.get(key);
    if (!conn) return null;
    conn.status = status;
    conn.updatedAt = new Date().toISOString();
    if (status === "connected") conn.lastSyncedAt = conn.updatedAt;
    return conn;
  }

  await ensureSchema();
  const now = new Date().toISOString();
  await client`
    UPDATE applyflow_portal_connections
    SET status = ${status},
        last_synced_at = ${status === "connected" ? now : null},
        updated_at = NOW()
    WHERE user_id = ${userId} AND portal = ${portal}
  `;
  return getPortalConnection(userId, portal);
}

/** Get all connected portals for a user */
export async function getConnectedPortals(userId: string): Promise<PortalConnectionRecord[]> {
  const all = await listPortalConnections(userId);
  return all.filter((p) => p.status === "connected");
}

/** Get portal definition by ID */
export function getPortalDefinition(portal: PortalId): PortalDefinition | undefined {
  return PORTAL_DEFINITIONS.find((def) => def.id === portal);
}
