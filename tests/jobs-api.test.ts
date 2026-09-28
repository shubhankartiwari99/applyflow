import { describe, it, expect } from "vitest";
import { PUT, PATCH } from "../app/api/jobs/[id]/route";
import { POST as postDocument } from "../app/api/documents/route";
import { createJob, getJob } from "../lib/jobs";
import { signValue } from "../lib/auth-crypto";
import { SESSION_COOKIE } from "../lib/auth-server";

function makeAuthCookie(userId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const payload = `${userId}.${expiresAt}`;
  const sig = signValue(payload);
  return `${SESSION_COOKIE}=${payload}.${sig}`;
}

describe("Jobs and Documents API handlers", () => {
  const userId = "test_user_api_1";

  it("updates a job using PUT", async () => {
    const job = await createJob(userId, {
      company: "Scale AI",
      role: "Forward Deployed Engineer",
      source: "greenhouse",
    });

    const cookie = makeAuthCookie(userId);
    const request = new Request(`http://localhost:3000/api/jobs/${job.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        generatedCoverLetter: "Tailored letter for Scale AI",
        status: "queued",
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: job.id }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.job.generatedCoverLetter).toBe("Tailored letter for Scale AI");
    expect(data.job.status).toBe("queued");
  });

  it("exports PATCH and handles updates identically to PUT", async () => {
    const job = await createJob(userId, {
      company: "Figma",
      role: "Systems Engineer",
      source: "lever",
    });

    const cookie = makeAuthCookie(userId);
    const request = new Request(`http://localhost:3000/api/jobs/${job.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie,
      },
      body: JSON.stringify({
        generatedCoverLetter: "Attached cover letter from studio",
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: job.id }) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.job.generatedCoverLetter).toBe("Attached cover letter from studio");
  });

  it("extracts text from multipart/form-data upload in /api/documents", async () => {
    const cookie = makeAuthCookie(userId);
    const formData = new FormData();
    const file = new File(
      ["Shubhankar Tiwari\nColumbia University\nSkills: TypeScript, Python, PyTorch"],
      "resume.txt",
      { type: "text/plain" }
    );
    formData.append("file", file);
    formData.append("name", "resume.txt");
    formData.append("kind", "resume");

    const request = new Request("http://localhost:3000/api/documents", {
      method: "POST",
      headers: {
        cookie,
      },
      body: formData,
    });

    const response = await postDocument(request);
    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.document.name).toBe("resume.txt");
    expect(data.document.kind).toBe("resume");
    expect(data.document.contentText).toContain("Columbia University");
  });

  it("resets all user jobs when calling DELETE /api/jobs?all=true", async () => {
    const resetUser = "user_reset_test";
    await createJob(resetUser, { company: "Notion", role: "SWE", source: "greenhouse" });
    await createJob(resetUser, { company: "Linear", role: "Design", source: "lever" });

    const cookie = makeAuthCookie(resetUser);
    const { DELETE: deleteJobs } = await import("../app/api/jobs/route");

    const req = new Request("http://localhost:3000/api/jobs?all=true", {
      method: "DELETE",
      headers: { cookie },
    });

    const res = await deleteJobs(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.jobsDeleted).toBeGreaterThanOrEqual(2);

    const checkJob = await getJob(resetUser, "nonexistent");
    expect(checkJob).toBeNull();
  });
});

