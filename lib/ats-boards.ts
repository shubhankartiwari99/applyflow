/**
 * Public Greenhouse / Lever board tokens for companies in the career directory.
 * Handshake, LinkedIn, and Workday are not public job APIs — those stay as
 * login bookmarks, not engine sources.
 */

export type AtsBoard = {
  company: string;
  greenhouse?: string;
  lever?: string;
};

export const ATS_BOARDS: AtsBoard[] = [
  { company: "Stripe", greenhouse: "stripe" },
  { company: "Airbnb", greenhouse: "airbnb" },
  { company: "Discord", greenhouse: "discord" },
  { company: "Figma", greenhouse: "figma" },
  { company: "Notion", greenhouse: "notion" },
  { company: "Vercel", greenhouse: "vercel" },
  { company: "Cloudflare", greenhouse: "cloudflare" },
  { company: "Datadog", greenhouse: "datadog" },
  { company: "Reddit", greenhouse: "reddit" },
  { company: "Robinhood", greenhouse: "robinhood" },
  { company: "Coinbase", greenhouse: "coinbase" },
  { company: "Anthropic", greenhouse: "anthropic" },
  { company: "OpenAI", greenhouse: "openai" },
  { company: "Scale AI", greenhouse: "scaleai" },
  { company: "Databricks", greenhouse: "databricks" },
  { company: "Plaid", greenhouse: "plaid" },
  { company: "Brex", greenhouse: "brex" },
  { company: "Ramp", greenhouse: "ramp" },
  { company: "Affirm", greenhouse: "affirm" },
  { company: "DoorDash", greenhouse: "doordash" },
  { company: "Instacart", greenhouse: "instacart" },
  { company: "Dropbox", greenhouse: "dropbox" },
  { company: "Slack", greenhouse: "slack" },
  { company: "Twilio", greenhouse: "twilio" },
  { company: "Shopify", greenhouse: "shopify" },
  { company: "Square", greenhouse: "squareup" },
  { company: "Block / Square", greenhouse: "squareup" },
  { company: "Pinterest", greenhouse: "pinterest" },
  { company: "Snap", greenhouse: "snapchat" },
  { company: "Spotify", greenhouse: "spotify" },
  { company: "Palantir", greenhouse: "palantirtech" },
  { company: "Anduril Industries", greenhouse: "andurilindustries" },
  { company: "Scale AI", greenhouse: "scaleai" },
  { company: "Hugging Face", lever: "huggingface" },
  { company: "Canva", lever: "canva" },
  { company: "Notion", lever: "notion" },
  { company: "Linear", lever: "linear" },
  { company: "Retool", lever: "retool" },
  { company: "Supabase", lever: "supabase" },
  { company: "Postman", lever: "postman" },
  { company: "GitLab", lever: "gitlab" },
  { company: "Netflix", lever: "netflix" },
  { company: "Twitch", lever: "twitch" },
  { company: "Lyft", lever: "lyft" },
  { company: "Uber", lever: "uber" },
];

export type ParsedBoard =
  | { kind: "greenhouse"; token: string }
  | { kind: "lever"; token: string };

export function parseJobBoardUrl(raw: string): ParsedBoard | null {
  let url: URL;
  try {
    url = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io" || host === "boards-api.greenhouse.io") {
    const queryToken = url.searchParams.get("for");
    if (queryToken) return { kind: "greenhouse", token: queryToken };
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments[0] === "v1" && segments[1] === "boards" && segments[2]) {
      return { kind: "greenhouse", token: segments[2] };
    }
    if (segments[0] && segments[0] !== "embed") {
      return { kind: "greenhouse", token: segments[0] };
    }
    return null;
  }

  if (host === "jobs.lever.co" || host === "api.lever.co") {
    const segments = url.pathname.split("/").filter(Boolean);
    const site = host === "api.lever.co" && segments[0] === "v0" && segments[1] === "postings"
      ? segments[2]
      : segments[0];
    if (site) return { kind: "lever", token: site };
  }

  return null;
}

export function boardsForCompany(company: string): AtsBoard[] {
  const lower = company.toLowerCase();
  return ATS_BOARDS.filter((b) => b.company.toLowerCase() === lower || lower.includes(b.company.toLowerCase()) || b.company.toLowerCase().includes(lower));
}
