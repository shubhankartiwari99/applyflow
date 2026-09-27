import { describe, it, expect } from "vitest";
import { createJob } from "../lib/jobs";
import { scoreJob, getTopJobs } from "../lib/engine-matcher";
import type { UserProfile } from "../lib/types";

describe("engine-matcher fit score calculation", () => {
  const userId = "user_matcher_test_1";

  const profile: UserProfile = {
    fullName: "Jordan Lee",
    email: "jordan.lee@columbia.edu",
    targetRoles: "AI Engineer, Machine Learning Intern, Data Science",
    locations: "New York, NY, Remote",
    workAuthorization: "US Citizen",
    linkedin: "https://linkedin.com/in/jordanlee",
    github: "https://github.com/jordanlee",
  };

  it("calculates a high fit score for matching role, internship, and location", async () => {
    const job = await createJob(userId, {
      company: "Google",
      role: "Machine Learning Intern",
      location: "New York, NY",
      source: "handshake",
    });

    const result = await scoreJob(userId, job.id, profile);
    expect(result.jobId).toBe(job.id);
    expect(result.fitScore).toBeGreaterThanOrEqual(80);
    expect(result.reasoning).toContain("Role matches target");
    expect(result.reasoning).toContain("Internship role matches preference");
    expect(result.reasoning).toContain("Premium employer");
  });

  it("calculates a lower fit score for non-matching roles and locations", async () => {
    const uId = "user_matcher_test_2";
    const job = await createJob(uId, {
      company: "Generic Retailer",
      role: "Store Operations Associate",
      location: "Dallas, TX",
      source: "manual",
    });

    const result = await scoreJob(uId, job.id, profile);
    expect(result.fitScore).toBeLessThan(60);
  });

  it("ranks top jobs by descending fit score", async () => {
    const uId = "user_matcher_test_3";
    const j1 = await createJob(uId, { company: "Company A", role: "AI Intern", source: "lever", fitScore: 85 });
    const j2 = await createJob(uId, { company: "Company B", role: "ML Engineer", source: "greenhouse", fitScore: 95 });
    const j3 = await createJob(uId, { company: "Company C", role: "Cashier", source: "manual", fitScore: 40 });

    const top = await getTopJobs(uId, 10, 60);
    expect(top.length).toBe(2);
    expect(top[0].fitScore).toBe(95);
    expect(top[1].fitScore).toBe(85);
  });
});
