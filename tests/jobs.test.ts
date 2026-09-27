import { describe, it, expect } from "vitest";
import {
  createJob,
  getJob,
  listJobs,
  transitionJobStatus,
  updateJob,
  countJobsByStatus,
} from "../lib/jobs";

describe("jobs data layer & state machine", () => {
  const userId = "user_jobs_test_1";

  it("creates a job listing with initials and default discovered status", async () => {
    const job = await createJob(userId, {
      company: "Morgan Stanley",
      role: "AI Quantitative Analyst Intern",
      location: "New York, NY",
      source: "handshake",
      tags: ["AI", "Finance", "Columbia Handshake"],
    });

    expect(job.id).toBeTruthy();
    expect(job.company).toBe("Morgan Stanley");
    expect(job.role).toBe("AI Quantitative Analyst Intern");
    expect(job.initials).toBe("MS");
    expect(job.status).toBe("discovered");
    expect(job.fitScore).toBe(0);
    expect(job.tags).toContain("Columbia Handshake");

    const fetched = await getJob(userId, job.id);
    expect(fetched?.id).toBe(job.id);
  });

  it("enforces valid status transitions through the full application lifecycle", async () => {
    const uId = "user_jobs_test_2";
    const job = await createJob(uId, {
      company: "Anthropic",
      role: "Research Engineer Intern",
      source: "greenhouse",
    });

    expect(job.status).toBe("discovered");

    // discovered -> queued
    const queued = await transitionJobStatus(uId, job.id, "queued");
    expect(queued?.status).toBe("queued");

    // queued -> preparing
    const preparing = await transitionJobStatus(uId, job.id, "preparing");
    expect(preparing?.status).toBe("preparing");

    // preparing -> ready_for_review
    const ready = await transitionJobStatus(uId, job.id, "ready_for_review");
    expect(ready?.status).toBe("ready_for_review");
    expect(ready?.reviewedAt).toBeTruthy();

    // ready_for_review -> approved
    const approved = await transitionJobStatus(uId, job.id, "approved");
    expect(approved?.status).toBe("approved");

    // approved -> submitted
    const submitted = await transitionJobStatus(uId, job.id, "submitted");
    expect(submitted?.status).toBe("submitted");
    expect(submitted?.submittedAt).toBeTruthy();

    // submitted -> interview
    const interview = await transitionJobStatus(uId, job.id, "interview");
    expect(interview?.status).toBe("interview");
  });

  it("rejects illegal state transitions with an informative error", async () => {
    const uId = "user_jobs_test_3";
    const job = await createJob(uId, {
      company: "Datadog",
      role: "Machine Learning Intern",
      source: "lever",
    });

    // Trying to jump from discovered directly to submitted must throw
    await expect(
      transitionJobStatus(uId, job.id, "submitted")
    ).rejects.toThrow(/Cannot transition job from "discovered" to "submitted"/);
  });

  it("allows discarding and resuming jobs back to queue", async () => {
    const uId = "user_jobs_test_4";
    const job = await createJob(uId, {
      company: "Stripe",
      role: "Software Engineering Intern",
      source: "greenhouse",
    });

    // discovered -> discarded
    const discarded = await transitionJobStatus(uId, job.id, "discarded");
    expect(discarded?.status).toBe("discarded");

    // discarded -> queued
    const resumed = await transitionJobStatus(uId, job.id, "queued");
    expect(resumed?.status).toBe("queued");
  });

  it("updates job fitScore, AI-generated cover letter, and application data", async () => {
    const uId = "user_jobs_test_5";
    const job = await createJob(uId, {
      company: "Scale AI",
      role: "GenAI Product Intern",
      source: "jobright",
    });

    const updated = await updateJob(uId, job.id, {
      fitScore: 94,
      generatedCoverLetter: "Tailored letter for Scale AI...",
      applicationData: {
        desiredRole: "GenAI Product Intern",
        workAuthorization: "F-1 OPT",
      },
    });

    expect(updated?.fitScore).toBe(94);
    expect(updated?.generatedCoverLetter).toBe("Tailored letter for Scale AI...");
    expect((updated?.applicationData as Record<string, unknown>)?.workAuthorization).toBe("F-1 OPT");
  });

  it("counts jobs aggregated by lifecycle status", async () => {
    const uId = "user_jobs_test_6";
    await createJob(uId, { company: "OpenAI", role: "AI Intern", source: "career_site", status: "discovered" });
    const j2 = await createJob(uId, { company: "Meta", role: "ML Intern", source: "linkedin", status: "discovered" });
    await transitionJobStatus(uId, j2.id, "queued");

    const counts = await countJobsByStatus(uId);
    expect(counts.discovered).toBeGreaterThanOrEqual(1);
    expect(counts.queued).toBeGreaterThanOrEqual(1);
  });
});
