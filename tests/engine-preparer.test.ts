import { describe, it, expect } from "vitest";
import { createJob, getJob } from "../lib/jobs";
import { prepareJob } from "../lib/engine-preparer";
import type { UserProfile } from "../lib/types";

describe("engine-preparer module", () => {
  const userId = "user_prep_test_1";

  const sampleProfile: UserProfile = {
    fullName: "Alex Rivera",
    email: "alex.rivera@columbia.edu",
    phone: "+1 (555) 234-5678",
    targetRoles: "AI Engineer, Machine Learning Intern, Data Scientist",
    locations: "New York, NY, Remote, San Francisco, CA",
    workAuthorization: "F-1 OPT (STEM Eligible)",
    linkedin: "https://linkedin.com/in/alexrivera-ai",
    github: "https://github.com/alexrivera-columbia",
    portfolio: "https://alexrivera.dev",
    handshake: "https://columbiaengineering.joinhandshake.com/users/alexrivera",
  };

  it("prepares a discovered/queued job with tailored cover letter and pre-filled form fields", async () => {
    const job = await createJob(userId, {
      company: "Weights & Biases",
      role: "Machine Learning Intern",
      location: "San Francisco, CA",
      source: "greenhouse",
      applyUrl: "https://boards.greenhouse.io/wandb/jobs/9999",
      jobDescription: "We are seeking a Machine Learning Intern to assist with LLM evaluation benchmarks and MLOps tooling.",
      tags: ["ML", "Weights & Biases", "Greenhouse"],
    });

    // Run prepareJob
    const result = await prepareJob(userId, job.id, sampleProfile);

    expect(result.jobId).toBe(job.id);
    expect(result.coverLetterGenerated).toBe(true);
    expect(result.formDataPrefilled).toBe(true);

    // Verify job in database/store was updated
    const updatedJob = await getJob(userId, job.id);
    expect(updatedJob).not.toBeNull();
    expect(updatedJob?.status).toBe("ready_for_review");
    expect(updatedJob?.generatedCoverLetter).toBeTruthy();
    expect(updatedJob?.generatedCoverLetter).toContain("Weights & Biases");

    // Verify pre-filled application data
    const formData = updatedJob?.applicationData as Record<string, unknown>;
    expect(formData).toBeDefined();
    expect(formData.fullName).toBe("Alex Rivera");
    expect(formData.firstName).toBe("Alex");
    expect(formData.lastName).toBe("Rivera");
    expect(formData.email).toBe("alex.rivera@columbia.edu");
    expect(formData.linkedinUrl).toBe("https://linkedin.com/in/alexrivera-ai");
    expect(formData.githubUrl).toBe("https://github.com/alexrivera-columbia");
    expect(formData.handshakeUrl).toBe("https://columbiaengineering.joinhandshake.com/users/alexrivera");
    expect(formData.workAuthorization).toBe("F-1 OPT (STEM Eligible)");
    expect(formData.desiredRole).toBe("Machine Learning Intern");
    expect(formData.desiredCompany).toBe("Weights & Biases");
    expect(formData.source).toBe("greenhouse");
  });
});
