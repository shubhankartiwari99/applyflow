/**
 * Cover letter file extractor & metadata parser.
 * Extracts clean text from PDF, DOCX, TXT, and Markdown files,
 * and automatically infers company, role, and title.
 */

const KNOWN_COMPANIES = [
  "Google", "DeepMind", "Meta", "Facebook", "Microsoft", "Apple", "Amazon", "AWS",
  "Netflix", "Palantir", "OpenAI", "Anthropic", "Stripe", "Databricks", "Snowflake",
  "Jane Street", "Citadel", "Two Sigma", "Jump Trading", "DE Shaw", "D.E. Shaw",
  "Bloomberg", "Hudson River Trading", "HRT", "Robinhood", "Uber", "Airbnb",
  "Spotify", "TikTok", "ByteDance", "NVIDIA", "AMD", "Intel", "Qualcomm",
  "Salesforce", "ServiceNow", "Coinbase", "DoorDash", "Pinterest", "Figma"
];

const KNOWN_ROLES = [
  "Software Engineering Intern", "Software Engineer Intern", "SWE Intern",
  "Machine Learning Intern", "ML Intern", "AI Engineer Intern", "AI Research Intern",
  "Data Science Intern", "Quantitative Research Intern", "Quantitative Researcher",
  "Quantitative Trader", "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
  "Software Engineer", "Systems Engineer", "Research Scientist Intern"
];

/**
 * Extract raw text from an uploaded file buffer (supports PDF, DOCX, TXT, MD).
 */
export async function extractTextFromFileBuffer(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<string> {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const mime = (mimeType || "").toLowerCase();

  // 1. PDF extraction via unpdf
  if (ext === "pdf" || mime.includes("pdf")) {
    try {
      const { extractText } = await import("unpdf");
      const result = await extractText(new Uint8Array(buffer));
      const extracted = Array.isArray(result.text) ? result.text.join("\n\n") : String(result.text || "");
      if (extracted.trim().length > 20) {
        return cleanExtractedText(extracted);
      }
    } catch (err) {
      console.warn("unpdf extraction failed, trying plain text fallback:", err);
    }
  }

  // 2. DOCX extraction via mammoth
  if (ext === "docx" || mime.includes("wordprocessingml")) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      if (result.value && result.value.trim().length > 20) {
        return cleanExtractedText(result.value);
      }
    } catch (err) {
      console.warn("mammoth extraction failed:", err);
    }
  }

  // 3. Plain text / Markdown / UTF-8 fallback
  try {
    const text = buffer.toString("utf-8");
    // Check if it's mostly printable characters
    if (/^[\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]*$/.test(text.slice(0, 1000))) {
      return cleanExtractedText(text);
    }
  } catch {
    // ignore
  }

  // 4. Binary stream fallback: strip non-printable characters for text stream
  const str = buffer.toString("latin1").replace(/[^\x20-\x7E\n\r\t]/g, " ");
  return cleanExtractedText(str);
}

/**
 * Remove strange artifacts, multiple blank lines, and null bytes.
 */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\0/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Infer metadata (title, company, role, isTemplate) from filename and content.
 */
export function inferCoverLetterMetadata(
  filename: string,
  content: string
): { title: string; company?: string; role?: string; isTemplate: boolean } {
  const baseName = filename.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
  const searchCorpus = `${baseName} \n ${content.slice(0, 800)}`;

  // Find Company
  let foundCompany: string | undefined;
  for (const comp of KNOWN_COMPANIES) {
    const rx = new RegExp(`\\b${comp.replace(".", "\\.")}\\b`, "i");
    if (rx.test(searchCorpus)) {
      foundCompany = comp;
      break;
    }
  }

  // If not in known list, look for patterns like "Dear [Company] Team" or "at [Company]"
  if (!foundCompany) {
    const dearMatch = content.match(/Dear\s+(?:the\s+)?([A-Z][a-zA-Z0-9&]{2,20})\s+(?:Team|Hiring|Recruiting|Committee)/i);
    if (dearMatch && dearMatch[1] && !["Hiring", "Recruiting", "Team"].includes(dearMatch[1])) {
      foundCompany = dearMatch[1];
    }
  }

  // Find Role
  let foundRole: string | undefined;
  for (const role of KNOWN_ROLES) {
    const rx = new RegExp(`\\b${role.replace("/", "\\/")}\\b`, "i");
    if (rx.test(searchCorpus)) {
      foundRole = role;
      break;
    }
  }

  if (!foundRole) {
    const roleMatch = content.match(/(?:application for|applying for|interested in)\s+(?:the\s+)?([A-Za-z/ ]{4,35}(?:Intern|Engineer|Scientist|Developer|Analyst|Researcher))/i);
    if (roleMatch && roleMatch[1]) {
      foundRole = roleMatch[1].trim();
    }
  }

  // Create clean title
  let title = baseName
    .split(" ")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .trim();

  if (!title || title.toLowerCase() === "cover letter") {
    if (foundCompany && foundRole) {
      title = `${foundCompany} - ${foundRole}`;
    } else if (foundCompany) {
      title = `${foundCompany} Cover Letter`;
    } else {
      title = "Extracted Cover Letter";
    }
  }

  const isTemplate = content.includes("{COMPANY}") || content.includes("{ROLE}") || !foundCompany;

  return {
    title,
    company: foundCompany,
    role: foundRole,
    isTemplate,
  };
}
