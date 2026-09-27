/**
 * Documents API — upload, list, delete, and extract text from documents.
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../lib/auth-server";
import {
  listDocuments,
  createDocument,
  deleteDocument,
  detectDocumentKind,
} from "../../../lib/documents";
import { extractTextFromFileBuffer } from "../../../lib/cover-letter-extractor";
import { logActivity } from "../../../lib/activity";

export const runtime = "nodejs";

/** GET /api/documents — list all documents for the authenticated user */
export async function GET(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const docs = await listDocuments(userId);
    return NextResponse.json({ documents: docs });
  } catch {
    return NextResponse.json({ error: "Could not load documents." }, { status: 503 });
  }
}

/**
 * POST /api/documents — upload a new document.
 *
 * Accepts JSON body: { name, kind?, contentText?, metadata? }
 * Or multipart form data with a file upload.
 */
export async function POST(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "A file is required." }, { status: 400 });

      const name = (formData.get("name") as string) || file.name;
      const kind = (formData.get("kind") as string) || detectDocumentKind(file.name);

      const bytes = Buffer.from(await file.arrayBuffer());
      let contentText: string | undefined;
      try {
        const extracted = await extractTextFromFileBuffer(bytes, file.name, file.type);
        if (extracted.trim().length > 20) contentText = extracted.slice(0, 80_000);
      } catch {
        if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
          contentText = await file.text();
        }
      }

      const doc = await createDocument(userId, {
        name,
        kind: kind as "resume" | "cover_letter" | "linkedin_pdf" | "other",
        fileSize: file.size,
        mimeType: file.type,
        contentText,
      });

      await logActivity(userId, "document_uploaded", { details: { name, kind } });
      return NextResponse.json({ document: doc }, { status: 201 });
    }

    // Handle JSON body
    const body = (await request.json()) as {
      name?: string;
      kind?: string;
      contentText?: string;
      metadata?: Record<string, unknown>;
    };

    if (!body.name) return NextResponse.json({ error: "Document name is required." }, { status: 400 });

    const doc = await createDocument(userId, {
      name: body.name,
      kind: (body.kind as "resume" | "cover_letter" | "linkedin_pdf" | "other") ?? "other",
      contentText: body.contentText,
      metadata: body.metadata,
    });

    await logActivity(userId, "document_uploaded", { details: { name: body.name, kind: body.kind } });
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not upload document." }, { status: 500 });
  }
}

/** DELETE /api/documents — delete a document by id (passed in query string) */
export async function DELETE(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const url = new URL(request.url);
  const docId = url.searchParams.get("id");
  if (!docId) return NextResponse.json({ error: "Document id is required." }, { status: 400 });

  try {
    const deleted = await deleteDocument(userId, docId);
    if (!deleted) return NextResponse.json({ error: "Document not found." }, { status: 404 });

    await logActivity(userId, "document_deleted", { details: { documentId: docId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete document." }, { status: 500 });
  }
}
