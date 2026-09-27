"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

// ─── Types ───
type JobStatus = "discovered" | "queued" | "preparing" | "ready_for_review" | "approved" | "submitted" | "rejected" | "interview" | "discarded";
type DisplayFilter = "All" | "ready_for_review" | "queued" | "preparing" | "submitted" | "discovered";
type DomainFilter = "All" | "AI_ML" | "Data_Science" | "Big_Tech" | "FinTech" | "Startups";

const ALL_FILTERS: { label: string; value: DisplayFilter }[] = [
  { label: "All Pipeline", value: "All" },
  { label: "⚡ Review First", value: "ready_for_review" },
  { label: "Queued", value: "queued" },
  { label: "Preparing", value: "preparing" },
  { label: "Submitted", value: "submitted" },
  { label: "Discovered", value: "discovered" },
];

const DOMAIN_CHIPS: { label: string; value: DomainFilter; icon: string }[] = [
  { label: "All Opportunities", value: "All", icon: "✦" },
  { label: "AI / ML Engineering", value: "AI_ML", icon: "🤖" },
  { label: "Data Science & Analytics", value: "Data_Science", icon: "📊" },
  { label: "Big Tech", value: "Big_Tech", icon: "🏛️" },
  { label: "FinTech & Quant", value: "FinTech", icon: "📈" },
  { label: "High-Growth Startups", value: "Startups", icon: "🚀" },
];

type Job = {
  id: string;
  company: string;
  role: string;
  location: string | null;
  source: string;
  sourceUrl: string | null;
  applyUrl: string | null;
  fitScore: number;
  status: JobStatus;
  tags: string[];
  accent: string;
  initials: string;
  jobDescription: string | null;
  generatedCoverLetter: string | null;
  applicationData: Record<string, unknown> | null;
  discoveredAt: string;
  submittedAt: string | null;
};

type Section = "overview" | "portals" | "documents" | "studio" | "discovery" | "applications" | "profile";

type Profile = {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  handshake: string;
  github: string;
  portfolio: string;
  targetRoles: string;
  locations: string;
  workAuthorization: string;
  coverLetterTemplate: string;
};

type DocumentItem = {
  id: string;
  name: string;
  kind: string;
  status: string;
  createdAt: string;
};

type CoverLetterItem = {
  id: string;
  name: string;
  content: string;
  companySubmittedTo: string | null;
  roleSubmittedTo: string | null;
  isTemplate: boolean;
  sourceJobId: string | null;
  createdAt: string;
};

type Portal = {
  id: string;
  name: string;
  subtitle: string;
  loginUrl: string;
  accent: string;
  initials: string;
  capability: string;
  connectionStatus: string;
};

type ActivityItem = {
  id: string;
  action: string;
  description: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type EngineStatus = {
  isRunning: boolean;
  latestRun: {
    id: string;
    status: string;
    jobsDiscovered: number;
    jobsPrepared: number;
    jobsPendingReview: number;
    jobsSubmitted: number;
    startedAt: string;
    completedAt: string | null;
    errorsCount: number;
  } | null;
  jobCounts: Record<string, number>;
};

type CareerSite = {
  company: string;
  url: string;
  category: string;
  accent: string;
  initials: string;
};

const DEFAULT_COVER_LETTER = `Dear Hiring Manager,

I am writing to express my strong interest in the {ROLE} position at {COMPANY}. As an engineer focused on Machine Learning, Artificial Intelligence, and scalable data systems, I am excited to bring my technical expertise, problem-solving drive, and product velocity to your engineering team.

My technical foundation spans deep learning architectures, statistical modeling, distributed data pipelines, and production software engineering. I have closely followed {COMPANY}'s industry leadership and high-impact engineering culture, and I am eager to contribute immediately to your upcoming milestones.

I welcome the chance to discuss how my skill set and dedication can accelerate your team's goals. Thank you for your time and consideration.

Sincerely,
{NAME}`;

const careerSites: CareerSite[] = [
  { company: "Google", url: "https://www.google.com/about/careers/applications/jobs/results", category: "Big Tech", accent: "#4285f4", initials: "G" },
  { company: "Meta", url: "https://www.metacareers.com/jobs", category: "Big Tech", accent: "#1877f2", initials: "M" },
  { company: "Apple", url: "https://jobs.apple.com/en-us/search", category: "Big Tech", accent: "#a2aaad", initials: "A" },
  { company: "Amazon", url: "https://www.amazon.jobs/en/search", category: "Big Tech", accent: "#ff9900", initials: "AZ" },
  { company: "Microsoft", url: "https://careers.microsoft.com/v2/global/en/search", category: "Big Tech", accent: "#00a4ef", initials: "MS" },
  { company: "NVIDIA", url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite", category: "Big Tech", accent: "#76b900", initials: "NV" },
  { company: "Netflix", url: "https://jobs.netflix.com/search", category: "Big Tech", accent: "#e50914", initials: "NF" },
  { company: "Anthropic", url: "https://www.anthropic.com/careers", category: "AI / ML", accent: "#d4a574", initials: "AN" },
  { company: "OpenAI", url: "https://openai.com/careers/search", category: "AI / ML", accent: "#10a37f", initials: "OA" },
  { company: "DeepMind", url: "https://deepmind.google/about/careers/", category: "AI / ML", accent: "#4a90d9", initials: "DM" },
  { company: "Scale AI", url: "https://scale.com/careers", category: "AI / ML", accent: "#6b5cff", initials: "SC" },
  { company: "Hugging Face", url: "https://apply.workable.com/huggingface/", category: "AI / ML", accent: "#ffd21e", initials: "HF" },
  { company: "Databricks", url: "https://www.databricks.com/company/careers/open-positions", category: "AI / ML", accent: "#ff3621", initials: "DB" },
  { company: "Cohere", url: "https://cohere.com/careers", category: "AI / ML", accent: "#39594d", initials: "CO" },
  { company: "Mistral AI", url: "https://mistral.ai/careers/", category: "AI / ML", accent: "#f7d046", initials: "MI" },
  { company: "Jane Street", url: "https://www.janestreet.com/join-jane-street/open-roles/", category: "FinTech & Quant", accent: "#005a9c", initials: "JS" },
  { company: "Citadel", url: "https://www.citadel.com/careers/open-opportunities/", category: "FinTech & Quant", accent: "#003b71", initials: "CD" },
  { company: "Two Sigma", url: "https://www.twosigma.com/careers/", category: "FinTech & Quant", accent: "#232d3f", initials: "TS" },
  { company: "Stripe", url: "https://stripe.com/jobs/search", category: "FinTech & Quant", accent: "#635bff", initials: "ST" },
  { company: "Robinhood", url: "https://robinhood.com/us/en/careers/openings/", category: "FinTech & Quant", accent: "#00c805", initials: "RH" },
  { company: "Bloomberg", url: "https://www.bloomberg.com/company/careers/early-career/", category: "FinTech & Quant", accent: "#414141", initials: "BB" },
  { company: "Brex", url: "https://www.brex.com/careers", category: "FinTech & Quant", accent: "#f25c05", initials: "BX" },
  { company: "Figma", url: "https://www.figma.com/careers/", category: "Startups & Growth", accent: "#f24e1e", initials: "FG" },
  { company: "Notion", url: "https://www.notion.so/careers", category: "Startups & Growth", accent: "#787878", initials: "NO" },
  { company: "Vercel", url: "https://vercel.com/careers", category: "Startups & Growth", accent: "#a0a0a0", initials: "VC" },
  { company: "Datadog", url: "https://careers.datadoghq.com/all-jobs/", category: "Startups & Growth", accent: "#632ca6", initials: "DD" },
  { company: "Snowflake", url: "https://careers.snowflake.com/us/en/search-results", category: "Startups & Growth", accent: "#29b5e8", initials: "SF" },
  { company: "Palantir", url: "https://www.palantir.com/careers/", category: "Startups & Growth", accent: "#a0a0a0", initials: "PL" },
  { company: "SpaceX", url: "https://www.spacex.com/careers/", category: "Engineering", accent: "#005288", initials: "SX" },
  { company: "Tesla", url: "https://www.tesla.com/careers/search", category: "Engineering", accent: "#cc0000", initials: "TE" },
];

function Icon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    grid: "▦", search: "⌕", file: "▤", briefcase: "▣", user: "◉", settings: "⚙",
    bell: "♢", arrow: "↗", pause: "Ⅱ", play: "▶", check: "✓", shield: "⬡",
    clock: "◷", more: "•••", close: "✕", globe: "◎", logout: "⏻", copy: "📋",
    trash: "🗑", plus: "＋", spark: "✦", activity: "◈", zap: "⚡", portal: "🔗",
    pen: "✍", robot: "🤖",
  };
  return <span aria-hidden="true">{icons[name] ?? "•"}</span>;
}

function statusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    discovered: "Discovered", queued: "Queued", preparing: "Preparing",
    ready_for_review: "Ready for Review", approved: "Approved", submitted: "Submitted",
    rejected: "Rejected", interview: "Interview", discarded: "Discarded",
  };
  return labels[status] ?? status;
}

function userInitials(name: string) {
  if (!name.trim()) return "AF";
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

function greetingTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function todayFormatted() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).toUpperCase();
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<{ userId: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Core Data
  const [jobs, setJobs] = useState<Job[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetterItem[]>([]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);

  // Navigation & Filtering
  const [activeSection, setActiveSection] = useState<Section>("overview");
  const [filter, setFilter] = useState<DisplayFilter>("All");
  const [domainFilter, setDomainFilter] = useState<DomainFilter>("All");
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [careerFilter, setCareerFilter] = useState("All");

  // State operations
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEngineStarting, setIsEngineStarting] = useState(false);
  const [engineStep, setEngineStep] = useState<number>(0);
  const [notice, setNotice] = useState("Workspace connected and verified.");
  const [profileSaved, setProfileSaved] = useState(false);

  // Profile
  const [profile, setProfile] = useState<Profile>({
    fullName: "", email: "", phone: "", linkedin: "", handshake: "", github: "", portfolio: "",
    targetRoles: "AI/ML Engineering Intern, Machine Learning Engineer, Data Science Intern, Quantitative Developer",
    locations: "New York, NY, San Francisco, CA, Remote",
    workAuthorization: "Eligible to work in the US (F-1 OPT / Citizen)",
    coverLetterTemplate: DEFAULT_COVER_LETTER,
  });

  // Review Modal State
  const [reviewingJob, setReviewingJob] = useState<Job | null>(null);
  const [editedCoverLetter, setEditedCoverLetter] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);

  // Custom Job Modal
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customForm, setCustomForm] = useState({
    company: "", role: "AI/ML Engineering Intern", location: "United States (Hybrid / Remote)", applyUrl: "", tags: "AI/ML, Internship",
  });

  // Cover Letter Corpus Modal
  const [isNewCLModalOpen, setIsNewCLModalOpen] = useState(false);
  const [newCLForm, setNewCLForm] = useState({
    name: "", companySubmittedTo: "", roleSubmittedTo: "", content: "", isTemplate: true,
  });

  // AI Studio Playground State
  const [studioTarget, setStudioTarget] = useState({
    company: "Google", role: "Machine Learning Engineering Intern", tone: "technical",
  });
  const [studioResult, setStudioResult] = useState("");
  const [isStudioGenerating, setIsStudioGenerating] = useState(false);
  const [studioSaved, setStudioSaved] = useState(false);

  // ─── Keydown (Escape) ───
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setReviewingJob(null);
        setIsCustomModalOpen(false);
        setIsNewCLModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── Authentication Check ───
  useEffect(() => {
    fetch("/api/auth/session")
      .then(async (r) => {
        if (!r.ok) { router.replace("/login"); return; }
        const d = await r.json() as { userId?: string };
        if (!d.userId) { router.replace("/login"); return; }
        setSession({ userId: d.userId });
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // ─── Load Initial Data ───
  useEffect(() => {
    if (!session) return;

    // Load workspace profile
    fetch("/api/workspace")
      .then(async (r) => {
        if (!r.ok) return;
        const d = await r.json() as { workspace?: { profile?: Profile } };
        if (d.workspace?.profile && Object.keys(d.workspace.profile).length > 0) {
          setProfile((c) => ({ ...c, ...d.workspace!.profile }));
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));

    // Load jobs
    fetch("/api/jobs").then(async (r) => {
      if (r.ok) { const d = await r.json() as { jobs: Job[] }; setJobs(d.jobs); }
    }).catch(() => undefined);

    // Load documents
    fetch("/api/documents").then(async (r) => {
      if (r.ok) { const d = await r.json() as { documents: DocumentItem[] }; setDocuments(d.documents); }
    }).catch(() => undefined);

    // Load cover letters corpus
    fetch("/api/cover-letters").then(async (r) => {
      if (r.ok) { const d = await r.json() as { coverLetters: CoverLetterItem[] }; setCoverLetters(d.coverLetters); }
    }).catch(() => undefined);

    // Load portals
    fetch("/api/portals").then(async (r) => {
      if (r.ok) { const d = await r.json() as { portals: Portal[] }; setPortals(d.portals); }
    }).catch(() => undefined);

    // Load engine status
    fetch("/api/engine/status").then(async (r) => {
      if (r.ok) { const d = await r.json() as EngineStatus; setEngineStatus(d); }
    }).catch(() => undefined);

    // Load activity audit
    fetch("/api/activity?limit=25").then(async (r) => {
      if (r.ok) { const d = await r.json() as { activities: ActivityItem[] }; setActivities(d.activities); }
    }).catch(() => undefined);
  }, [session]);

  // ─── Profile Auto-Save ───
  useEffect(() => {
    if (!hydrated || !session) return;
    fetch("/api/workspace", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace: { profile } }),
    }).catch(() => undefined);
  }, [profile, hydrated, session]);

  // ─── Derived Calculations ───
  const displayName = profile.fullName.trim() || (profile.email ? profile.email.split("@")[0] : "Candidate");
  const displayInitials = userInitials(profile.fullName || profile.email || "AF");

  const jobCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const j of jobs) counts[j.status] = (counts[j.status] ?? 0) + 1;
    return counts;
  }, [jobs]);

  const profileReadiness = useMemo(() => {
    const fields = [profile.fullName, profile.email, profile.linkedin, profile.github, profile.targetRoles, profile.locations];
    const docPoints = documents.length > 0 ? 1 : 0;
    const clPoints = coverLetters.length > 0 ? 1 : 0;
    const filled = fields.filter((f) => f.trim().length > 0).length;
    return Math.round(((filled + docPoints + clPoints) / (fields.length + 2)) * 100);
  }, [profile, documents, coverLetters]);

  // Filtered jobs with domain filter & search
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (filter !== "All" && job.status !== filter) return false;

      // Domain filtering
      if (domainFilter === "AI_ML") {
        const text = `${job.role} ${job.tags.join(" ")}`.toLowerCase();
        if (!text.includes("ai") && !text.includes("ml") && !text.includes("machine learning") && !text.includes("deep learning") && !text.includes("vision") && !text.includes("nlp")) return false;
      } else if (domainFilter === "Data_Science") {
        const text = `${job.role} ${job.tags.join(" ")}`.toLowerCase();
        if (!text.includes("data") && !text.includes("analytics") && !text.includes("scientist") && !text.includes("analysis")) return false;
      } else if (domainFilter === "Big_Tech") {
        const bigTechList = ["google", "meta", "apple", "amazon", "microsoft", "nvidia", "netflix"];
        if (!bigTechList.some((bt) => job.company.toLowerCase().includes(bt))) return false;
      } else if (domainFilter === "FinTech") {
        const fintechList = ["jane street", "citadel", "two sigma", "bloomberg", "stripe", "robinhood", "brex", "quant"];
        const text = `${job.company} ${job.tags.join(" ")}`.toLowerCase();
        if (!fintechList.some((ft) => text.includes(ft))) return false;
      } else if (domainFilter === "Startups") {
        const startupList = ["openai", "anthropic", "scale ai", "hugging face", "databricks", "mistral", "figma", "notion", "vercel"];
        const text = `${job.company} ${job.tags.join(" ")}`.toLowerCase();
        if (!startupList.some((st) => text.includes(st))) return false;
      }

      if (query) {
        const hay = `${job.company} ${job.role} ${job.location ?? ""} ${job.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }
      return true;
    });
  }, [filter, domainFilter, jobs, query]);

  const liveStats = useMemo(() => [
    { label: "Active Pipeline", value: jobs.length, change: "opportunities tracked", tone: "violet", icon: "⌁" },
    { label: "Ready for Review", value: jobCounts.ready_for_review ?? 0, change: "waiting for your check", tone: "orange", icon: "⚡" },
    { label: "Applications Sent", value: jobCounts.submitted ?? 0, change: "approved & submitted", tone: "green", icon: "✓" },
    { label: "Portals Logged In", value: portals.filter((p) => p.connectionStatus === "connected").length, change: `of ${portals.length} platforms`, tone: "blue", icon: "🔗" },
  ], [jobs, jobCounts, portals]);

  const careerCategories = useMemo(() => {
    return ["All", ...new Set(careerSites.map((s) => s.category))];
  }, []);
  const filteredCareerSites = useMemo(() => {
    return careerFilter === "All" ? careerSites : careerSites.filter((s) => s.category === careerFilter);
  }, [careerFilter]);

  // ─── Actions: Start Automation Engine ───
  async function startEngine() {
    setIsEngineStarting(true);
    setEngineStep(1);
    setNotice("Phase 1: Scanning Greenhouse, Lever, and Career Portals for AI/ML & Data Science roles…");

    try {
      // Animate progress steps for responsive feedback
      const stepTimer1 = setTimeout(() => {
        setEngineStep(2);
        setNotice("Phase 2: Calculating profile fit scores against user resume and skills…");
      }, 900);

      const stepTimer2 = setTimeout(() => {
        setEngineStep(3);
        setNotice("Phase 3: Synthesizing customized cover letters using past submissions corpus…");
      }, 1900);

      const stepTimer3 = setTimeout(() => {
        setEngineStep(4);
        setNotice("Phase 4: Pre-filling application details and staging review queue…");
      }, 2900);

      const r = await fetch("/api/engine/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      const d = await r.json() as { ok?: boolean; run?: Record<string, unknown>; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Automation engine encountered an issue.");

      setEngineStep(5);
      setNotice(`✅ Engine completed: Discovered ${d.run?.jobsDiscovered ?? 0} roles, prepared ${d.run?.jobsPrepared ?? 0} with tailored cover letters. Review queue is ready!`);

      // Refresh all lists
      const [jr, er, ar, clr] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/engine/status"),
        fetch("/api/activity?limit=25"),
        fetch("/api/cover-letters"),
      ]);

      if (jr.ok) { const jd = await jr.json() as { jobs: Job[] }; setJobs(jd.jobs); }
      if (er.ok) { const ed = await er.json() as EngineStatus; setEngineStatus(ed); }
      if (ar.ok) { const ad = await ar.json() as { activities: ActivityItem[] }; setActivities(ad.activities); }
      if (clr.ok) { const cld = await clr.json() as { coverLetters: CoverLetterItem[] }; setCoverLetters(cld.coverLetters); }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Engine run failed.");
    } finally {
      setIsEngineStarting(false);
      setTimeout(() => setEngineStep(0), 4000);
    }
  }

  // ─── Actions: Analyze URL ───
  async function handleAnalyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!url.trim()) { setNotice("Please provide a valid career board or job link."); return; }
    setIsAnalyzing(true);
    try {
      const r = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await r.json() as { jobs?: Job[]; message?: string; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Could not extract positions from that link.");
      setNotice(d.message ?? "Discovered and parsed job openings into your pipeline.");
      setUrl("");
      const jr = await fetch("/api/jobs");
      if (jr.ok) { const jd = await jr.json() as { jobs: Job[] }; setJobs(jd.jobs); }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not analyze link.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  // ─── Actions: Track Company ───
  async function trackCompany(site: CareerSite) {
    try {
      const role = profile.targetRoles?.trim() ? profile.targetRoles.split(",")[0]?.trim() : "AI/ML Engineering Intern";
      const r = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: site.company,
          role,
          source: "career_site",
          sourceUrl: site.url,
          applyUrl: site.url,
          tags: [site.category, "Internship"],
          accent: site.accent,
        }),
      });
      if (r.ok) {
        const d = await r.json() as { job: Job };
        setJobs((c) => [d.job, ...c]);
        setNotice(`✓ Added ${site.company} (${role}) to your queue.`);
      }
    } catch {
      setNotice("Could not track company.");
    }
  }

  // ─── Actions: Review & Submit ───
  function openReview(job: Job) {
    setReviewingJob(job);
    setEditedCoverLetter(job.generatedCoverLetter ?? "");
    setCopied(false);
  }

  async function generateCoverLetterForJob(jobId: string) {
    setIsGeneratingCL(true);
    try {
      const r = await fetch("/api/cover-letters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const d = await r.json() as { coverLetter?: string; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Generation failed.");
      setEditedCoverLetter(d.coverLetter ?? "");
      setNotice("AI synthesized a tailored cover letter using your resume and submission corpus!");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Cover letter generation failed.");
    } finally {
      setIsGeneratingCL(false);
    }
  }

  async function approveApplication(job: Job) {
    try {
      await fetch(`/api/jobs/${job.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverLetter: editedCoverLetter }),
      });

      // Update local state
      setJobs((c) => c.map((j) => j.id === job.id ? { ...j, status: "submitted" as JobStatus, generatedCoverLetter: editedCoverLetter, submittedAt: new Date().toISOString() } : j));

      // Refresh cover letters corpus to include newly submitted letter
      fetch("/api/cover-letters").then(async (r) => {
        if (r.ok) { const d = await r.json() as { coverLetters: CoverLetterItem[] }; setCoverLetters(d.coverLetters); }
      }).catch(() => undefined);

      setReviewingJob(null);
      setNotice(`✓ Approved and marked application for ${job.company} as Submitted! Letter added to AI learning corpus.`);
    } catch {
      setNotice("Could not submit application.");
    }
  }

  async function discardJob(jobId: string) {
    await fetch(`/api/jobs?id=${jobId}`, { method: "DELETE" }).catch(() => undefined);
    setJobs((c) => c.filter((j) => j.id !== jobId));
    setReviewingJob(null);
    setNotice("Application removed from queue.");
  }

  async function copyCoverLetter() {
    if (!editedCoverLetter) return;
    try {
      await navigator.clipboard.writeText(editedCoverLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Could not copy automatically. Select and copy manually.");
    }
  }

  // ─── Actions: Documents & Cover Letters ───
  async function addDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const isCL = file.name.toLowerCase().includes("cover");
      const r = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          kind: isCL ? "cover_letter" : "resume",
          contentText: file.type.includes("text") ? await file.text() : undefined,
        }),
      });
      if (r.ok) {
        const d = await r.json() as { document: DocumentItem };
        setDocuments((c) => [d.document, ...c]);
        setNotice(`Uploaded ${file.name}. Processed for AI context matching.`);
      }
    } catch {
      setNotice("Upload failed.");
    }
    event.target.value = "";
  }

  async function deleteDocument(docId: string) {
    await fetch(`/api/documents?id=${docId}`, { method: "DELETE" }).catch(() => undefined);
    setDocuments((c) => c.filter((d) => d.id !== docId));
    setNotice("Document deleted.");
  }

  async function handleAddCoverLetter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newCLForm.name.trim() || !newCLForm.content.trim()) {
      setNotice("Name and content are required.");
      return;
    }
    try {
      const r = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCLForm.name.trim(),
          content: newCLForm.content.trim(),
          companySubmittedTo: newCLForm.companySubmittedTo.trim() || undefined,
          roleSubmittedTo: newCLForm.roleSubmittedTo.trim() || undefined,
          isTemplate: newCLForm.isTemplate,
        }),
      });
      if (r.ok) {
        const d = await r.json() as { coverLetter: CoverLetterItem };
        setCoverLetters((c) => [d.coverLetter, ...c]);
        setIsNewCLModalOpen(false);
        setNewCLForm({ name: "", companySubmittedTo: "", roleSubmittedTo: "", content: "", isTemplate: true });
        setNotice("Cover letter added to AI learning corpus!");
      }
    } catch {
      setNotice("Could not save cover letter.");
    }
  }

  async function deleteCoverLetter(clId: string) {
    await fetch(`/api/cover-letters?id=${clId}`, { method: "DELETE" }).catch(() => undefined);
    setCoverLetters((c) => c.filter((cl) => cl.id !== clId));
    setNotice("Cover letter removed from corpus.");
  }

  // ─── Actions: AI Studio Generator ───
  async function generateStudioCoverLetter() {
    setIsStudioGenerating(true);
    setStudioSaved(false);
    try {
      const r = await fetch("/api/cover-letters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: studioTarget.company,
          role: studioTarget.role,
          tone: studioTarget.tone,
        }),
      });
      const d = await r.json() as { coverLetter?: string; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Failed to generate.");
      setStudioResult(d.coverLetter ?? "");
      setNotice(`Generated tailored cover letter for ${studioTarget.company}!`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setIsStudioGenerating(false);
    }
  }

  async function saveStudioResultToCorpus() {
    if (!studioResult) return;
    try {
      const r = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${studioTarget.company} — ${studioTarget.role}`,
          content: studioResult,
          companySubmittedTo: studioTarget.company,
          roleSubmittedTo: studioTarget.role,
          isTemplate: false,
        }),
      });
      if (r.ok) {
        const d = await r.json() as { coverLetter: CoverLetterItem };
        setCoverLetters((c) => [d.coverLetter, ...c]);
        setStudioSaved(true);
        setNotice("Saved to your Cover Letter Corpus!");
      }
    } catch {
      setNotice("Could not save to corpus.");
    }
  }

  // ─── Actions: Portals ───
  function openPortal(portal: Portal) {
    window.open(portal.loginUrl, "_blank", "noopener,noreferrer");
    setNotice(`Opened ${portal.name} in a new tab. Log in, then return here to sync session.`);
  }

  async function togglePortalConnection(portal: Portal) {
    const newStatus = portal.connectionStatus === "connected" ? "disconnected" : "connected";
    try {
      await fetch("/api/portals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: portal.id, status: newStatus }),
      });
      setPortals((c) => c.map((p) => p.id === portal.id ? { ...p, connectionStatus: newStatus } : p));
      setNotice(newStatus === "connected" ? `✓ ${portal.name} connected. Engine will use this session.` : `${portal.name} disconnected.`);
    } catch {
      setNotice("Could not update portal connection.");
    }
  }

  // ─── Actions: Manual Job Addition ───
  async function handleAddCustomJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customForm.company.trim() || !customForm.role.trim()) { setNotice("Company and role are required."); return; }
    try {
      const r = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: customForm.company.trim(),
          role: customForm.role.trim(),
          location: customForm.location.trim(),
          source: "manual",
          applyUrl: customForm.applyUrl.trim() || undefined,
          tags: customForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
          accent: "#7c67ff",
        }),
      });
      if (r.ok) {
        const d = await r.json() as { job: Job };
        setJobs((c) => [d.job, ...c]);
        setIsCustomModalOpen(false);
        setCustomForm({ company: "", role: "AI/ML Engineering Intern", location: "United States (Hybrid / Remote)", applyUrl: "", tags: "AI/ML, Internship" });
        setNotice(`✓ Added ${d.job.company} to application pipeline.`);
      }
    } catch {
      setNotice("Could not add job.");
    }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaved(true);
    setNotice("✓ Profile changes saved to secure workspace.");
    setTimeout(() => setProfileSaved(false), 2500);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
  }

  // ─── Loading Screen ───
  if (!hydrated || !session) {
    return (
      <main className="app-shell" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, color: "var(--accent)", marginBottom: 14, animation: "pulseGlow 2s ease-in-out infinite" }}>✦</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "-0.2px" }}>Connecting to StratumApply Command Center…</div>
        </div>
      </main>
    );
  }

  // ─── Render View Sections ───
  const renderWorkspacePage = () => {
    // ══════════════════════════════════════════════════════════════════
    // 1. CAREER PORTALS & ATS LOGINS HUB
    // ══════════════════════════════════════════════════════════════════
    if (activeSection === "portals") {
      return (
        <>
          <section className="subpage-hero">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />AUTHENTICATION & PORTALS</div>
              <h1>Career Portals & Sessions</h1>
              <p>Sign in to your career portals once in your browser. StratumApply securely connects through your active browser session without storing your passwords.</p>
            </div>
            <span className="privacy-chip"><Icon name="shield" /> Zero-password storage guaranteed</span>
          </section>

          <div className="portal-grid">
            {portals.map((portal) => (
              <div key={portal.id} className="portal-card">
                <div className="portal-card-top">
                  <div className="portal-logo" style={{ background: `${portal.accent}20`, color: portal.accent }}>{portal.initials}</div>
                  <div>
                    <h3>{portal.name}</h3>
                    <p>{portal.subtitle}</p>
                  </div>
                  <span className={`portal-status ${portal.connectionStatus === "connected" ? "ready" : "not-connected"}`}>
                    {portal.connectionStatus === "connected" ? "● Connected" : "○ Disconnected"}
                  </span>
                </div>
                <div className="portal-capability"><Icon name="shield" /> {portal.capability}</div>
                <div className="portal-card-actions">
                  <button className="outline-button" onClick={() => openPortal(portal)}>Sign in / Open ↗</button>
                  <button className="primary-button" onClick={() => togglePortalConnection(portal)} style={{ padding: "0 12px", height: 32, fontSize: 11 }}>
                    {portal.connectionStatus === "connected" ? "Disconnect" : "Mark Logged In ✓"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="portal-note" style={{ marginTop: 24 }}>
            <span>⬡</span>
            <div>
              <strong>How Portal Sessions Work:</strong> Click &quot;Sign in / Open&quot; to open Handshake, LinkedIn, Greenhouse, Lever, or Workday in a separate tab. Once logged in, click &quot;Mark Logged In&quot;. StratumApply coordinates with your browser session so it can automatically discover roles and prepare applications on your behalf, pausing only for your final approval.
            </div>
          </div>
        </>
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. DOCUMENTS & COVER LETTER CORPUS HUB
    // ══════════════════════════════════════════════════════════════════
    if (activeSection === "documents") {
      return (
        <>
          <section className="subpage-hero">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />APPLICATION ASSETS</div>
              <h1>Application Kit & Cover Letter Corpus</h1>
              <p>Upload your resume and all your previous cover letters. StratumApply builds an AI style profile from your submitted letters so every newly synthesized letter mirrors your voice.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="text-button" onClick={() => setIsNewCLModalOpen(true)}>＋ Add Cover Letter to Corpus</button>
              <label className="upload-button">
                <span>＋</span>Upload Resume/Doc
                <input type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={addDocument} />
              </label>
            </div>
          </section>

          <div className="documents-layout">
            <div className="documents-panel">
              <div className="subpage-section-heading">
                <h2>Uploaded Resumes & Files ({documents.length})</h2>
              </div>
              {documents.length === 0 ? (
                <div className="empty-state">
                  <div>▤</div>
                  <strong>No documents uploaded yet</strong>
                  <span>Upload your resume (PDF/DOCX/TXT). StratumApply extracts your core skills and projects for AI job matching.</span>
                </div>
              ) : (
                <div className="document-list">
                  {documents.map((doc) => (
                    <div key={doc.id} className="document-row">
                      <div className="document-icon">▤</div>
                      <div className="document-copy">
                        <strong>{doc.name}</strong>
                        <span>{doc.kind} · {relativeTime(doc.createdAt)}</span>
                      </div>
                      <span className={`document-status ${doc.status === "ready" ? "ready" : "review"}`}>
                        {doc.status === "ready" ? "AI Processed" : "Review"}
                      </span>
                      <button className="doc-delete-btn" onClick={() => deleteDocument(doc.id)} title="Remove document">🗑</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Cover Letter Corpus */}
              <div className="subpage-section-heading" style={{ marginTop: 32 }}>
                <div>
                  <h2>Cover Letter Corpus ({coverLetters.length})</h2>
                  <p>Past submitted letters & reusable templates that the AI learns from.</p>
                </div>
                <button className="small-button secondary" onClick={() => setActiveSection("studio")}>⚡ Open AI Studio</button>
              </div>

              {coverLetters.length === 0 ? (
                <div className="empty-state">
                  <div>✍</div>
                  <strong>No cover letters in corpus</strong>
                  <span>Click &quot;Add Cover Letter to Corpus&quot; to provide letters you&apos;ve submitted before. The AI will learn your phrasing and style!</span>
                </div>
              ) : (
                <div className="corpus-grid" style={{ marginTop: 12 }}>
                  {coverLetters.map((cl) => (
                    <div key={cl.id} className="corpus-card">
                      <div className="corpus-card-header">
                        <div className="corpus-card-title">{cl.name}</div>
                        <span className={`corpus-badge ${cl.isTemplate ? "template" : "submitted"}`}>
                          {cl.isTemplate ? "Template" : "Submitted"}
                        </span>
                      </div>
                      <div className="corpus-meta">
                        {cl.companySubmittedTo && <span>🏢 {cl.companySubmittedTo}</span>}
                        {cl.roleSubmittedTo && <span>• {cl.roleSubmittedTo}</span>}
                        <span style={{ marginLeft: "auto", fontSize: 10 }}>{relativeTime(cl.createdAt)}</span>
                      </div>
                      <div className="corpus-preview">{cl.content}</div>
                      <div className="corpus-actions">
                        <button className="text-button" onClick={() => {
                          setReviewingJob({
                            id: cl.id,
                            company: cl.companySubmittedTo ?? "Template View",
                            role: cl.roleSubmittedTo ?? cl.name,
                            location: null,
                            source: "corpus",
                            sourceUrl: null,
                            applyUrl: null,
                            fitScore: 100,
                            status: "approved",
                            tags: ["Cover Letter"],
                            accent: "#7c67ff",
                            initials: "CL",
                            jobDescription: null,
                            generatedCoverLetter: cl.content,
                            applicationData: null,
                            discoveredAt: cl.createdAt,
                            submittedAt: cl.isTemplate ? null : cl.createdAt,
                          });
                          setEditedCoverLetter(cl.content);
                        }}>View & Edit</button>
                        <button className="doc-delete-btn" onClick={() => deleteCoverLetter(cl.id)} title="Delete letter">🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="right-rail">
              <div className="document-next-card">
                <div style={{ fontSize: 28, color: "var(--accent)" }}>✦</div>
                <h3>Corpus-Aware AI Synthesis</h3>
                <p>Unlike generic AI tools, StratumApply accesses all cover letters you&apos;ve previously submitted. It extracts your true tone, accomplishments, and narrative voice, tailoring fresh drafts without repetitive cliches.</p>
              </div>

              <div className="rail-card" style={{ padding: 16 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>Profile Kit Checklist</h4>
                <div className="kit-list">
                  <div><span className="kit-check">{documents.length > 0 ? "✓" : "·"}</span>Resume Uploaded ({documents.length})</div>
                  <div><span className="kit-check">{coverLetters.length > 0 ? "✓" : "·"}</span>Cover Letters in Corpus ({coverLetters.length})</div>
                  <div><span className="kit-check">{profile.linkedin ? "✓" : "·"}</span>LinkedIn Profile Connected</div>
                  <div><span className="kit-check">{profile.targetRoles ? "✓" : "·"}</span>Target Roles Defined</div>
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // 3. AI COVER LETTER STUDIO
    // ══════════════════════════════════════════════════════════════════
    if (activeSection === "studio") {
      return (
        <>
          <section className="subpage-hero">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />AI WORKBENCH</div>
              <h1>AI Cover Letter Studio</h1>
              <p>Test and preview custom cover letter generation for any target company or role. Powered by your resume and corpus of past submissions.</p>
            </div>
            <button className="small-button secondary" onClick={() => setActiveSection("documents")}>View All Cover Letters</button>
          </section>

          <div className="studio-card">
            <div className="studio-header">
              <h2>Generate Tailored Cover Letter</h2>
              <span className="source-state" style={{ color: "var(--accent)", background: "var(--accent-muted)" }}>GPT-4o Engine</span>
            </div>

            <div className="studio-form-grid">
              <div>
                <label style={{ display: "block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", marginBottom: 6 }}>TARGET COMPANY</label>
                <input
                  className="login-input"
                  style={{ width: "100%" }}
                  value={studioTarget.company}
                  onChange={(e) => setStudioTarget((t) => ({ ...t, company: e.target.value }))}
                  placeholder="e.g. OpenAI, Google, Jane Street"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", marginBottom: 6 }}>TARGET ROLE</label>
                <input
                  className="login-input"
                  style={{ width: "100%" }}
                  value={studioTarget.role}
                  onChange={(e) => setStudioTarget((t) => ({ ...t, role: e.target.value }))}
                  placeholder="e.g. AI/ML Engineering Intern"
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", marginBottom: 6 }}>TONE & STYLE</label>
                <div className="tone-selector">
                  {[
                    { id: "technical", label: "ML & Tech" },
                    { id: "impact", label: "High Impact" },
                    { id: "academic", label: "Research" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      className={`tone-button${studioTarget.tone === t.id ? " active" : ""}`}
                      onClick={() => setStudioTarget((s) => ({ ...s, tone: t.id }))}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button
                className="primary-button"
                onClick={generateStudioCoverLetter}
                disabled={isStudioGenerating}
                style={{ padding: "0 18px" }}
              >
                {isStudioGenerating ? "Synthesizing with AI…" : "⚡ Generate Tailored Cover Letter"}
              </button>
            </div>

            {studioResult && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Draft Preview & Editor</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="small-button secondary" onClick={() => navigator.clipboard.writeText(studioResult)}>📋 Copy</button>
                    <button className="small-button" onClick={saveStudioResultToCorpus} disabled={studioSaved}>
                      {studioSaved ? "Saved to Corpus ✓" : "Save to Corpus"}
                    </button>
                  </div>
                </div>
                <textarea
                  className="studio-editor"
                  value={studioResult}
                  onChange={(e) => setStudioResult(e.target.value)}
                />
              </div>
            )}
          </div>
        </>
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // 4. DISCOVERY & CAREER SITES DIRECTORY
    // ══════════════════════════════════════════════════════════════════
    if (activeSection === "discovery") {
      return (
        <>
          <section className="subpage-hero">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />OPPORTUNITY RADAR</div>
              <h1>Job & ATS Discovery</h1>
              <p>Scan public ATS boards (Greenhouse, Lever) or monitor top engineering companies across Big Tech, FinTech, and AI Startups.</p>
            </div>
            <span className="hero-status"><span className="live-dot" />{engineStatus?.isRunning ? "Scanner Active" : "Radar Ready"}</span>
          </section>

          <form className="intake-bar discovery-intake" onSubmit={handleAnalyze}>
            <div className="intake-icon"><Icon name="search" /></div>
            <div className="intake-copy">
              <label htmlFor="discovery-url">Drop any job URL or Greenhouse/Lever ATS board</label>
              <input id="discovery-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://boards.greenhouse.io/... or https://jobs.lever.co/..." />
            </div>
            <button type="submit" className="primary-button" disabled={isAnalyzing}>
              {isAnalyzing ? "Analyzing…" : "Scan & Extract"} {!isAnalyzing && <Icon name="arrow" />}
            </button>
          </form>

          <div className="source-grid">
            <div className="source-card enabled">
              <span className="source-card-icon green-tint">✓</span>
              <div>
                <strong>Greenhouse Boards</strong>
                <p>Public ATS boards from high-growth tech companies.</p>
              </div>
              <span className="source-state">Live</span>
            </div>
            <div className="source-card enabled">
              <span className="source-card-icon green-tint">✓</span>
              <div>
                <strong>Lever Job Sites</strong>
                <p>Automated listing extraction and job spec analysis.</p>
              </div>
              <span className="source-state">Live</span>
            </div>
            <div className="source-card manual">
              <span className="source-card-icon blue-tint">◎</span>
              <div>
                <strong>30+ Tech & FinTech Giants</strong>
                <p>One-click direct queueing for Big Tech & Quant firms.</p>
              </div>
              <span className="source-state">Track</span>
            </div>
          </div>

          <div className="subpage-section-heading">
            <div>
              <h2>Tracked Companies Directory</h2>
              <p>Click &quot;＋&quot; on any company to immediately add its engineering openings to your queue.</p>
            </div>
          </div>

          <div className="career-filter-bar">
            {careerCategories.map((cat) => (
              <button key={cat} className={`filter-tab${careerFilter === cat ? " active" : ""}`} onClick={() => setCareerFilter(cat)}>
                {cat}
              </button>
            ))}
          </div>

          <div className="career-grid">
            {filteredCareerSites.map((site) => (
              <div key={site.company} className="career-card-wrap">
                <a href={site.url} target="_blank" rel="noopener noreferrer" className="career-card">
                  <div className="career-logo" style={{ background: `${site.accent}20`, color: site.accent }}>{site.initials}</div>
                  <div className="career-info">
                    <strong>{site.company}</strong>
                    <span>{site.category}</span>
                  </div>
                  <span className="career-arrow">↗</span>
                </a>
                <button className="career-track-btn" onClick={() => trackCompany(site)} title={`Track ${site.company}`}>＋</button>
              </div>
            ))}
          </div>
        </>
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // 5. APPLICATIONS PIPELINE TRACKER
    // ══════════════════════════════════════════════════════════════════
    if (activeSection === "applications") {
      const appJobs = jobs.filter((j) => ["submitted", "approved", "interview", "rejected"].includes(j.status));
      return (
        <>
          <section className="subpage-hero">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />APPLICATION PIPELINE</div>
              <h1>Submitted & Tracked Applications</h1>
              <p>{appJobs.length} applications submitted or in active interview stages.</p>
            </div>
            <button className="primary-button" onClick={() => setActiveSection("overview")}>Back to Queue</button>
          </section>

          <div className="full-application-panel">
            {appJobs.length === 0 ? (
              <div className="empty-state">
                <div>▣</div>
                <strong>No submitted applications yet</strong>
                <span>Review and approve prepared jobs in your Application Queue to populate your submissions pipeline.</span>
              </div>
            ) : (
              <div className="application-table">
                {appJobs.map((job) => (
                  <div key={job.id} className="application-table-row">
                    <div className="company-logo" style={{ background: `${job.accent}20`, color: job.accent }}>{job.initials}</div>
                    <div>
                      <strong>{job.role}</strong>
                      <span>{job.company} · {job.location ?? "United States"}</span>
                    </div>
                    <span className={`status-pill ${job.status}`}>{statusLabel(job.status)}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                      {job.submittedAt ? relativeTime(job.submittedAt) : "—"}
                    </span>
                    <button className="small-button secondary" onClick={() => openReview(job)}>Review Dossier</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // 6. PROFILE & IDENTITY SETTINGS
    // ══════════════════════════════════════════════════════════════════
    if (activeSection === "profile") {
      return (
        <>
          <section className="subpage-hero">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />CANDIDATE IDENTITY</div>
              <h1>Profile & Targeting Settings</h1>
              <p>Configure personal details, work authorization, target roles, and default template variables for autofill.</p>
            </div>
            <span className="readiness-score">{profileReadiness}% Profile Ready</span>
          </section>

          <form className="profile-form" onSubmit={saveProfile}>
            <div className="form-card">
              <div className="subpage-section-heading"><h2>Candidate Information</h2></div>
              <div className="form-grid">
                <label>FULL NAME<input value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} placeholder="Your full name" /></label>
                <label>EMAIL ADDRESS<input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="you@domain.com" /></label>
                <label>PHONE NUMBER<input value={profile.phone ?? ""} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" /></label>
                <label>WORK AUTHORIZATION<input value={profile.workAuthorization} onChange={(e) => setProfile((p) => ({ ...p, workAuthorization: e.target.value }))} placeholder="US Citizen, F-1 OPT, Green Card" /></label>
                <label>LINKEDIN URL<input value={profile.linkedin} onChange={(e) => setProfile((p) => ({ ...p, linkedin: e.target.value }))} placeholder="linkedin.com/in/username" /></label>
                <label>HANDSHAKE PROFILE<input value={profile.handshake} onChange={(e) => setProfile((p) => ({ ...p, handshake: e.target.value }))} placeholder="columbiaengineering.joinhandshake.com/..." /></label>
                <label>GITHUB<input value={profile.github} onChange={(e) => setProfile((p) => ({ ...p, github: e.target.value }))} placeholder="github.com/username" /></label>
                <label>PORTFOLIO WEBSITE<input value={profile.portfolio} onChange={(e) => setProfile((p) => ({ ...p, portfolio: e.target.value }))} placeholder="yoursite.dev" /></label>
              </div>
            </div>

            <div className="form-card">
              <div className="subpage-section-heading"><h2>Targeting Strategy</h2></div>
              <div className="form-grid">
                <label className="wide-field">TARGET ROLES (Comma-separated)<input value={profile.targetRoles} onChange={(e) => setProfile((p) => ({ ...p, targetRoles: e.target.value }))} placeholder="AI/ML Intern, Data Science Intern, SWE Intern" /></label>
                <label className="wide-field">PREFERRED LOCATIONS<input value={profile.locations} onChange={(e) => setProfile((p) => ({ ...p, locations: e.target.value }))} placeholder="New York, NY, San Francisco, CA, Remote" /></label>
              </div>
            </div>

            <div className="form-card">
              <div className="subpage-section-heading"><h2>Master Cover Letter Fallback Template</h2></div>
              <div className="form-grid">
                <label className="wide-field">
                  TEMPLATE CONTENT (Variables: {"{COMPANY}"}, {"{ROLE}"}, {"{NAME}"})
                  <textarea className="cover-letter-textarea" value={profile.coverLetterTemplate} onChange={(e) => setProfile((p) => ({ ...p, coverLetterTemplate: e.target.value }))} />
                </label>
              </div>
            </div>

            <div className="form-actions">
              <span>{profileSaved ? "✓ Profile saved to encrypted workspace" : "Changes auto-sync to your secure database"}</span>
              <button type="submit" className="primary-button">{profileSaved ? "Saved ✓" : "Save Changes"}</button>
            </div>
          </form>
        </>
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // 7. OVERVIEW / MISSION CONTROL DASHBOARD (DEFAULT)
    // ══════════════════════════════════════════════════════════════════
    return (
      <>
        {/* Page Intro Banner */}
        <section className="page-intro">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" />{todayFormatted()} • AI AGENT ACTIVE</div>
            <h1>{greetingTime()}, {displayName}.</h1>
            <p>Your AI-powered application command center. The engine discovers opportunities, curates customized cover letters, and stages applications for your review.</p>
          </div>

          <button className="run-toggle" onClick={startEngine} disabled={isEngineStarting}>
            <div className={`run-icon${isEngineStarting ? " running" : ""}`}>
              {isEngineStarting ? (
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>◎</span>
              ) : (
                <Icon name="play" />
              )}
            </div>
            <div>
              <strong>{isEngineStarting ? "Automation Running…" : "START AUTOMATION ENGINE"}</strong>
              <small>{isEngineStarting ? "Processing discovery & prep" : "Scan portals & stage applications"}</small>
            </div>
            <span className="toggle-chevron">›</span>
          </button>
        </section>

        {/* Engine Pipeline Progression Indicator */}
        {(isEngineStarting || engineStep > 0) && (
          <div className="pipeline-deck">
            <div className="pipeline-header">
              <div className="pipeline-title">
                <span style={{ color: "var(--accent)", fontSize: 16 }}>⚡</span>
                <h3>Live Engine Pipeline Execution</h3>
              </div>
              <span className="live-badge"><span className="live-dot" /> Autonomous Agent Active</span>
            </div>
            <div className="pipeline-steps">
              {[
                { num: "01", name: "Scan Portals", desc: "Greenhouse, Lever, Handshake", icon: "🌐", step: 1 },
                { num: "02", name: "Fit Scoring", desc: "AI/ML, Data Science matching", icon: "🤖", step: 2 },
                { num: "03", name: "Curate Letters", desc: "Learns from past submissions", icon: "✍", step: 3 },
                { num: "04", name: "Pre-fill Forms", desc: "Staging candidate dossiers", icon: "📋", step: 4 },
                { num: "05", name: "Human Review", desc: "Your final click to submit", icon: "🛡️", step: 5 },
              ].map((s) => (
                <div key={s.step} className={`pipeline-step ${engineStep === s.step ? "active" : engineStep > s.step ? "complete" : ""}`}>
                  <div className="step-top">
                    <span className="step-num">{s.num}</span>
                    <span className="step-icon">{s.icon}</span>
                  </div>
                  <div className="step-name">{s.name}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Intake Bar */}
        <form className="intake-bar" onSubmit={handleAnalyze}>
          <div className="intake-icon"><Icon name="search" /></div>
          <div className="intake-copy">
            <label htmlFor="url-input">Drop any public job link or career ATS board</label>
            <input id="url-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste any Greenhouse, Lever, Workday, or direct job posting URL…" />
          </div>
          <button type="submit" className="primary-button" disabled={isAnalyzing}>
            {isAnalyzing ? "Analyzing…" : "Analyze"} {!isAnalyzing && <Icon name="arrow" />}
          </button>
        </form>

        {notice && (
          <div className="notice-strip subpage-notice">
            <span className="notice-check"><Icon name="check" /></span>
            {notice}
            <button onClick={() => setNotice("")}><Icon name="close" /></button>
          </div>
        )}

        {/* Live Metrics Grid */}
        <div className="stats-grid">
          {liveStats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className={`stat-icon ${stat.tone}`}>{stat.icon}</div>
              <div className="stat-data">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.change}</small>
              </div>
              <span className="stat-arrow">↗</span>
            </div>
          ))}
        </div>

        {/* Domain Filter Bar */}
        <div className="domain-filter-bar">
          {DOMAIN_CHIPS.map((chip) => (
            <button
              key={chip.value}
              className={`domain-chip${domainFilter === chip.value ? " active" : ""}`}
              onClick={() => setDomainFilter(chip.value)}
            >
              <span className="domain-chip-icon">{chip.icon}</span>
              {chip.label}
            </button>
          ))}
        </div>

        {/* Section Heading */}
        <div className="section-heading">
          <div>
            <h2>Application Queue</h2>
            <p>{filteredJobs.length} opportunities currently matched to your profile</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="text-button" onClick={() => setIsCustomModalOpen(true)}>＋ Add Job Manually</button>
            <button className="text-button" onClick={() => setActiveSection("discovery")}>Browse Tech Directory ↗</button>
          </div>
        </div>

        {/* Queue Layout */}
        <div className="queue-layout">
          <div className="queue-panel">
            <div className="queue-toolbar">
              <div className="filter-tabs">
                {ALL_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={`filter-tab${filter === f.value ? " active" : ""}`}
                    onClick={() => setFilter(f.value)}
                  >
                    {f.label}{f.value !== "All" && <span>{jobCounts[f.value] ?? 0}</span>}
                  </button>
                ))}
              </div>
              <div className="queue-search">
                <Icon name="search" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter queue…" />
              </div>
            </div>

            <div className="job-list">
              {filteredJobs.length === 0 ? (
                <div className="empty-state">
                  <div>⌁</div>
                  <strong>No jobs match your filter</strong>
                  <span>Click &quot;START AUTOMATION ENGINE&quot; to scan across AI/ML engineering, Data Science, and Quantitative roles at 30+ top tech companies.</span>
                </div>
              ) : (
                filteredJobs.map((job) => (
                  <div key={job.id} className="job-card">
                    <div className="company-logo" style={{ background: `${job.accent}20`, color: job.accent }}>
                      {job.initials}
                    </div>
                    <div className="job-main">
                      <div className="job-topline">
                        <h3>{job.role}</h3>
                        <span className={`status-pill ${job.status}`}>{statusLabel(job.status)}</span>
                      </div>
                      <div className="company-line">
                        <strong>{job.company}</strong> · {job.location ?? "United States"}
                      </div>
                      <div className="job-bottomline">
                        <span className="source-label-small">
                          <span className={`mini-source-dot ${job.source === "manual" ? "manual" : "approved"}`} />
                          {job.source}
                        </span>
                        {job.tags.slice(0, 3).map((t) => <span key={t} className="tag">{t}</span>)}
                      </div>
                    </div>
                    <div className="job-fit">
                      <span>MATCH</span>
                      <strong className={job.fitScore >= 80 ? "high-fit" : job.fitScore >= 60 ? "mid-fit" : "low-fit"}>
                        {job.fitScore}%
                      </strong>
                    </div>
                    <div className="job-actions">
                      {job.status === "ready_for_review" ? (
                        <button className="small-button" onClick={() => openReview(job)}>Review & Submit</button>
                      ) : (
                        <button className="small-button secondary" onClick={() => openReview(job)}>View Dossier</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Rail Dashboard Intel */}
          <div className="right-rail">
            {/* Portals Status Card */}
            <div className="rail-card run-card">
              <div className="rail-card-heading">
                <div>
                  <span className="card-kicker">PORTALS & SESSIONS</span>
                  <h3>Active Logins</h3>
                </div>
                <button className="small-button secondary" onClick={() => setActiveSection("portals")} style={{ padding: "2px 8px", fontSize: 10 }}>Manage</button>
              </div>
              <div className="run-breakdown" style={{ marginTop: 12 }}>
                {portals.slice(0, 5).map((p) => (
                  <div key={p.id}>
                    <span className="breakdown-dot" style={{ background: p.connectionStatus === "connected" ? "var(--green)" : "var(--text-muted)" }} />
                    {p.name}
                    <strong style={{ color: p.connectionStatus === "connected" ? "var(--green)" : "var(--text-muted)" }}>
                      {p.connectionStatus === "connected" ? "Connected" : "Inactive"}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile & Corpus Readiness Card */}
            <div className="rail-card profile-card">
              <div className="rail-card-heading">
                <div>
                  <span className="card-kicker">AI LEARNING CONTEXT</span>
                  <h3>Application Kit</h3>
                </div>
                <span className="readiness-score">{profileReadiness}% Ready</span>
              </div>
              <div className="progress-track"><span style={{ width: `${profileReadiness}%` }} /></div>
              <div className="kit-list">
                <div>
                  <span className="kit-check">{documents.length > 0 ? "✓" : "·"}</span>
                  Resume Uploaded
                  {documents.length === 0 && <button onClick={() => setActiveSection("documents")}>Upload</button>}
                </div>
                <div>
                  <span className="kit-check">{coverLetters.length > 0 ? "✓" : "·"}</span>
                  Cover Letter Corpus ({coverLetters.length})
                  {coverLetters.length === 0 && <button onClick={() => setActiveSection("documents")}>Add</button>}
                </div>
                <div>
                  <span className="kit-check">{profile.fullName ? "✓" : "·"}</span>
                  Full Name & Contact
                  {!profile.fullName && <button onClick={() => setActiveSection("profile")}>Set</button>}
                </div>
                <div>
                  <span className="kit-check">{profile.targetRoles ? "✓" : "·"}</span>
                  Target Roles Configured
                  {!profile.targetRoles && <button onClick={() => setActiveSection("profile")}>Set</button>}
                </div>
              </div>
              <button className="outline-button" onClick={() => setActiveSection("documents")} style={{ marginTop: 14 }}>
                Manage Documents & Corpus ↗
              </button>
            </div>

            {/* Guardrail Guarantee */}
            <div className="rail-card guardrail-card">
              <div className="guardrail-icon"><Icon name="shield" /></div>
              <div>
                <h3>100% Human-in-the-Loop</h3>
                <p>StratumApply discovers, matches, and curates customized cover letters, but pauses before submission. You inspect and give final approval.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        {activities.length > 0 && (
          <>
            <div className="section-heading">
              <div>
                <h2>Engine Activity Audit</h2>
                <p>Live execution history and background automation log</p>
              </div>
            </div>
            <div className="full-application-panel">
              <div className="application-table">
                {activities.slice(0, 6).map((a) => (
                  <div key={a.id} className="application-table-row" style={{ gridTemplateColumns: "38px 1fr 1fr 100px" }}>
                    <div className="stat-icon violet" style={{ width: 30, height: 30, fontSize: 12 }}>◈</div>
                    <div><strong>{a.description}</strong></div>
                    <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                      {a.details?.company as string ?? ""}{a.details?.role ? ` — ${a.details.role as string}` : ""}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>
                      {relativeTime(a.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">✦</div>
          <div>
            <div className="brand-name">Stratum<span>Apply</span></div>
            <div className="brand-subtitle">Multi-Portal Command Center</div>
          </div>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">{displayInitials}</div>
          <div className="workspace-copy">
            <strong>{profile.fullName || "Candidate Workspace"}</strong>
            <span>{profile.email || "AI/ML & Data Engineering"}</span>
          </div>
          <span className="chevron">›</span>
        </div>

        <div className="nav-section-label">COMMAND CENTER</div>
        <nav className="main-nav">
          {[
            { id: "overview" as Section, icon: "grid", label: "Mission Control", count: null },
            { id: "portals" as Section, icon: "portal", label: "Portal Logins", count: portals.filter((p) => p.connectionStatus === "connected").length || null },
            { id: "documents" as Section, icon: "file", label: "Documents & Corpus", count: coverLetters.length || null },
            { id: "studio" as Section, icon: "pen", label: "AI Cover Letter Studio", count: null },
            { id: "discovery" as Section, icon: "search", label: "Job Radar & ATS", count: null },
            { id: "applications" as Section, icon: "briefcase", label: "Submissions Pipeline", count: jobCounts.submitted ?? null },
            { id: "profile" as Section, icon: "user", label: "Targeting & Profile", count: null },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item${activeSection === item.id ? " active" : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.count !== null && item.count > 0 && <b>{item.count}</b>}
            </button>
          ))}
        </nav>

        <div className="nav-section-label source-label">PORTAL CHANNELS</div>
        <div className="source-list">
          <div className="source-row"><span className="source-dot green-dot" />Handshake & LinkedIn<span>active</span></div>
          <div className="source-row"><span className="source-dot green-dot" />Greenhouse & Lever<span>active</span></div>
          <div className="source-row"><span className="source-dot blue-dot" />Tech & FinTech Directory<span>30+</span></div>
        </div>

        <div className="sidebar-footer">
          <nav className="main-nav">
            <button className="nav-item logout-nav" onClick={logout}>
              <Icon name="logout" /> Sign out
            </button>
          </nav>
          <div className="privacy-note">
            <span><Icon name="shield" /></span>
            <span>Client-controlled browser session. Your data stays in your personal workspace.</span>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            StratumApply <i>›</i> <strong>{activeSection === "overview" ? "Mission Control" : activeSection[0].toUpperCase() + activeSection.slice(1)}</strong>
          </div>
          <div className="topbar-actions">
            <div className="sync-status"><span className="live-dot" />Database Synced</div>
            <button className="icon-button"><Icon name="bell" /><span className="notification-dot" /></button>
            <div className="top-avatar">{displayInitials}</div>
          </div>
        </header>

        <div className="content-wrap">
          {renderWorkspacePage()}

          <footer className="page-footer">
            <span><span className="footer-spark">✦</span> StratumApply v2 — Intelligent Human-in-the-Loop Job Application Engine</span>
            <button onClick={() => setActiveSection("portals")}>Manage Connected Portals</button>
          </footer>
        </div>
      </main>

      {/* ── DUAL PANE REVIEW & SUBMISSION MODAL ── */}
      {reviewingJob && (
        <div className="review-overlay" onClick={(e) => { if (e.target === e.currentTarget) setReviewingJob(null); }}>
          <div className="review-panel" style={{ maxWidth: 940 }}>
            <div className="review-header">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" />APPLICATION REVIEW DOSSIER</div>
                <h2>{reviewingJob.role}</h2>
                <div className="review-company">
                  <strong>{reviewingJob.company}</strong> · {reviewingJob.location ?? "United States (Hybrid / Remote)"}
                </div>
              </div>
              <button className="review-close" onClick={() => setReviewingJob(null)}><Icon name="close" /></button>
            </div>

            <div className="review-split-body">
              {/* Left Column: Job Intelligence & Form Pre-fills */}
              <div className="review-col-left">
                <div className="fit-breakdown">
                  <strong>{reviewingJob.fitScore}%</strong>
                  <div>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>AI Profile Alignment</h4>
                    <p>Candidate background in AI/ML & engineering matches requirements for this position.</p>
                  </div>
                </div>

                <div className="review-meta-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="review-meta-item">
                    <span className="review-meta-label">STATUS</span>
                    <span className={`status-pill ${reviewingJob.status}`}>{statusLabel(reviewingJob.status)}</span>
                  </div>
                  <div className="review-meta-item">
                    <span className="review-meta-label">SOURCE</span>
                    <span style={{ fontSize: 11, fontWeight: 600 }}>{reviewingJob.source}</span>
                  </div>
                </div>

                <div className="prefill-card">
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Pre-filled Application Data</h4>
                  <div className="prefill-grid">
                    <div className="prefill-item">
                      <strong>CANDIDATE NAME</strong>
                      <span>{profile.fullName || "Not provided"}</span>
                    </div>
                    <div className="prefill-item">
                      <strong>EMAIL ADDRESS</strong>
                      <span>{profile.email || "Not provided"}</span>
                    </div>
                    <div className="prefill-item">
                      <strong>LINKEDIN</strong>
                      <span>{profile.linkedin || "linkedin.com"}</span>
                    </div>
                    <div className="prefill-item">
                      <strong>WORK AUTHORIZATION</strong>
                      <span>{profile.workAuthorization || "US Citizen / OPT"}</span>
                    </div>
                  </div>
                </div>

                {reviewingJob.tags.length > 0 && (
                  <div className="review-section">
                    <h3>Domain & Tech Tags</h3>
                    <div className="review-tags">
                      {reviewingJob.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                    </div>
                  </div>
                )}

                {(reviewingJob.applyUrl || reviewingJob.sourceUrl) && (
                  <div className="review-section">
                    <h3>Direct Application Links</h3>
                    <div className="review-links">
                      {reviewingJob.applyUrl && (
                        <a href={reviewingJob.applyUrl} target="_blank" rel="noopener noreferrer">
                          Open {reviewingJob.company} Job Application ↗
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Tailored Cover Letter Editor */}
              <div className="review-col-right">
                <div className="review-section-header">
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Tailored Cover Letter</h3>
                    <p className="review-cl-note" style={{ margin: "2px 0 0" }}>Synthesized from your resume and submission corpus. Edit freely before approving.</p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="review-copy-btn"
                      onClick={() => generateCoverLetterForJob(reviewingJob.id)}
                      disabled={isGeneratingCL}
                    >
                      {isGeneratingCL ? "Synthesizing…" : "⚡ Regenerate with AI"}
                    </button>
                    <button className={`review-copy-btn${copied ? " copied" : ""}`} onClick={copyCoverLetter}>
                      <Icon name="copy" /> {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                <textarea
                  className="review-cover-editor"
                  style={{ minHeight: 340 }}
                  value={editedCoverLetter}
                  onChange={(e) => setEditedCoverLetter(e.target.value)}
                  placeholder="Click 'Regenerate with AI' or paste your cover letter here..."
                />
              </div>
            </div>

            <div className="review-footer">
              <button className="review-discard-btn" onClick={() => discardJob(reviewingJob.id)}>
                <Icon name="trash" /> Remove Job
              </button>
              <div className="review-footer-actions">
                {reviewingJob.applyUrl && (
                  <a href={reviewingJob.applyUrl} target="_blank" rel="noopener noreferrer" className="small-button secondary" style={{ textDecoration: "none" }}>
                    Open External Portal ↗
                  </a>
                )}
                {reviewingJob.status !== "submitted" && (
                  <button className="primary-button review-approve" onClick={() => approveApplication(reviewingJob)}>
                    <Icon name="check" /> Approve & Mark Submitted
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MANUAL ADD JOB MODAL ── */}
      {isCustomModalOpen && (
        <div className="review-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsCustomModalOpen(false); }}>
          <div className="review-panel" style={{ maxWidth: 520 }}>
            <div className="review-header">
              <div><h2>Add Opportunity Manually</h2></div>
              <button className="review-close" onClick={() => setIsCustomModalOpen(false)}><Icon name="close" /></button>
            </div>
            <form className="review-body" onSubmit={handleAddCustomJob}>
              <div className="custom-modal-grid">
                <label>COMPANY NAME<input value={customForm.company} onChange={(e) => setCustomForm((f) => ({ ...f, company: e.target.value }))} placeholder="e.g. OpenAI" required /></label>
                <label>ROLE TITLE<input value={customForm.role} onChange={(e) => setCustomForm((f) => ({ ...f, role: e.target.value }))} placeholder="e.g. Machine Learning Engineer Intern" required /></label>
                <label>LOCATION<input value={customForm.location} onChange={(e) => setCustomForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. New York, NY / Remote" /></label>
                <label>APPLICATION URL<input value={customForm.applyUrl} onChange={(e) => setCustomForm((f) => ({ ...f, applyUrl: e.target.value }))} placeholder="https://..." /></label>
                <label>TAGS (COMMA-SEPARATED)<input value={customForm.tags} onChange={(e) => setCustomForm((f) => ({ ...f, tags: e.target.value }))} placeholder="AI/ML, Summer 2025, Internship" /></label>
              </div>
              <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="small-button secondary" onClick={() => setIsCustomModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button">Add to Application Queue</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD COVER LETTER TO CORPUS MODAL ── */}
      {isNewCLModalOpen && (
        <div className="review-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsNewCLModalOpen(false); }}>
          <div className="review-panel" style={{ maxWidth: 640 }}>
            <div className="review-header">
              <div>
                <h2>Add Cover Letter to AI Corpus</h2>
                <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 4 }}>
                  Provide cover letters you&apos;ve previously submitted. The AI analyzes your writing style and accomplishments to curate new letters accordingly.
                </p>
              </div>
              <button className="review-close" onClick={() => setIsNewCLModalOpen(false)}><Icon name="close" /></button>
            </div>
            <form className="review-body" onSubmit={handleAddCoverLetter}>
              <div className="custom-modal-grid">
                <label>IDENTIFIER / TITLE<input value={newCLForm.name} onChange={(e) => setNewCLForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Google ML Intern 2024" required /></label>
                <label>COMPANY SUBMITTED TO<input value={newCLForm.companySubmittedTo} onChange={(e) => setNewCLForm((f) => ({ ...f, companySubmittedTo: e.target.value }))} placeholder="e.g. Google" /></label>
                <label>ROLE SUBMITTED TO<input value={newCLForm.roleSubmittedTo} onChange={(e) => setNewCLForm((f) => ({ ...f, roleSubmittedTo: e.target.value }))} placeholder="e.g. Software Engineering Intern" /></label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 20 }}>
                  <input type="checkbox" checked={newCLForm.isTemplate} onChange={(e) => setNewCLForm((f) => ({ ...f, isTemplate: e.target.checked }))} />
                  <span>Mark as reusable template</span>
                </label>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ display: "block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", marginBottom: 6 }}>COVER LETTER CONTENT</label>
                <textarea
                  className="review-cover-editor"
                  style={{ minHeight: 220 }}
                  value={newCLForm.content}
                  onChange={(e) => setNewCLForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Paste your past cover letter text here..."
                  required
                />
              </div>
              <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="small-button secondary" onClick={() => setIsNewCLModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button">Add to Learning Corpus</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
