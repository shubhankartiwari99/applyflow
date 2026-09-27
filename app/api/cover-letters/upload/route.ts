/**
 * POST /api/cover-letters/upload
 * Multi-file & single-file upload endpoint for Cover Letters (PDF, DOCX, TXT, MD).
 * Extracts clean text and automatically infers metadata (company, role, title).
 * Supports direct saving to corpus or preview extraction for the interactive editor.
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../lib/auth-server";
import { createCoverLetter } from "../../../../lib/cover-letters";
import { extractTextFromFileBuffer, inferCoverLetterMetadata } from "../../../../lib/cover-letter-extractor";
import type { CoverLetterRecord } from "../../../../lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const isPreview = formData.get("preview") === "true";
    const files: File[] = [];

    // Collect all files from 'files' or 'file' form fields
    for (const [key, value] of formData.entries()) {
      if ((key === "files" || key === "file") && typeof value === "object" && "arrayBuffer" in value) {
        files.push(value as File);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided. Please select at least one cover letter file." }, { status: 400 });
    }

    // ── Preview Mode (single file inspection for modal) ──
    if (isPreview && files.length === 1) {
      const file = files[0];
      const buffer = Buffer.from(await file.arrayBuffer());
      const content = await extractTextFromFileBuffer(buffer, file.name, file.type);
      const meta = inferCoverLetterMetadata(file.name, content);

      return NextResponse.json({
        preview: true,
        filename: file.name,
        name: meta.title,
        company: meta.company || "",
        role: meta.role || "",
        content,
        isTemplate: meta.isTemplate,
        wordCount: content.split(/\s+/).filter(Boolean).length,
      });
    }

    // ── Bulk Processing & Saving Mode ──
    const createdLetters: CoverLetterRecord[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const content = await extractTextFromFileBuffer(buffer, file.name, file.type);

        if (!content || content.trim().length < 15) {
          errors.push(`Could not extract readable text from "${file.name}". File might be empty or scanned image.`);
          continue;
        }

        const meta = inferCoverLetterMetadata(file.name, content);

        const record = await createCoverLetter(userId, {
          name: meta.title,
          content,
          companySubmittedTo: meta.company,
          roleSubmittedTo: meta.role,
          isTemplate: meta.isTemplate,
        });

        createdLetters.push(record);
      } catch (err) {
        errors.push(`Failed to parse "${file.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (createdLetters.length === 0 && errors.length > 0) {
      return NextResponse.json({ error: errors.join(" ") }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      count: createdLetters.length,
      coverLetters: createdLetters,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Cover letter upload error:", err);
    return NextResponse.json({ error: "Failed to process cover letter upload." }, { status: 500 });
  }
}
