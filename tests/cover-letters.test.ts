import { describe, it, expect } from "vitest";
import {
  createCoverLetter,
  listCoverLetters,
  listTemplates,
  listSubmittedLetters,
  getCoverLetter,
  updateCoverLetter,
  deleteCoverLetter,
  buildCoverLetterContext,
} from "../lib/cover-letters";

describe("cover letters intelligence & data layer", () => {
  const userId = "user_cl_test_1";

  it("creates, retrieves, and updates a cover letter template", async () => {
    const created = await createCoverLetter(userId, {
      name: "Columbia AI Default Template",
      content: "I am a graduate student at Columbia University studying Machine Learning...",
      isTemplate: true,
    });

    expect(created.id).toBeTruthy();
    expect(created.userId).toBe(userId);
    expect(created.isTemplate).toBe(true);

    const fetched = await getCoverLetter(userId, created.id);
    expect(fetched?.name).toBe("Columbia AI Default Template");

    const updated = await updateCoverLetter(userId, created.id, {
      content: "Updated default cover letter with focus on Deep Learning and LLM fine-tuning.",
    });
    expect(updated?.content).toContain("Deep Learning");
  });

  it("distinguishes between templates and previously submitted cover letters", async () => {
    const uId = "user_cl_test_2";
    await createCoverLetter(uId, {
      name: "Template: General AI/ML",
      content: "General ML template text...",
      isTemplate: true,
    });

    await createCoverLetter(uId, {
      name: "Google DeepMind Submission",
      content: "Dear Google DeepMind Research Team...",
      isTemplate: false,
      companySubmittedTo: "Google DeepMind",
      roleSubmittedTo: "Research Engineer Intern",
    });

    const all = await listCoverLetters(uId);
    expect(all.length).toBe(2);
    // Templates should come first
    expect(all[0].isTemplate).toBe(true);

    const templates = await listTemplates(uId);
    expect(templates.length).toBe(1);
    expect(templates[0].name).toBe("Template: General AI/ML");

    const submitted = await listSubmittedLetters(uId);
    expect(submitted.length).toBe(1);
    expect(submitted[0].companySubmittedTo).toBe("Google DeepMind");
  });

  it("builds structured AI context separating templates and past submissions", async () => {
    const uId = "user_cl_test_3";
    await createCoverLetter(uId, {
      name: "Columbia AI Template",
      content: "Dear Hiring Team, I am an AI researcher...",
      isTemplate: true,
    });

    await createCoverLetter(uId, {
      name: "Two Sigma Submission",
      content: "Dear Two Sigma, my quantitative analysis background...",
      isTemplate: false,
      companySubmittedTo: "Two Sigma",
      roleSubmittedTo: "Quantitative Software Intern",
    });

    const ctx = await buildCoverLetterContext(uId);
    expect(ctx).toContain("=== USER'S COVER LETTER TEMPLATES ===");
    expect(ctx).toContain("Columbia AI Template");
    expect(ctx).toContain("=== PREVIOUSLY SUBMITTED COVER LETTERS ===");
    expect(ctx).toContain("Submitted to Two Sigma for Quantitative Software Intern");
    expect(ctx).toContain("quantitative analysis background");
  });

  it("deletes a cover letter", async () => {
    const uId = "user_cl_test_4";
    const cl = await createCoverLetter(uId, {
      name: "To be deleted",
      content: "Temporary text",
    });

    const deleteSuccess = await deleteCoverLetter(uId, cl.id);
    expect(deleteSuccess).toBe(true);

    const after = await getCoverLetter(uId, cl.id);
    expect(after).toBeNull();
  });
});
