/**
 * Cover letters API — CRUD for cover letter templates and generated letters.
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../lib/auth-server";
import {
  listCoverLetters,
  createCoverLetter,
  updateCoverLetter,
  deleteCoverLetter,
} from "../../../lib/cover-letters";

export const runtime = "nodejs";

/** GET /api/cover-letters — list all cover letters for the user */
export async function GET(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const letters = await listCoverLetters(userId);
    return NextResponse.json({ coverLetters: letters });
  } catch {
    return NextResponse.json({ error: "Could not load cover letters." }, { status: 503 });
  }
}

/** POST /api/cover-letters — create a new cover letter template */
export async function POST(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const body = (await request.json()) as {
      name?: string;
      content?: string;
      isTemplate?: boolean;
      companySubmittedTo?: string;
      roleSubmittedTo?: string;
    };

    if (!body.name || !body.content) {
      return NextResponse.json({ error: "Name and content are required." }, { status: 400 });
    }

    const letter = await createCoverLetter(userId, {
      name: body.name,
      content: body.content,
      isTemplate: body.isTemplate ?? true,
      companySubmittedTo: body.companySubmittedTo,
      roleSubmittedTo: body.roleSubmittedTo,
    });

    return NextResponse.json({ coverLetter: letter }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create cover letter." }, { status: 500 });
  }
}

/** PUT /api/cover-letters — update a cover letter (id in body) */
export async function PUT(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  try {
    const body = (await request.json()) as {
      id: string;
      name?: string;
      content?: string;
      companySubmittedTo?: string;
      roleSubmittedTo?: string;
    };

    if (!body.id) return NextResponse.json({ error: "Cover letter id is required." }, { status: 400 });

    const updated = await updateCoverLetter(userId, body.id, {
      name: body.name,
      content: body.content,
      companySubmittedTo: body.companySubmittedTo,
      roleSubmittedTo: body.roleSubmittedTo,
    });

    if (!updated) return NextResponse.json({ error: "Cover letter not found." }, { status: 404 });
    return NextResponse.json({ coverLetter: updated });
  } catch {
    return NextResponse.json({ error: "Could not update cover letter." }, { status: 500 });
  }
}

/** DELETE /api/cover-letters — delete by id in query string */
export async function DELETE(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });

  const url = new URL(request.url);
  const clId = url.searchParams.get("id");
  if (!clId) return NextResponse.json({ error: "Cover letter id is required." }, { status: 400 });

  try {
    const deleted = await deleteCoverLetter(userId, clId);
    if (!deleted) return NextResponse.json({ error: "Cover letter not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete cover letter." }, { status: 500 });
  }
}
