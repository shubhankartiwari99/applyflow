/**
 * Cover letters data layer — CRUD + intelligence for the cover letter system.
 *
 * Manages both reusable templates and job-specific generated letters.
 * Provides context-gathering for AI generation: pulls all previous letters
 * so the AI can learn the user's writing style without repeating phrasing.
 */

import { sql, ensureSchema } from "./db";
import { randomId } from "./auth-crypto";
import type { CoverLetterRecord } from "./types";

// ─── In-memory fallback ───
type MemStore = { applyflowCoverLetters?: Map<string, CoverLetterRecord> };
const g = globalThis as unknown as MemStore;
const memLetters: Map<string, CoverLetterRecord> = g.applyflowCoverLetters ?? new Map();
if (!g.applyflowCoverLetters) g.applyflowCoverLetters = memLetters;

// ─── Row mapper ───
type DbRow = {
  id: string;
  user_id: string;
  name: string;
  content: string;
  company_submitted_to: string | null;
  role_submitted_to: string | null;
  is_template: boolean;
  source_job_id: string | null;
  created_at: string;
  updated_at: string;
};

function rowToRecord(row: DbRow): CoverLetterRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    content: row.content,
    companySubmittedTo: row.company_submitted_to,
    roleSubmittedTo: row.role_submitted_to,
    isTemplate: row.is_template,
    sourceJobId: row.source_job_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Public API ───

/** List all cover letters for a user (templates first, then generated) */
export async function listCoverLetters(userId: string): Promise<CoverLetterRecord[]> {
  const client = sql();
  if (!client) {
    return Array.from(memLetters.values())
      .filter((cl) => cl.userId === userId)
      .sort((a, b) => (a.isTemplate === b.isTemplate ? 0 : a.isTemplate ? -1 : 1));
  }
  await ensureSchema();
  const rows = (await client`
    SELECT * FROM applyflow_cover_letters
    WHERE user_id = ${userId}
    ORDER BY is_template DESC, created_at DESC
  `) as DbRow[];
  return rows.map(rowToRecord);
}

/** Get templates only */
export async function listTemplates(userId: string): Promise<CoverLetterRecord[]> {
  const all = await listCoverLetters(userId);
  return all.filter((cl) => cl.isTemplate);
}

/** Get previously submitted cover letters (for AI style learning) */
export async function listSubmittedLetters(userId: string): Promise<CoverLetterRecord[]> {
  const all = await listCoverLetters(userId);
  return all.filter((cl) => !cl.isTemplate && cl.companySubmittedTo);
}

/** Get a single cover letter */
export async function getCoverLetter(userId: string, clId: string): Promise<CoverLetterRecord | null> {
  const client = sql();
  if (!client) {
    const cl = memLetters.get(clId);
    return cl && cl.userId === userId ? cl : null;
  }
  await ensureSchema();
  const rows = (await client`
    SELECT * FROM applyflow_cover_letters WHERE id = ${clId} AND user_id = ${userId} LIMIT 1
  `) as DbRow[];
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** Create a new cover letter (template or generated) */
export async function createCoverLetter(
  userId: string,
  data: {
    name: string;
    content: string;
    isTemplate?: boolean;
    companySubmittedTo?: string;
    roleSubmittedTo?: string;
    sourceJobId?: string;
  }
): Promise<CoverLetterRecord> {
  const id = randomId();
  const now = new Date().toISOString();
  const record: CoverLetterRecord = {
    id,
    userId,
    name: data.name,
    content: data.content,
    companySubmittedTo: data.companySubmittedTo ?? null,
    roleSubmittedTo: data.roleSubmittedTo ?? null,
    isTemplate: data.isTemplate ?? true,
    sourceJobId: data.sourceJobId ?? null,
    createdAt: now,
    updatedAt: now,
  };

  const client = sql();
  if (!client) {
    memLetters.set(id, record);
    return record;
  }

  await ensureSchema();
  await client`
    INSERT INTO applyflow_cover_letters
      (id, user_id, name, content, company_submitted_to, role_submitted_to, is_template, source_job_id)
    VALUES
      (${id}, ${userId}, ${record.name}, ${record.content}, ${record.companySubmittedTo}, ${record.roleSubmittedTo}, ${record.isTemplate}, ${record.sourceJobId})
  `;
  return record;
}

/** Update a cover letter */
export async function updateCoverLetter(
  userId: string,
  clId: string,
  updates: {
    name?: string;
    content?: string;
    companySubmittedTo?: string;
    roleSubmittedTo?: string;
  }
): Promise<CoverLetterRecord | null> {
  const client = sql();
  if (!client) {
    const cl = memLetters.get(clId);
    if (!cl || cl.userId !== userId) return null;
    if (updates.name !== undefined) cl.name = updates.name;
    if (updates.content !== undefined) cl.content = updates.content;
    if (updates.companySubmittedTo !== undefined) cl.companySubmittedTo = updates.companySubmittedTo;
    if (updates.roleSubmittedTo !== undefined) cl.roleSubmittedTo = updates.roleSubmittedTo;
    cl.updatedAt = new Date().toISOString();
    return cl;
  }

  await ensureSchema();
  if (updates.name !== undefined) {
    await client`UPDATE applyflow_cover_letters SET name = ${updates.name}, updated_at = NOW() WHERE id = ${clId} AND user_id = ${userId}`;
  }
  if (updates.content !== undefined) {
    await client`UPDATE applyflow_cover_letters SET content = ${updates.content}, updated_at = NOW() WHERE id = ${clId} AND user_id = ${userId}`;
  }
  if (updates.companySubmittedTo !== undefined) {
    await client`UPDATE applyflow_cover_letters SET company_submitted_to = ${updates.companySubmittedTo}, updated_at = NOW() WHERE id = ${clId} AND user_id = ${userId}`;
  }
  if (updates.roleSubmittedTo !== undefined) {
    await client`UPDATE applyflow_cover_letters SET role_submitted_to = ${updates.roleSubmittedTo}, updated_at = NOW() WHERE id = ${clId} AND user_id = ${userId}`;
  }

  return getCoverLetter(userId, clId);
}

/** Delete a cover letter */
export async function deleteCoverLetter(userId: string, clId: string): Promise<boolean> {
  const client = sql();
  if (!client) {
    const cl = memLetters.get(clId);
    if (!cl || cl.userId !== userId) return false;
    memLetters.delete(clId);
    return true;
  }
  await ensureSchema();
  await client`DELETE FROM applyflow_cover_letters WHERE id = ${clId} AND user_id = ${userId}`;
  return true;
}

/**
 * Build AI context from all the user's cover letters.
 * Returns a structured string that can be injected into the AI prompt.
 */
export async function buildCoverLetterContext(userId: string): Promise<string> {
  const letters = await listCoverLetters(userId);
  if (letters.length === 0) return "";

  const sections: string[] = [];

  const templates = letters.filter((cl) => cl.isTemplate);
  if (templates.length > 0) {
    sections.push("=== USER'S COVER LETTER TEMPLATES ===");
    for (const t of templates) {
      sections.push(`--- Template: "${t.name}" ---\n${t.content}`);
    }
  }

  const submitted = letters.filter((cl) => !cl.isTemplate && cl.companySubmittedTo);
  if (submitted.length > 0) {
    sections.push("\n=== PREVIOUSLY SUBMITTED COVER LETTERS ===");
    for (const s of submitted) {
      sections.push(`--- Submitted to ${s.companySubmittedTo} for ${s.roleSubmittedTo ?? "N/A"} ---\n${s.content}`);
    }
  }

  return sections.join("\n\n");
}
