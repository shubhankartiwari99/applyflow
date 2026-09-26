import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type NormalizedJob = {
  id: number;
  company: string;
  role: string;
  location: string;
  source: string;
  sourceType: "Approved source";
  fit: number;
  posted: string;
  status: "Queued";
  tags: string[];
  accent: string;
  initials: string;
};

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "JO";
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function sourceFromUrl(input: URL) {
  if (input.hostname === "boards.greenhouse.io" || input.hostname === "job-boards.greenhouse.io") return "greenhouse";
  if (input.hostname === "jobs.lever.co") return "lever";
  return null;
}

function greenhouseToken(input: URL) {
  const queryToken = input.searchParams.get("for");
  if (queryToken) return queryToken;
  const segments = input.pathname.split("/").filter(Boolean);
  if (segments[0] === "embed") return null;
  return segments[0] ?? null;
}

async function discoverGreenhouse(input: URL): Promise<NormalizedJob[]> {
  const token = greenhouseToken(input);
  if (!token) throw new Error("We could not find a Greenhouse board token in that URL.");
  const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Greenhouse returned ${response.status}.`);
  const payload = await response.json() as { jobs?: Array<Record<string, unknown>> };
  const company = String(payload.jobs?.[0]?.company_name ?? token);
  return (payload.jobs ?? []).slice(0, 80).map((job, index) => {
    const location = typeof job.location === "object" && job.location !== null ? String((job.location as { name?: string }).name ?? "Location not listed") : "Location not listed";
    const departments = Array.isArray(job.departments) ? job.departments.map((item) => typeof item === "object" && item !== null ? String((item as { name?: string }).name ?? "") : "").filter(Boolean) : [];
    const title = String(job.title ?? "Untitled role");
    return {
      id: Date.now() + index,
      company,
      role: title,
      location,
      source: "Greenhouse",
      sourceType: "Approved source",
      fit: 0,
      posted: "new from source",
      status: "Queued",
      tags: [...departments.slice(0, 2), title.toLowerCase().includes("intern") ? "Internship" : "New role"],
      accent: "#6b5cff",
      initials: initials(company),
    } satisfies NormalizedJob;
  });
}

async function discoverLever(input: URL): Promise<NormalizedJob[]> {
  const site = input.pathname.split("/").filter(Boolean)[0];
  if (!site) throw new Error("We could not find a Lever site name in that URL.");
  const response = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(site)}?mode=json`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(`Lever returned ${response.status}.`);
  const payload = await response.json() as Array<Record<string, unknown>>;
  return payload.slice(0, 80).map((job, index) => {
    const categories = typeof job.categories === "object" && job.categories !== null ? job.categories as { location?: string; team?: string; commitment?: string } : {};
    const company = site.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    const title = String(job.text ?? "Untitled role");
    return {
      id: Date.now() + index,
      company,
      role: title,
      location: String(categories.location ?? "Location not listed"),
      source: "Lever",
      sourceType: "Approved source",
      fit: 0,
      posted: "new from source",
      status: "Queued",
      tags: [categories.team, categories.commitment, title.toLowerCase().includes("intern") ? "Internship" : "New role"].filter(Boolean) as string[],
      accent: "#27a889",
      initials: initials(company),
    } satisfies NormalizedJob;
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { url?: unknown };
    if (typeof body.url !== "string" || !body.url.trim()) {
      return NextResponse.json({ error: "A job URL is required." }, { status: 400 });
    }

    const input = new URL(body.url.trim());
    const source = sourceFromUrl(input);
    if (source === "greenhouse") {
      const jobs = await discoverGreenhouse(input);
      return NextResponse.json({ source, jobs, message: `${jobs.length} public Greenhouse roles added to the review queue.` });
    }
    if (source === "lever") {
      const jobs = await discoverLever(input);
      return NextResponse.json({ source, jobs, message: `${jobs.length} public Lever roles added to the review queue.` });
    }

    return NextResponse.json({
      source: "manual-review",
      jobs: [],
      message: "This source needs manual review. We saved the link without crawling it.",
      preview: stripHtml(input.href),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "We could not analyze that link.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
