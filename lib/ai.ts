/**
 * AI integration layer — abstracts LLM calls for cover letter generation
 * and job description analysis.
 *
 * Currently supports OpenAI (GPT-4o). Add OPENAI_API_KEY to .env.
 * Falls back to template-based generation if no API key is configured.
 */

export type CoverLetterGenerationInput = {
  company: string;
  role: string;
  jobDescription: string | null;
  resumeText: string;
  coverLetterContext: string;   // all user's previous cover letters
  profileSummary: string;       // name, target roles, work auth, etc.
};

export type CoverLetterGenerationResult = {
  coverLetter: string;
  model: string;
  tokensUsed: number;
};

export type FitScoreInput = {
  resumeText: string;
  jobDescription: string;
  targetRoles: string[];
};

export type FitScoreResult = {
  score: number;         // 0-100
  reasoning: string;
  model: string;
};

/**
 * Check if AI generation is available (API key configured).
 */
export function isAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Generate a tailored cover letter for a specific job.
 *
 * If OpenAI is not configured, falls back to simple template substitution.
 */
export async function generateCoverLetter(input: CoverLetterGenerationInput): Promise<CoverLetterGenerationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackCoverLetter(input);
  }

  const systemPrompt = `You are an expert career counselor and cover letter writer. Your task is to write a tailored, compelling cover letter.

RULES:
1. The letter MUST be personalized for the specific company and role
2. Draw from the user's resume to highlight RELEVANT skills and experience
3. Match the user's existing writing style (see their previous cover letters below)
4. Do NOT repeat the exact same phrasing from previously submitted cover letters
5. Keep it under 400 words
6. Be genuine and specific — avoid generic corporate language
7. Format: greeting, 3-4 paragraphs, closing with the user's name
8. If the job description is provided, reference specific requirements from it`;

  const userPrompt = `Write a cover letter for the following opportunity:

COMPANY: ${input.company}
ROLE: ${input.role}
${input.jobDescription ? `\nJOB DESCRIPTION:\n${input.jobDescription.slice(0, 3000)}` : ""}

USER'S PROFILE:
${input.profileSummary}

USER'S RESUME:
${input.resumeText.slice(0, 4000)}

${input.coverLetterContext ? `\nUSER'S EXISTING COVER LETTERS (for style reference — do NOT copy directly):\n${input.coverLetterContext.slice(0, 4000)}` : ""}

Write the cover letter now. Return ONLY the letter text, no explanations.`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status}`, errorText);
      return fallbackCoverLetter(input);
    }

    const result = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens: number };
      model: string;
    };

    return {
      coverLetter: result.choices[0]?.message?.content?.trim() ?? fallbackCoverLetter(input).coverLetter,
      model: result.model,
      tokensUsed: result.usage?.total_tokens ?? 0,
    };
  } catch (error) {
    console.error("OpenAI call failed:", error);
    return fallbackCoverLetter(input);
  }
}

/**
 * Calculate fit score: how well does a job match the user's profile?
 *
 * Falls back to keyword-based scoring if AI is unavailable.
 */
export async function calculateFitScore(input: FitScoreInput): Promise<FitScoreResult> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackFitScore(input);
  }

  const prompt = `Score how well this job matches the candidate's profile on a 0-100 scale.

CANDIDATE'S RESUME (summarized):
${input.resumeText.slice(0, 2000)}

CANDIDATE'S TARGET ROLES: ${input.targetRoles.join(", ")}

JOB DESCRIPTION:
${input.jobDescription.slice(0, 2000)}

Respond with JSON only: {"score": <number>, "reasoning": "<1-2 sentences>"}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return fallbackFitScore(input);

    const result = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      model: string;
    };

    const parsed = JSON.parse(result.choices[0]?.message?.content ?? "{}") as { score?: number; reasoning?: string };
    return {
      score: Math.min(100, Math.max(0, parsed.score ?? 50)),
      reasoning: parsed.reasoning ?? "Score calculated by AI",
      model: result.model,
    };
  } catch {
    return fallbackFitScore(input);
  }
}

// ─── Fallbacks (no AI key) ───

function fallbackCoverLetter(input: CoverLetterGenerationInput): CoverLetterGenerationResult {
  const name = extractName(input.profileSummary);

  const letter = `Dear Hiring Manager,

I am writing to express my strong interest in the ${input.role} position at ${input.company}. As a candidate pursuing high-impact engineering and analytics roles, I am eager to contribute my technical foundation, problem-solving ability, and collaborative drive to your team.

Throughout my experience, I have developed solutions across machine learning, software engineering, and large-scale data workflows. I have followed ${input.company}'s technical direction closely and believe my background and proactive mindset align well with this position.

I would welcome the opportunity to discuss how my skill set and dedication can support ${input.company}'s upcoming milestones. Thank you for your time and consideration.

Sincerely,
${name}`;

  return { coverLetter: letter, model: "template-fallback", tokensUsed: 0 };
}

function fallbackFitScore(input: FitScoreInput): FitScoreResult {
  const jdLower = input.jobDescription.toLowerCase();
  const resumeLower = input.resumeText.toLowerCase();

  // Simple keyword overlap scoring
  const keywords = ["machine learning", "ai", "data science", "python", "tensorflow", "pytorch",
    "intern", "software engineer", "deep learning", "nlp", "computer vision", "sql",
    "react", "typescript", "node", "aws", "gcp", "docker", "kubernetes", "go", "rust",
    "fintech", "startup", "full stack", "backend", "frontend", "api", "microservices"];

  let matches = 0;
  let total = 0;
  for (const kw of keywords) {
    if (jdLower.includes(kw)) {
      total++;
      if (resumeLower.includes(kw)) matches++;
    }
  }

  // Also check target roles
  for (const role of input.targetRoles) {
    if (jdLower.includes(role.toLowerCase())) {
      matches += 2;
      total += 2;
    }
  }

  const score = total > 0 ? Math.round((matches / total) * 100) : 70;
  return {
    score: Math.min(98, Math.max(40, score)),
    reasoning: `Keyword match: ${matches}/${total} relevant terms found in job description match your resume`,
    model: "keyword-fallback",
  };
}

function extractName(profileSummary: string): string {
  const nameMatch = profileSummary.match(/Name:\s*(.+)/i);
  return nameMatch?.[1]?.trim() ?? "Your Name";
}
