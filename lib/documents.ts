/**
 * Documents data layer — CRUD operations for user-uploaded resumes,
 * cover letters, LinkedIn PDFs, and other supporting documents.
 *
 * Supports both Postgres (production) and in-memory (local dev) storage.
 * File content is stored alongside metadata for AI processing.
 */

import { sql, ensureSchema } from "./db";
import { randomId } from "./auth-crypto";
import type { DocumentRecord, DocumentKind, DocumentStatus } from "./types";

// ─── In-memory fallback ───
type MemStore = { applyflowDocuments?: Map<string, DocumentRecord> };
const g = globalThis as unknown as MemStore;
const memDocs: Map<string, DocumentRecord> = g.applyflowDocuments ?? new Map();
if (!g.applyflowDocuments) g.applyflowDocuments = memDocs;

// ─── Row mapper (Postgres snake_case → camelCase) ───
type DbRow = {
  id: string;
  user_id: string;
  name: string;
  kind: string;
  file_path: string | null;
  file_size: number;
  mime_type: string | null;
  content_text: string | null;
  metadata: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
};

function rowToRecord(row: DbRow): DocumentRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    kind: row.kind as DocumentKind,
    filePath: row.file_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    contentText: row.content_text,
    metadata: row.metadata ?? {},
    status: row.status as DocumentStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Public API ───

/** List all documents for a user */
export async function listDocuments(userId: string): Promise<DocumentRecord[]> {
  const client = sql();
  if (!client) {
    return Array.from(memDocs.values()).filter((d) => d.userId === userId);
  }
  await ensureSchema();
  const rows = (await client`
    SELECT * FROM applyflow_documents WHERE user_id = ${userId} ORDER BY created_at DESC
  `) as DbRow[];
  return rows.map(rowToRecord);
}

/** Get a single document by ID (scoped to user) */
export async function getDocument(userId: string, docId: string): Promise<DocumentRecord | null> {
  const client = sql();
  if (!client) {
    const doc = memDocs.get(docId);
    return doc && doc.userId === userId ? doc : null;
  }
  await ensureSchema();
  const rows = (await client`
    SELECT * FROM applyflow_documents WHERE id = ${docId} AND user_id = ${userId} LIMIT 1
  `) as DbRow[];
  return rows[0] ? rowToRecord(rows[0]) : null;
}

/** Create a new document record */
export async function createDocument(
  userId: string,
  data: {
    name: string;
    kind: DocumentKind;
    filePath?: string;
    fileSize?: number;
    mimeType?: string;
    contentText?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<DocumentRecord> {
  const id = randomId();
  const now = new Date().toISOString();
  const record: DocumentRecord = {
    id,
    userId,
    name: data.name,
    kind: data.kind,
    filePath: data.filePath ?? null,
    fileSize: data.fileSize ?? 0,
    mimeType: data.mimeType ?? null,
    contentText: data.contentText ?? null,
    metadata: data.metadata ?? {},
    status: "ready",
    createdAt: now,
    updatedAt: now,
  };

  const client = sql();
  if (!client) {
    memDocs.set(id, record);
    return record;
  }

  await ensureSchema();
  await client`
    INSERT INTO applyflow_documents (id, user_id, name, kind, file_path, file_size, mime_type, content_text, metadata, status)
    VALUES (${id}, ${userId}, ${record.name}, ${record.kind}, ${record.filePath}, ${record.fileSize}, ${record.mimeType}, ${record.contentText}, ${JSON.stringify(record.metadata)}::jsonb, ${record.status})
  `;
  return record;
}

/** Update a document (content text, metadata, status) */
export async function updateDocument(
  userId: string,
  docId: string,
  updates: {
    name?: string;
    contentText?: string;
    metadata?: Record<string, unknown>;
    status?: DocumentStatus;
  }
): Promise<DocumentRecord | null> {
  const client = sql();
  if (!client) {
    const doc = memDocs.get(docId);
    if (!doc || doc.userId !== userId) return null;
    if (updates.name !== undefined) doc.name = updates.name;
    if (updates.contentText !== undefined) doc.contentText = updates.contentText;
    if (updates.metadata !== undefined) doc.metadata = updates.metadata;
    if (updates.status !== undefined) doc.status = updates.status;
    doc.updatedAt = new Date().toISOString();
    return doc;
  }

  await ensureSchema();
  // Build dynamic SET clause
  const setClauses: string[] = ["updated_at = NOW()"];
  if (updates.name !== undefined) setClauses.push(`name = '${updates.name.replace(/'/g, "''")}'`);
  if (updates.contentText !== undefined) setClauses.push(`content_text = '${updates.contentText.replace(/'/g, "''")}'`);
  if (updates.metadata !== undefined) setClauses.push(`metadata = '${JSON.stringify(updates.metadata).replace(/'/g, "''")}'::jsonb`);
  if (updates.status !== undefined) setClauses.push(`status = '${updates.status}'`);

  // Use parameterized update for safety
  if (updates.name !== undefined) {
    await client`UPDATE applyflow_documents SET name = ${updates.name}, updated_at = NOW() WHERE id = ${docId} AND user_id = ${userId}`;
  }
  if (updates.contentText !== undefined) {
    await client`UPDATE applyflow_documents SET content_text = ${updates.contentText}, updated_at = NOW() WHERE id = ${docId} AND user_id = ${userId}`;
  }
  if (updates.metadata !== undefined) {
    await client`UPDATE applyflow_documents SET metadata = ${JSON.stringify(updates.metadata)}::jsonb, updated_at = NOW() WHERE id = ${docId} AND user_id = ${userId}`;
  }
  if (updates.status !== undefined) {
    await client`UPDATE applyflow_documents SET status = ${updates.status}, updated_at = NOW() WHERE id = ${docId} AND user_id = ${userId}`;
  }

  return getDocument(userId, docId);
}

/** Delete a document */
export async function deleteDocument(userId: string, docId: string): Promise<boolean> {
  const client = sql();
  if (!client) {
    const doc = memDocs.get(docId);
    if (!doc || doc.userId !== userId) return false;
    memDocs.delete(docId);
    return true;
  }
  await ensureSchema();
  await client`DELETE FROM applyflow_documents WHERE id = ${docId} AND user_id = ${userId}`;
  return true;
}

/** Get all document text for a user (for AI context) */
export async function getAllDocumentText(userId: string): Promise<string> {
  const docs = await listDocuments(userId);
  return docs
    .filter((d) => d.contentText)
    .map((d) => `--- ${d.kind.toUpperCase()}: ${d.name} ---\n${d.contentText}`)
    .join("\n\n");
}

/**
 * Detect document kind from filename.
 * Used during upload when the user doesn't specify a kind.
 */
export function detectDocumentKind(filename: string): DocumentKind {
  const lower = filename.toLowerCase();
  if (lower.includes("resume") || lower.includes("cv")) return "resume";
  if (lower.includes("cover") || lower.includes("letter")) return "cover_letter";
  if (lower.includes("linkedin")) return "linkedin_pdf";
  return "other";
}
