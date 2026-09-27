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
  baseCoverLetter?: string;     // user's attached current cover letter/template
  tone?: "technical" | "impact" | "quantitative" | "academic" | "standard";
  customFocus?: string;         // specific skills/projects to emphasize
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
 * Generate a tailored cover letter for a specific job, tied to the candidate's profile
 * and adapted from their attached base cover letter.
 */
export async function generateCoverLetter(input: CoverLetterGenerationInput): Promise<CoverLetterGenerationResult> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackCoverLetter(input);
  }

  const toneGuidelines: Record<string, string> = {
    technical: "Focus heavily on deep technical architecture, ML frameworks, systems engineering, optimization, and code craftsmanship.",
    impact: "Focus on rapid execution, ownership, product metrics, user scale, and proactive 0-to-1 delivery.",
    quantitative: "Focus on empirical rigor, statistical validation, mathematical formulation, and measurable performance benchmarks.",
    academic: "Focus on foundational research, academic inquiry, Columbia University coursework, and literature-grounded problem solving.",
    standard: "Balanced professional narrative connecting background to company mission.",
  };

  const selectedTone = input.tone ?? "technical";
  const toneInstruction = toneGuidelines[selectedTone] ?? toneGuidelines.technical;

  const systemPrompt = `You are StratumApply's Elite Career Intelligence Synthesizer.
Your goal is to write a highly tailored, compelling, and authentic cover letter for a top-tier candidate applying to a specific job.

CRITICAL INSTRUCTIONS:
1. TARGET ALIGNMENT: Tailor every paragraph directly to ${input.company} and the ${input.role} position.
2. ATTACHED COVER LETTER INSPIRATION: If the user provided their CURRENT ATTACHED COVER LETTER below, adopt their authentic voice, past project achievements, and narrative flow. Do NOT write a generic cookie-cutter letter.
3. PROFILE CONTEXT: Incorporate the candidate's background, education (e.g. Columbia University if specified), and technical skill set.
4. TONE DIRECTIVE (${selectedTone.toUpperCase()}): ${toneInstruction}
${input.customFocus ? `5. CUSTOM EMPHASIS: Ensure special focus on: ${input.customFocus}` : ""}
6. STRUCTURE:
   - Compelling hook addressing ${input.company}'s engineering/product challenges and enthusiasm for ${input.role}.
   - 2 concise body paragraphs demonstrating concrete technical accomplishments and direct alignment with requirements.
   - Impactful forward-looking closing paragraph requesting a discussion, signed with the candidate's name.
7. Length: 280-380 words. High signal-to-noise ratio. Zero corporate buzzwords.`;

  const userPrompt = `TARGET OPPORTUNITY:
- Company: ${input.company}
- Role: ${input.role}
${input.jobDescription ? `- Job Description / Requirements:\n${input.jobDescription.slice(0, 3000)}` : ""}

CANDIDATE PROFILE:
${input.profileSummary}

${input.baseCoverLetter ? `CURRENT ATTACHED BASE COVER LETTER (USE AS PRIMARY VOICE & ACCOMPLISHMENTS FOUNDATION):\n${input.baseCoverLetter.slice(0, 3500)}\n` : ""}

${input.resumeText ? `RESUME CONTEXT / KEY SKILLS:\n${input.resumeText.slice(0, 2500)}\n` : ""}

${input.coverLetterContext ? `PRIOR SUBMISSIONS CORPUS (Style Reference):\n${input.coverLetterContext.slice(0, 2000)}\n` : ""}

Write the complete tailored cover letter now. Output ONLY the letter text with no conversational preamble or markdown headers.`;

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
        temperature: 0.65,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status}`, errorText);
      return fallbackCoverLetter(input);
    }

    const result = (await response.json()) as {
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
  const isColumbia =
    input.profileSummary.toLowerCase().includes("columbia") ||
    input.resumeText.toLowerCase().includes("columbia") ||
    (input.baseCoverLetter && input.baseCoverLetter.toLowerCase().includes("columbia"));
  const institution = isColumbia ? "Columbia University" : "my academic and engineering program";

  let bodyParagraphs: string[] = [];

  if (input.baseCoverLetter && input.baseCoverLetter.trim().length > 80) {
    // Clean and split user's attached cover letter into substantive paragraphs
    const rawParagraphs = input.baseCoverLetter
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 50 && !/^(dear|sincerely|best regards|regards|thank you|hello)/i.test(p));

    if (rawParagraphs.length >= 1) {
      // Adapt the candidate's own attached paragraphs directly, injecting the target role and company where relevant
      bodyParagraphs = rawParagraphs.slice(0, 2).map((p) => {
        return p
          .replace(/\[Company\]|\{COMPANY\}/gi, input.company)
          .replace(/\[Role\]|\{ROLE\}/gi, input.role);
      });
    }
  }

  // Tone-specific focal paragraph
  let toneParagraph = "";
  if (input.tone === "technical") {
    toneParagraph = `In my technical projects at ${institution}, I have concentrated heavily on high-throughput systems, distributed architectures, and robust model evaluation. Whether training multi-layered models in PyTorch or optimizing low-latency data pipelines, I prioritize clean architectural modularity, verifiable correctness, and performance under production constraints. I am especially drawn to ${input.company}'s engineering culture and look forward to diving directly into your codebase to ship impactful, production-grade solutions for the ${input.role} role.`;
  } else if (input.tone === "impact") {
    toneParagraph = `Throughout my work at ${institution}, my primary driver has been 0-to-1 execution and customer-facing impact. I thrive in fast-paced environments where ambiguous product specifications must be rapidly translated into battle-tested software. Joining ${input.company} as a ${input.role} offers an exciting platform where I can take complete ownership of mission-critical milestones and deliver measurable value to your team.`;
  } else if (input.tone === "quantitative") {
    toneParagraph = `My engineering foundation at ${institution} is rooted in mathematical rigor, statistical modeling, and empirical benchmarking. I approach problem-solving by establishing objective metrics, testing algorithmic hypotheses under stress conditions, and driving optimization from first principles. I am eager to apply this analytical discipline to the quantitative and engineering challenges tackled by ${input.company}'s ${input.role} team.`;
  } else if (input.tone === "academic") {
    toneParagraph = `My academic trajectory at ${institution} has emphasized foundational theory and novel applied research in modern computational methods. Engaging deeply with cutting-edge literature and experimental validation has trained me to synthesize complex papers and translate theoretical advancements into practical software. I would be thrilled to bring this dedication to research excellence to ${input.company} in the ${input.role} position.`;
  } else {
    toneParagraph = `At ${institution}, I have developed a strong technical foundation spanning machine learning, modern software engineering, and large-scale data workflows. Having followed ${input.company}'s trajectory closely, I admire your approach to engineering excellence and believe my proactive problem-solving mindset makes me a natural contributor for this role.`;
  }

  const opening = `Dear Hiring Team at ${input.company},

I am writing to express my enthusiastic application for the ${input.role} position. As an engineer at ${institution} dedicated to building high-performance systems and intelligent algorithms, I have long admired ${input.company}'s technical innovations and mission.`;

  // Combine candidate's adapted paragraphs with the tone-aligned paragraph
  const combinedBody =
    bodyParagraphs.length > 0
      ? bodyParagraphs.join("\n\n") + "\n\n" + toneParagraph
      : toneParagraph;

  const closing = `I would welcome the opportunity to discuss how my technical background, collaborative energy, and passion for engineering can support ${input.company}'s upcoming milestones. Thank you for your time, consideration, and review of my application dossier.

Sincerely,
${name}`;

  const fullLetter = `${opening}\n\n${combinedBody}\n\n${closing}`;

  return {
    coverLetter: fullLetter,
    model: input.baseCoverLetter ? "attached-letter-synthesizer" : "template-fallback",
    tokensUsed: 0,
  };
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
