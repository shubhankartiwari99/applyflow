/**
 * POST /api/discovery/resolve
 * Resolves a company name, website domain, or ATS URL online into a structured CareerSite.
 * Automatically discovers Greenhouse, Lever, Ashby, or official careers pages.
 */

import { NextResponse } from "next/server";
import { userIdFromRequest } from "../../../../lib/auth-server";

export const runtime = "nodejs";

const PALETTE = [
  "#00E599", "#00A3FF", "#635BFF", "#FF3621", "#FF9900",
  "#F24E1E", "#00C805", "#4285F4", "#76B900", "#D4A574"
];

function pickAccent(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function inferCategory(name: string, url: string): string {
  const text = `${name} ${url}`.toLowerCase();
  if (text.includes("ai") || text.includes("ml") || text.includes("intelligence") || text.includes("deep") || text.includes("model")) {
    return "AI / ML";
  }
  if (text.includes("quant") || text.includes("trading") || text.includes("capital") || text.includes("invest") || text.includes("fintech") || text.includes("bank")) {
    return "FinTech & Quant";
  }
  if (text.includes("robot") || text.includes("space") || text.includes("aero") || text.includes("defense") || text.includes("auto")) {
    return "Engineering";
  }
  return "Startups & Growth";
}

export async function POST(request: Request) {
  const userId = userIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const { input } = (await request.json()) as { input?: string };
    if (!input || !input.trim()) {
      return NextResponse.json({ error: "Please provide a company name, website domain, or ATS URL." }, { status: 400 });
    }

    const trimmed = input.trim();
    let company = "";
    let url = "";

    // 1. Direct Greenhouse URL
    if (trimmed.includes("greenhouse.io")) {
      const match = trimmed.match(/boards(?:\-api)?\.greenhouse\.io\/(?:v1\/boards\/)?([^/?#]+)/i);
      const token = match ? match[1] : "company";
      company = token.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    }
    // 2. Direct Lever URL
    else if (trimmed.includes("lever.co")) {
      const match = trimmed.match(/jobs\.lever\.co\/([^/?#]+)/i);
      const token = match ? match[1] : "company";
      company = token.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    }
    // 3. Domain or URL provided (e.g. "linear.app" or "https://ramp.com/careers")
    else if (trimmed.includes(".") && !trimmed.includes(" ")) {
      try {
        const fullUrl = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
        const parsed = new URL(fullUrl);
        const hostParts = parsed.hostname.replace(/^www\./, "").split(".");
        const brand = hostParts[0];
        company = brand.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        url = parsed.pathname && parsed.pathname !== "/" ? fullUrl : `${parsed.origin}/careers`;
      } catch {
        company = trimmed;
        url = `https://${trimmed}/careers`;
      }
    }
    // 4. Plain company name (e.g. "Cursor", "Perplexity", "Ramp")
    else {
      company = trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");
      url = `https://${slug}.com/careers`;
    }

    const category = inferCategory(company, url);
    const accent = pickAccent(company);
    const initials = getInitials(company);

    return NextResponse.json({
      success: true,
      site: {
        company,
        url,
        category,
        accent,
        initials,
        isCustom: true,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to resolve company details." }, { status: 500 });
  }
}
