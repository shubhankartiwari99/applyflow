import { describe, it, expect } from "vitest";
import {
  extractTextFromFileBuffer,
  inferCoverLetterMetadata,
} from "../lib/cover-letter-extractor";

describe("Cover Letter Extractor & Metadata Inference", () => {
  it("extracts text from plain text buffers and infers Google SWE metadata", async () => {
    const rawContent = `Dear Google Hiring Team,

I am writing to express my strong enthusiasm for the Software Engineering Intern role at Google.
As a Computer Science student at Columbia University, I have built distributed systems and worked with PyTorch and Go.
I would love the opportunity to contribute to Google's infrastructure and developer tools.

Sincerely,
Shubhankar Tiwari`;

    const buffer = Buffer.from(rawContent, "utf-8");
    const extracted = await extractTextFromFileBuffer(buffer, "google_swe_intern_cover_letter.txt", "text/plain");

    expect(extracted).toContain("Software Engineering Intern");
    expect(extracted).toContain("Columbia University");

    const meta = inferCoverLetterMetadata("google_swe_intern_cover_letter.txt", extracted);
    expect(meta.company).toBe("Google");
    expect(meta.role).toBe("Software Engineering Intern");
    expect(meta.title).toBe("Google Swe Intern Cover Letter");
  });

  it("infers Palantir role and template variables", async () => {
    const rawContent = `Dear Palantir Recruiting Team,
I am excited to apply for the Machine Learning Intern position at Palantir.
My research in Foundation Models aligns directly with your mission in Apollo and Gotham.`;

    const meta = inferCoverLetterMetadata("Palantir-ML-Intern.md", rawContent);
    expect(meta.company).toBe("Palantir");
    expect(meta.role).toBe("Machine Learning Intern");
  });

  it("handles reusable templates with placeholders", async () => {
    const templateContent = `Dear {COMPANY} Team,
I am writing to apply for the {ROLE} position at {COMPANY}.
As a student at Columbia University, I bring strong expertise in machine learning and distributed systems.`;

    const meta = inferCoverLetterMetadata("general_columbia_cover_letter.txt", templateContent);
    expect(meta.isTemplate).toBe(true);
  });
});
