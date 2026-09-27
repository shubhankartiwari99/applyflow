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
  isCustom?: boolean;
};

const DEFAULT_COVER_LETTER = `Dear Hiring Manager,

I am writing to express my strong interest in the {ROLE} position at {COMPANY}. As an engineer focused on Machine Learning, Artificial Intelligence, and scalable data systems, I am excited to bring my technical expertise, problem-solving drive, and product velocity to your engineering team.

My technical foundation spans deep learning architectures, statistical modeling, distributed data pipelines, and production software engineering. I have closely followed {COMPANY}'s industry leadership and high-impact engineering culture, and I am eager to contribute immediately to your upcoming milestones.

I welcome the chance to discuss how my skill set and dedication can accelerate your team's goals. Thank you for your time and consideration.

Sincerely,
{NAME}`;

const careerSites: CareerSite[] = [
  // Big Tech & Cloud Infrastructure
  { company: "Google", url: "https://www.google.com/about/careers/applications/jobs/results", category: "Big Tech", accent: "#4285f4", initials: "G" },
  { company: "Meta", url: "https://www.metacareers.com/jobs", category: "Big Tech", accent: "#1877f2", initials: "M" },
  { company: "Apple", url: "https://jobs.apple.com/en-us/search", category: "Big Tech", accent: "#a2aaad", initials: "A" },
  { company: "Amazon", url: "https://www.amazon.jobs/en/search", category: "Big Tech", accent: "#ff9900", initials: "AZ" },
  { company: "Microsoft", url: "https://careers.microsoft.com/v2/global/en/search", category: "Big Tech", accent: "#00a4ef", initials: "MS" },
  { company: "NVIDIA", url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite", category: "Big Tech", accent: "#76b900", initials: "NV" },
  { company: "Netflix", url: "https://jobs.netflix.com/search", category: "Big Tech", accent: "#e50914", initials: "NF" },
  { company: "Intel", url: "https://jobs.intel.com/en/search-jobs", category: "Big Tech", accent: "#0071c5", initials: "IN" },
  { company: "AMD", url: "https://careers.amd.com/careers-home", category: "Big Tech", accent: "#ed1c24", initials: "AMD" },
  { company: "Cloudflare", url: "https://www.cloudflare.com/careers/jobs/", category: "Big Tech", accent: "#f38020", initials: "CF" },
  { company: "Salesforce", url: "https://careers.salesforce.com/en/", category: "Big Tech", accent: "#00a1e0", initials: "SF" },
  { company: "Adobe", url: "https://careers.adobe.com/us/en", category: "Big Tech", accent: "#ff0000", initials: "AD" },
  { company: "Oracle", url: "https://www.oracle.com/corporate/careers/", category: "Big Tech", accent: "#f80000", initials: "OR" },
  { company: "Cisco", url: "https://jobs.cisco.com/jobs/SearchJobs", category: "Big Tech", accent: "#1ba0d7", initials: "CS" },

  // AI / ML Giants & Frontier Labs
  { company: "OpenAI", url: "https://openai.com/careers/search", category: "AI / ML", accent: "#10a37f", initials: "OA" },
  { company: "Anthropic", url: "https://www.anthropic.com/careers", category: "AI / ML", accent: "#d4a574", initials: "AN" },
  { company: "DeepMind", url: "https://deepmind.google/about/careers/", category: "AI / ML", accent: "#4a90d9", initials: "DM" },
  { company: "Cursor / Anysphere", url: "https://www.cursor.com/careers", category: "AI / ML", accent: "#5865f2", initials: "CU" },
  { company: "Perplexity AI", url: "https://www.perplexity.ai/careers", category: "AI / ML", accent: "#22b8cd", initials: "PX" },
  { company: "Scale AI", url: "https://scale.com/careers", category: "AI / ML", accent: "#6b5cff", initials: "SC" },
  { company: "Hugging Face", url: "https://apply.workable.com/huggingface/", category: "AI / ML", accent: "#ffd21e", initials: "HF" },
  { company: "Databricks", url: "https://www.databricks.com/company/careers/open-positions", category: "AI / ML", accent: "#ff3621", initials: "DB" },
  { company: "Cohere", url: "https://cohere.com/careers", category: "AI / ML", accent: "#39594d", initials: "CO" },
  { company: "Mistral AI", url: "https://mistral.ai/careers/", category: "AI / ML", accent: "#f7d046", initials: "MI" },
  { company: "Runway", url: "https://runwayml.com/careers/", category: "AI / ML", accent: "#00e599", initials: "RW" },
  { company: "ElevenLabs", url: "https://elevenlabs.io/careers", category: "AI / ML", accent: "#ffffff", initials: "EL" },
  { company: "Midjourney", url: "https://www.midjourney.com/careers", category: "AI / ML", accent: "#8e44ad", initials: "MJ" },
  { company: "Character.AI", url: "https://character.ai/careers", category: "AI / ML", accent: "#29b6f6", initials: "CA" },
  { company: "Stability AI", url: "https://stability.ai/careers", category: "AI / ML", accent: "#9b59b6", initials: "SA" },
  { company: "Together AI", url: "https://www.together.ai/careers", category: "AI / ML", accent: "#00c2ff", initials: "TG" },
  { company: "Replicate", url: "https://replicate.com/careers", category: "AI / ML", accent: "#e91e63", initials: "RP" },
  { company: "Pinecone", url: "https://www.pinecone.io/careers/", category: "AI / ML", accent: "#0047ff", initials: "PC" },
  { company: "Weights & Biases", url: "https://wandb.ai/careers", category: "AI / ML", accent: "#ffbe00", initials: "WB" },
  { company: "LangChain", url: "https://www.langchain.com/careers", category: "AI / ML", accent: "#2ecc71", initials: "LC" },

  // FinTech & Quantitative Trading
  { company: "Jane Street", url: "https://www.janestreet.com/join-jane-street/open-roles/", category: "FinTech & Quant", accent: "#005a9c", initials: "JS" },
  { company: "Citadel", url: "https://www.citadel.com/careers/open-opportunities/", category: "FinTech & Quant", accent: "#003b71", initials: "CD" },
  { company: "Two Sigma", url: "https://www.twosigma.com/careers/", category: "FinTech & Quant", accent: "#232d3f", initials: "TS" },
  { company: "Jump Trading", url: "https://www.jumptrading.com/careers/", category: "FinTech & Quant", accent: "#e67e22", initials: "JT" },
  { company: "Hudson River Trading", url: "https://www.hudsonrivertrading.com/careers/", category: "FinTech & Quant", accent: "#ff5722", initials: "HRT" },
  { company: "D.E. Shaw", url: "https://www.deshaw.com/careers", category: "FinTech & Quant", accent: "#1a5276", initials: "DES" },
  { company: "Point72", url: "https://www.point72.com/careers/", category: "FinTech & Quant", accent: "#0e6655", initials: "P72" },
  { company: "Millennium", url: "https://www.mlp.com/careers/", category: "FinTech & Quant", accent: "#1b4f72", initials: "ML" },
  { company: "Optiver", url: "https://optiver.com/working-at-optiver/career-opportunities/", category: "FinTech & Quant", accent: "#e74c3c", initials: "OP" },
  { company: "IMC Trading", url: "https://careers.imc.com/", category: "FinTech & Quant", accent: "#3498db", initials: "IMC" },
  { company: "Five Rings", url: "https://fiverings.com/careers/", category: "FinTech & Quant", accent: "#f39c12", initials: "FR" },
  { company: "Virtu Financial", url: "https://www.virtu.com/careers/", category: "FinTech & Quant", accent: "#27ae60", initials: "VF" },
  { company: "Stripe", url: "https://stripe.com/jobs/search", category: "FinTech & Quant", accent: "#635bff", initials: "ST" },
  { company: "Robinhood", url: "https://robinhood.com/us/en/careers/openings/", category: "FinTech & Quant", accent: "#00c805", initials: "RH" },
  { company: "Bloomberg", url: "https://www.bloomberg.com/company/careers/early-career/", category: "FinTech & Quant", accent: "#414141", initials: "BB" },
  { company: "Ramp", url: "https://ramp.com/careers", category: "FinTech & Quant", accent: "#ceff00", initials: "RP" },
  { company: "Brex", url: "https://www.brex.com/careers", category: "FinTech & Quant", accent: "#f25c05", initials: "BX" },
  { company: "Plaid", url: "https://plaid.com/careers/", category: "FinTech & Quant", accent: "#111111", initials: "PLD" },
  { company: "Coinbase", url: "https://www.coinbase.com/careers", category: "FinTech & Quant", accent: "#0052ff", initials: "CB" },
  { company: "Block / Square", url: "https://block.xyz/careers", category: "FinTech & Quant", accent: "#222222", initials: "SQ" },
  { company: "Affirm", url: "https://www.affirm.com/careers", category: "FinTech & Quant", accent: "#00a887", initials: "AF" },

  // Startups & High Growth Tech
  { company: "Figma", url: "https://www.figma.com/careers/", category: "Startups & Growth", accent: "#f24e1e", initials: "FG" },
  { company: "Notion", url: "https://www.notion.so/careers", category: "Startups & Growth", accent: "#787878", initials: "NO" },
  { company: "Vercel", url: "https://vercel.com/careers", category: "Startups & Growth", accent: "#a0a0a0", initials: "VC" },
  { company: "Linear", url: "https://linear.app/careers", category: "Startups & Growth", accent: "#5e6ad2", initials: "LN" },
  { company: "Supabase", url: "https://supabase.com/careers", category: "Startups & Growth", accent: "#3ecf8e", initials: "SB" },
  { company: "Retool", url: "https://retool.com/careers", category: "Startups & Growth", accent: "#3c3c3c", initials: "RT" },
  { company: "Datadog", url: "https://careers.datadoghq.com/all-jobs/", category: "Startups & Growth", accent: "#632ca6", initials: "DD" },
  { company: "Snowflake", url: "https://careers.snowflake.com/us/en/search-results", category: "Startups & Growth", accent: "#29b5e8", initials: "SF" },
  { company: "Palantir", url: "https://www.palantir.com/careers/", category: "Startups & Growth", accent: "#a0a0a0", initials: "PL" },
  { company: "DoorDash", url: "https://careers.doordash.com/", category: "Startups & Growth", accent: "#ff3008", initials: "DD" },
  { company: "Uber", url: "https://www.uber.com/us/en/careers/", category: "Startups & Growth", accent: "#111111", initials: "UB" },
  { company: "Airbnb", url: "https://careers.airbnb.com/", category: "Startups & Growth", accent: "#ff5a5f", initials: "AB" },
  { company: "Pinterest", url: "https://www.pinterestcareers.com/", category: "Startups & Growth", accent: "#e60023", initials: "PI" },
  { company: "Reddit", url: "https://www.redditinc.com/careers", category: "Startups & Growth", accent: "#ff4500", initials: "RD" },
  { company: "Discord", url: "https://discord.com/careers", category: "Startups & Growth", accent: "#5865f2", initials: "DC" },
  { company: "Slack", url: "https://slack.com/careers", category: "Startups & Growth", accent: "#4a154b", initials: "SL" },
  { company: "Canva", url: "https://www.canva.com/careers/", category: "Startups & Growth", accent: "#00c4cc", initials: "CV" },
  { company: "Postman", url: "https://www.postman.com/company/careers/", category: "Startups & Growth", accent: "#ff6c37", initials: "PM" },
  { company: "GitHub", url: "https://github.com/about/careers", category: "Startups & Growth", accent: "#ffffff", initials: "GH" },
  { company: "GitLab", url: "https://about.gitlab.com/jobs/careers/", category: "Startups & Growth", accent: "#fc6d26", initials: "GL" },

  // Engineering, Robotics & Deep Tech
  { company: "SpaceX", url: "https://www.spacex.com/careers/", category: "Engineering", accent: "#005288", initials: "SX" },
  { company: "Tesla", url: "https://www.tesla.com/careers/search", category: "Engineering", accent: "#cc0000", initials: "TE" },
  { company: "Anduril Industries", url: "https://www.anduril.com/careers/", category: "Engineering", accent: "#1c2833", initials: "AD" },
  { company: "Boston Dynamics", url: "https://bostondynamics.com/careers/", category: "Engineering", accent: "#f1c40f", initials: "BD" },
  { company: "Neuralink", url: "https://neuralink.com/careers/", category: "Engineering", accent: "#2c3e50", initials: "NL" },
  { company: "Relativity Space", url: "https://www.relativityspace.com/careers", category: "Engineering", accent: "#e74c3c", initials: "RS" },
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
  const [isExtractingCL, setIsExtractingCL] = useState(false);
  const [modalExtractedNotice, setModalExtractedNotice] = useState("");

  // AI Studio Playground State
  const [studioTarget, setStudioTarget] = useState({
    jobId: "",
    company: "Google",
    role: "Machine Learning Engineering Intern",
    tone: "technical" as "technical" | "impact" | "quantitative" | "academic",
    baseLetterId: "",
    customBaseText: "",
    customFocus: "Focus on PyTorch distributed training, model evaluation benchmarks, and low-latency API architecture",
  });
  const [studioResult, setStudioResult] = useState("");
  const [isStudioGenerating, setIsStudioGenerating] = useState(false);
  const [studioSaved, setStudioSaved] = useState(false);
  const [isArchitectureModalOpen, setIsArchitectureModalOpen] = useState(false);
  const [reviewTone, setReviewTone] = useState<string>("technical");
  const [reviewBaseLetterId, setReviewBaseLetterId] = useState<string>("");
  const [selectedPortalForModal, setSelectedPortalForModal] = useState<Portal | null>(null);
  const [isConnectingPortal, setIsConnectingPortal] = useState(false);

  // Custom Companies & Global Search
  const [customCareerSites, setCustomCareerSites] = useState<CareerSite[]>([]);
  const [searchCompanyQuery, setSearchCompanyQuery] = useState("");
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [addCompanyForm, setAddCompanyForm] = useState({
    input: "",
    company: "",
    url: "",
    category: "AI / ML",
    isResolving: false,
    resolveError: "",
  });

  // ─── Keydown (Escape) ───
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setReviewingJob(null);
        setSelectedPortalForModal(null);
        setIsCustomModalOpen(false);
        setIsNewCLModalOpen(false);
        setIsAddCompanyModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── LocalStorage: Custom Companies ───
  useEffect(() => {
    try {
      const saved = localStorage.getItem("stratumapply_custom_companies");
      if (saved) {
        const parsed = JSON.parse(saved) as CareerSite[];
        if (Array.isArray(parsed)) setCustomCareerSites(parsed);
      }
    } catch {
      // ignore
    }
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

  const allCareerSites = useMemo(() => {
    return [...customCareerSites, ...careerSites];
  }, [customCareerSites]);

  const careerCategories = useMemo(() => {
    return ["All", "AI / ML", "Big Tech", "FinTech & Quant", "Startups & Growth", "Engineering", ...(customCareerSites.length > 0 ? ["Custom"] : [])];
  }, [customCareerSites]);

  const filteredCareerSites = useMemo(() => {
    let list = allCareerSites;
    if (careerFilter === "Custom") {
      list = customCareerSites;
    } else if (careerFilter !== "All") {
      list = allCareerSites.filter((s) => s.category === careerFilter);
    }
    if (searchCompanyQuery.trim()) {
      const q = searchCompanyQuery.toLowerCase().trim();
      list = list.filter((s) => s.company.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.url.toLowerCase().includes(q));
    }
    return list;
  }, [allCareerSites, customCareerSites, careerFilter, searchCompanyQuery]);

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

  function saveCustomCompany(site: CareerSite) {
    const updated = [site, ...customCareerSites.filter((s) => s.company.toLowerCase() !== site.company.toLowerCase())];
    setCustomCareerSites(updated);
    try {
      localStorage.setItem("stratumapply_custom_companies", JSON.stringify(updated));
    } catch {}
    setNotice(`✓ Added ${site.company} to your tracked companies directory!`);
    setIsAddCompanyModalOpen(false);
  }

  function removeCustomCompany(companyName: string) {
    const updated = customCareerSites.filter((s) => s.company !== companyName);
    setCustomCareerSites(updated);
    try {
      localStorage.setItem("stratumapply_custom_companies", JSON.stringify(updated));
    } catch {}
    setNotice(`Removed ${companyName} from custom tracked companies.`);
  }

  async function resolveOnlineCompany() {
    if (!addCompanyForm.input.trim()) return;
    setAddCompanyForm((f) => ({ ...f, isResolving: true, resolveError: "" }));
    try {
      const r = await fetch("/api/discovery/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: addCompanyForm.input.trim() }),
      });
      if (r.ok) {
        const d = (await r.json()) as { site: CareerSite };
        setAddCompanyForm((f) => ({
          ...f,
          company: d.site.company,
          url: d.site.url,
          category: d.site.category,
          isResolving: false,
        }));
      } else {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        setAddCompanyForm((f) => ({ ...f, isResolving: false, resolveError: err.error || "Could not resolve company." }));
      }
    } catch {
      setAddCompanyForm((f) => ({ ...f, isResolving: false, resolveError: "Network error resolving company." }));
    }
  }

  // ─── Actions: Review & Submit ───
  function openReview(job: Job) {
    setReviewingJob(job);
    setEditedCoverLetter(job.generatedCoverLetter ?? "");
    setCopied(false);
    setReviewTone("technical");
    if (coverLetters.length > 0 && !reviewBaseLetterId) {
      setReviewBaseLetterId(coverLetters[0].id);
    }
  }

  async function generateCoverLetterForJob(jobId: string, tone?: string, baseId?: string) {
    setIsGeneratingCL(true);
    try {
      const r = await fetch("/api/cover-letters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          tone: tone ?? reviewTone,
          baseCoverLetterId: baseId ?? (reviewBaseLetterId || undefined),
        }),
      });
      const d = await r.json() as { coverLetter?: string; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Generation failed.");
      setEditedCoverLetter(d.coverLetter ?? "");
      setNotice("AI synthesized a tailored cover letter customized for this job using your profile and attached base letter!");
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

  async function handleBulkCoverLetterUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setIsExtractingCL(true);
    setNotice(`Extracting text and details from ${files.length} cover letter file(s)...`);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const r = await fetch("/api/cover-letters/upload", {
        method: "POST",
        body: formData,
      });
      if (r.ok) {
        const d = (await r.json()) as { success: boolean; count: number; coverLetters: CoverLetterItem[] };
        if (d.coverLetters && d.coverLetters.length > 0) {
          setCoverLetters((c) => [...d.coverLetters, ...c]);
          setNotice(`✓ Extracted and added ${d.count} cover letter(s) to your learning corpus!`);
        }
      } else {
        const err = (await r.json().catch(() => ({}))) as { error?: string };
        setNotice(err.error || "Failed to process uploaded cover letters.");
      }
    } catch {
      setNotice("Upload failed. Please ensure files are valid PDF, DOCX, or TXT.");
    } finally {
      setIsExtractingCL(false);
      event.target.value = "";
    }
  }

  async function handleModalCoverLetterUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setModalExtractedNotice(`Extracting information from "${file.name}"...`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("preview", "true");
      const r = await fetch("/api/cover-letters/upload", {
        method: "POST",
        body: formData,
      });
      if (r.ok) {
        const d = (await r.json()) as {
          preview: boolean;
          name?: string;
          company?: string;
          role?: string;
          content?: string;
          isTemplate?: boolean;
          wordCount?: number;
        };
        if (d.content) {
          setNewCLForm({
            name: d.name || file.name.replace(/\.[^/.]+$/, ""),
            companySubmittedTo: d.company || "",
            roleSubmittedTo: d.role || "",
            content: d.content,
            isTemplate: d.isTemplate ?? true,
          });
          setModalExtractedNotice(`✓ Extracted ${d.wordCount ?? 0} words from "${file.name}"! Metadata populated.`);
        }
      } else {
        setModalExtractedNotice("Could not extract text from this file. You can paste text manually.");
      }
    } catch {
      setModalExtractedNotice("Extraction failed. Try another format or paste manually.");
    }
    event.target.value = "";
  }

  // ─── Actions: AI Studio Generator ───
  async function generateStudioCoverLetter() {
    setIsStudioGenerating(true);
    setStudioSaved(false);
    try {
      const selectedJob = jobs.find((j) => j.id === studioTarget.jobId);
      const company = selectedJob ? selectedJob.company : studioTarget.company;
      const role = selectedJob ? selectedJob.role : studioTarget.role;

      const r = await fetch("/api/cover-letters/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: studioTarget.jobId || undefined,
          company,
          role,
          tone: studioTarget.tone,
          baseCoverLetterId: studioTarget.baseLetterId || undefined,
          baseCoverLetterText: studioTarget.customBaseText || undefined,
          customFocus: studioTarget.customFocus || undefined,
        }),
      });
      const d = await r.json() as { coverLetter?: string; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Failed to generate.");
      setStudioResult(d.coverLetter ?? "");
      setNotice(`Generated tailored cover letter for ${company} (${role}) adapted from your base letter!`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setIsStudioGenerating(false);
    }
  }

  async function applyStudioResultToJob() {
    if (!studioResult || !studioTarget.jobId) return;
    try {
      await fetch(`/api/jobs/${studioTarget.jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedCoverLetter: studioResult,
          status: "ready_for_review",
        }),
      });
      setJobs((c) =>
        c.map((j) =>
          j.id === studioTarget.jobId
            ? { ...j, generatedCoverLetter: studioResult, status: "ready_for_review" as JobStatus }
            : j
        )
      );
      setNotice(`✓ Tailored cover letter attached directly to job dossier! Application is ready for review.`);
    } catch {
      setNotice("Could not attach cover letter to job.");
    }
  }

  async function saveStudioResultToCorpus() {
    if (!studioResult) return;
    try {
      const selectedJob = jobs.find((j) => j.id === studioTarget.jobId);
      const company = selectedJob ? selectedJob.company : studioTarget.company;
      const role = selectedJob ? selectedJob.role : studioTarget.role;

      const r = await fetch("/api/cover-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${company} — ${role}`,
          content: studioResult,
          companySubmittedTo: company,
          roleSubmittedTo: role,
          isTemplate: false,
        }),
      });
      if (r.ok) {
        const d = await r.json() as { coverLetter: CoverLetterItem };
        setCoverLetters((c) => [d.coverLetter, ...c]);
        setStudioSaved(true);
        setNotice("Saved tailored cover letter to your corpus!");
      }
    } catch {
      setNotice("Could not save to corpus.");
    }
  }

  // ─── Actions: Portals (100% In-App Direct Connect) ───
  function openPortal(portal: Portal) {
    setSelectedPortalForModal(portal);
    setNotice(`Opened in-app connection gateway for ${portal.name}. Connecting directly within your workspace.`);
  }

  async function connectPortalInternally(portalId: string) {
    setIsConnectingPortal(true);
    try {
      const res = await fetch("/api/portals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: portalId, status: "connected" }),
      });
      if (!res.ok) throw new Error("Server rejected the connection.");
      const portalName = portals.find((p) => p.id === portalId)?.name ?? portalId;
      setPortals((c) => c.map((p) => p.id === portalId ? { ...p, connectionStatus: "connected" } : p));
      setSelectedPortalForModal((prev) => prev?.id === portalId ? { ...prev, connectionStatus: "connected" } : prev);
      setNotice(`✓ ${portalName} session connected. Engine will use this session for job discovery.`);
      setTimeout(() => setSelectedPortalForModal(null), 1500);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not establish session.");
    } finally {
      setIsConnectingPortal(false);
    }
  }

  async function disconnectPortal(portalId: string) {
    setIsConnectingPortal(true);
    try {
      const res = await fetch("/api/portals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: portalId, status: "disconnected" }),
      });
      if (!res.ok) throw new Error("Server rejected the disconnect.");
      const portalName = portals.find((p) => p.id === portalId)?.name ?? portalId;
      setPortals((c) => c.map((p) => p.id === portalId ? { ...p, connectionStatus: "disconnected" } : p));
      setSelectedPortalForModal((prev) => prev?.id === portalId ? { ...prev, connectionStatus: "disconnected" } : prev);
      setNotice(`${portalName} session disconnected.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not disconnect session.");
    } finally {
      setIsConnectingPortal(false);
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
              <div className="eyebrow"><span className="eyebrow-line" />INTERNAL GATEWAY & PORTALS</div>
              <h1>Career Portals & In-App Direct Sessions</h1>
              <p>Connect directly to Handshake, LinkedIn, Greenhouse, Lever, and Workday from within StratumApply. No external browser tabs, zero third-party redirects.</p>
            </div>
            <span className="privacy-chip"><Icon name="shield" /> 100% Internal Workspace Session</span>
          </section>

          <div className="portal-grid">
            {portals.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: "1/-1", padding: 40 }}>
                <div>🔗</div>
                <strong>Loading portals…</strong>
                <span>Connecting to your workspace session.</span>
              </div>
            ) : portals.map((portal) => (
              <div key={portal.id} className="portal-card">
                <div className="portal-card-top">
                  <div className="portal-logo" style={{ background: `${portal.accent}20`, color: portal.accent }}>{portal.initials}</div>
                  <div>
                    <h3>{portal.name}</h3>
                    <p>{portal.subtitle}</p>
                  </div>
                  <span className={`portal-status ${portal.connectionStatus === "connected" ? "ready" : "not-connected"}`}>
                    {portal.connectionStatus === "connected" ? "● Connected" : "○ Not Connected"}
                  </span>
                </div>
                <div className="portal-capability"><Icon name="shield" /> {portal.capability}</div>
                <div className="portal-card-actions">
                  <button
                    className={portal.connectionStatus === "connected" ? "small-button secondary" : "primary-button"}
                    style={{ width: "100%", height: 36, fontSize: 12 }}
                    onClick={() => openPortal(portal)}
                  >
                    {portal.connectionStatus === "connected" ? "✓ Connected — Manage Session" : "⚡ Connect to Session"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="portal-note" style={{ marginTop: 24, border: "1px solid rgba(0, 229, 153, 0.25)", background: "rgba(0, 229, 153, 0.04)" }}>
            <span style={{ color: "var(--accent)" }}>⬡</span>
            <div>
              <strong style={{ color: "#fff" }}>100% In-App Direct Sessions:</strong> StratumApply connects internally through direct API tunnels and in-app session relays. You never have to leave StratumApply to sign into external websites; all job discovery, dossier preparation, and application submissions operate completely inside your secure workspace.
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label className="upload-button" style={{ background: "rgba(0, 229, 153, 0.15)", color: "var(--accent)", border: "1px solid rgba(0, 229, 153, 0.4)", cursor: "pointer" }}>
                <span>📤</span>{isExtractingCL ? "Extracting Letters…" : "Upload Cover Letter(s)"}
                <input type="file" accept=".pdf,.doc,.docx,.txt,.md" multiple onChange={handleBulkCoverLetterUpload} disabled={isExtractingCL} style={{ display: "none" }} />
              </label>
              <button className="text-button" onClick={() => { setModalExtractedNotice(""); setIsNewCLModalOpen(true); }}>＋ Add / Review Manually</button>
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
                  <p>Upload or attach cover letters you&apos;ve written. StratumApply extracts your genuine tone, accomplishments, and voice.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <label className="small-button secondary" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "var(--accent)", borderColor: "rgba(0, 229, 153, 0.3)" }}>
                    <span>📤</span> {isExtractingCL ? "Extracting…" : "Upload File(s)"}
                    <input type="file" accept=".pdf,.doc,.docx,.txt,.md" multiple onChange={handleBulkCoverLetterUpload} disabled={isExtractingCL} style={{ display: "none" }} />
                  </label>
                  <button className="small-button secondary" onClick={() => { setModalExtractedNotice(""); setIsNewCLModalOpen(true); }}>＋ Add Manually</button>
                  <button className="small-button secondary" onClick={() => setActiveSection("studio")}>⚡ Open AI Studio</button>
                </div>
              </div>

              {coverLetters.length === 0 ? (
                <div className="empty-state" style={{ padding: "36px 20px" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
                  <strong>No cover letters in corpus</strong>
                  <span style={{ maxWidth: 460, margin: "6px auto 14px", display: "block" }}>
                    Upload your past cover letters (.pdf, .docx, .txt). StratumApply automatically extracts the text, company, and role, teaching the AI your authentic writing voice!
                  </span>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <label className="primary-button" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <span>📤 Upload Cover Letter(s)</span>
                      <input type="file" accept=".pdf,.doc,.docx,.txt,.md" multiple onChange={handleBulkCoverLetterUpload} disabled={isExtractingCL} style={{ display: "none" }} />
                    </label>
                    <button className="small-button secondary" onClick={() => { setModalExtractedNotice(""); setIsNewCLModalOpen(true); }}>＋ Add / Paste Manually</button>
                  </div>
                </div>
              ) : (
                <div className="corpus-grid" style={{ marginTop: 12 }}>
                  {coverLetters.map((cl) => (
                    <div key={cl.id} className="corpus-card">
                      <div className="corpus-card-header">
                        <div className="corpus-card-title">{cl.name}</div>
                        <span className={`corpus-badge ${cl.isTemplate ? "template" : "submitted"}`}>
                          {cl.isTemplate ? "Default Template" : "Submitted"}
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
    // ══════════════════════════════════════════════════════════════════
    // 3. AI COVER LETTER STUDIO (JOB-TIED & PROFILE-ADAPTED)
    // ══════════════════════════════════════════════════════════════════
    if (activeSection === "studio") {
      const selectedJob = jobs.find((j) => j.id === studioTarget.jobId);
      // Only use a corpus letter if the user explicitly selected one (baseLetterId non-empty)
      const activeAttachedLetter =
        studioTarget.baseLetterId
          ? coverLetters.find((cl) => cl.id === studioTarget.baseLetterId) ?? null
          : null;

      const canGenerate = !isStudioGenerating &&
        (studioTarget.jobId || (studioTarget.company.trim() && studioTarget.role.trim()));
      const generateLabel = isStudioGenerating
        ? "Synthesizing with AI…"
        : selectedJob
          ? `⚡ Synthesize for ${selectedJob.company}`
          : studioTarget.company.trim()
            ? `⚡ Synthesize for ${studioTarget.company.trim()}`
            : "⚡ Synthesize Cover Letter";

      const wordCount = studioResult ? studioResult.trim().split(/\s+/).filter(Boolean).length : 0;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      return (
        <>
          <section className="subpage-hero">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />INTELLIGENT SYNTHESIZER</div>
              <h1>AI Cover Letter Studio</h1>
              <p>
                Link any target job from your pipeline or enter one ad-hoc. The AI anchors to your attached base cover letter and profile to synthesize an authentic, tailored application.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="small-button secondary" onClick={() => setIsArchitectureModalOpen(true)}>
                ⚡ How It Works
              </button>
              <button className="small-button secondary" onClick={() => setActiveSection("documents")}>
                View All Cover Letters
              </button>
            </div>
          </section>

          <div className="studio-card" style={{ padding: "24px" }}>
            <div className="studio-header">
              <div>
                <h2>Target Opportunity & Attached Voice Configuration</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Every generated letter adopts your attached voice while targeting specific company engineering requirements.
                </p>
              </div>
              <span className="source-state" style={{ color: "var(--accent)", background: "rgba(0, 229, 153, 0.12)", border: "1px solid rgba(0, 229, 153, 0.3)" }}>
                ✦ AI Synthesizer Active
              </span>
            </div>

            {/* Step 1 & 2: Job Selector & Base Cover Letter Reference */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Job Selector */}
              <div>
                <label style={{ display: "block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", marginBottom: 6 }}>
                  LINK TO PIPELINE JOB (OR ENTER CUSTOM COMPANY & ROLE)
                </label>
                <select
                  className="login-input"
                  style={{ width: "100%", background: "var(--bg-tertiary)", cursor: "pointer" }}
                  value={studioTarget.jobId}
                  onChange={(e) => {
                    const jId = e.target.value;
                    const found = jobs.find((j) => j.id === jId);
                    if (found) {
                      setStudioTarget((t) => ({ ...t, jobId: found.id, company: found.company, role: found.role }));
                    } else {
                      setStudioTarget((t) => ({ ...t, jobId: "" }));
                    }
                  }}
                >
                  <option value="">-- Custom / Ad-hoc Opportunity --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.company} — {j.role} ({j.fitScore}% match · {j.source})
                    </option>
                  ))}
                </select>

                {selectedJob && (
                  <div style={{ marginTop: 8 }} className="studio-job-badge">
                    <span>🎯 Active Target:</span>
                    <strong>{selectedJob.company} — {selectedJob.role}</strong>
                    <span>· {selectedJob.source}</span>
                    <span style={{ color: "var(--accent)" }}>{selectedJob.fitScore}% Fit</span>
                  </div>
                )}
              </div>

              {/* Attached Cover Letter Selection */}
              <div>
                <label style={{ display: "block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--cyan)", marginBottom: 6 }}>
                  📎 ATTACHED BASE COVER LETTER (VOICE & EXPERIENCE FOUNDATION)
                </label>
                <select
                  className="login-input"
                  style={{ width: "100%", background: "var(--bg-tertiary)", cursor: "pointer" }}
                  value={studioTarget.baseLetterId}
                  onChange={(e) => setStudioTarget((t) => ({ ...t, baseLetterId: e.target.value }))}
                >
                  <option value="">Default Cover Letter</option>
                  {coverLetters.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      📄 {cl.name} {cl.isTemplate ? "(Default Template)" : `(${cl.companySubmittedTo || "Corpus"})`}
                    </option>
                  ))}
                </select>

                <div className="attached-box" style={{ marginTop: 8 }}>
                  <div className="attached-box-title">
                    <span>Active Voice: {activeAttachedLetter?.name || "Default Cover Letter"}</span>
                    <span>{activeAttachedLetter ? `${activeAttachedLetter.content.trim().split(/\s+/).filter(Boolean).length} words` : "Profile Baseline"}</span>
                  </div>
                  <div className="attached-box-preview">
                    &quot;{activeAttachedLetter?.content.slice(0, 140) || profile.coverLetterTemplate.slice(0, 140)}...&quot;
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Company & Role if not selected from job */}
            {!selectedJob && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
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
              </div>
            )}

            {/* Profile Hook & Custom Focus */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <div style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                  <strong style={{ color: "#fff" }}>Candidate Identity Anchor:</strong> {profile.fullName || <span style={{ color: "var(--text-muted)" }}>Set your name in Profile</span>} · <span style={{ color: "var(--accent)", fontWeight: 600 }}>{profile.targetRoles?.split(",")[0] || "Set target roles in Profile"}</span>
                </div>
                <button className="small-button secondary" onClick={() => setActiveSection("profile")} style={{ fontSize: 10 }}>
                  Edit Profile Targeting
                </button>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", marginBottom: 4 }}>
                  CUSTOM FOCAL POINT & SKILLS EMPHASIS (AI weaves these into the body paragraphs)
                </label>
                <input
                  className="login-input"
                  style={{ width: "100%" }}
                  value={studioTarget.customFocus}
                  onChange={(e) => setStudioTarget((t) => ({ ...t, customFocus: e.target.value }))}
                  placeholder="e.g. Highlight PyTorch distributed training, CUDA benchmarks, and lab research"
                />
              </div>
            </div>

            {/* Strategic Tone Presets */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", marginBottom: 6 }}>
                STRATEGIC TONE PRESET
              </label>
              <div className="tone-selector" style={{ gap: 8 }}>
                {[
                  { id: "technical", label: "⚡ Deep Tech & ML", desc: "Architecture, frameworks, CUDA, performance" },
                  { id: "impact", label: "🚀 Founder & Impact", desc: "0-to-1 execution, fast shipping, metrics" },
                  { id: "quantitative", label: "📊 Quant & Rigor", desc: "Mathematical grounding, empirical metrics" },
                  { id: "academic", label: "🎓 Academic & Research", desc: "Lab coursework, novel literature" },
                ].map((t) => (
                  <button
                    key={t.id}
                    className={`tone-button${studioTarget.tone === t.id ? " active" : ""}`}
                    onClick={() => setStudioTarget((s) => ({ ...s, tone: t.id as "technical" | "impact" | "quantitative" | "academic" }))}
                    style={{ padding: "8px 12px", textAlign: "left", flex: 1 }}
                  >
                    <div style={{ fontWeight: 700 }}>{t.label}</div>
                    <div style={{ fontSize: 9, opacity: 0.75, marginTop: 2 }}>{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
              {!studioTarget.jobId && !studioTarget.company.trim() && (
                <div style={{ width: "100%", fontSize: 11, color: "#f59e0b", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 6, padding: "7px 12px" }}>
                  ⚠ Select a job from the pipeline above, or enter a Company and Role to generate a tailored letter.
                </div>
              )}
              <button
                className="primary-button"
                onClick={generateStudioCoverLetter}
                disabled={!canGenerate}
                style={{ padding: "0 22px", height: 42, fontSize: 13, opacity: canGenerate ? 1 : 0.5 }}
              >
                {generateLabel}
              </button>
              {selectedJob && studioResult && (
                <button
                  className="primary-button"
                  style={{ background: "linear-gradient(135deg, #00D2FF, #00A3FF)", color: "#000", height: 42 }}
                  onClick={applyStudioResultToJob}
                >
                  💾 Apply to {selectedJob.company} Dossier
                </button>
              )}
            </div>

            {/* Dual Pane Layout for Results */}
            {studioResult && (
              <div className="studio-dual-grid">
                {/* Left Pane: Job Context & Voice Reference */}
                <div className="studio-side-card">
                  <div className="studio-side-header">
                    <h3><span>🎯</span> Target Opportunity Context</h3>
                    <span className="stat-pill active">{selectedJob ? `${selectedJob.fitScore}% Match` : "Ad-hoc"}</span>
                  </div>

                  <div>
                    <h4 style={{ fontSize: 13, color: "#fff", fontWeight: 700 }}>{selectedJob ? selectedJob.role : studioTarget.role}</h4>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{selectedJob ? selectedJob.company : studioTarget.company} · {selectedJob?.location ?? "United States (Hybrid / Remote)"}</p>
                  </div>

                  {selectedJob?.jobDescription && (
                    <div>
                      <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>PARSED REQUIREMENTS</span>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, marginTop: 4, maxHeight: 100, overflowY: "auto" }}>
                        {selectedJob.jobDescription}
                      </p>
                    </div>
                  )}

                  <div className="attached-box">
                    <div className="attached-box-title">
                      <span>Inspiration: {activeAttachedLetter?.name || "Default Cover Letter"}</span>
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: "4px 0 0" }}>
                      AI preserved your authentic accomplishments, projects, and personal voice from this attached document.
                    </p>
                  </div>

                  {selectedJob?.applyUrl && (
                    <a
                      href={selectedJob.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="outline-button"
                      style={{ textAlign: "center", textDecoration: "none", fontSize: 11, padding: "8px 12px" }}
                    >
                      Open {selectedJob.company} Portal ↗
                    </a>
                  )}
                </div>

                {/* Right Pane: Live Synthesized Editor */}
                <div className="studio-side-card" style={{ border: "1px solid rgba(0, 229, 153, 0.3)" }}>
                  <div className="studio-side-header">
                    <div className="stats-badge-row">
                      <span className="stat-pill active">✓ Tailored to {selectedJob ? selectedJob.company : studioTarget.company}</span>
                      <span className="stat-pill">{wordCount} words</span>
                      <span className="stat-pill">~{readingTime} min read</span>
                      <span className="stat-pill" style={{ textTransform: "capitalize" }}>Tone: {studioTarget.tone}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="small-button secondary" onClick={() => navigator.clipboard.writeText(studioResult)}>
                        📋 Copy
                      </button>
                      <button className="small-button" onClick={saveStudioResultToCorpus} disabled={studioSaved}>
                        {studioSaved ? "Saved to Corpus ✓" : "Save to Corpus"}
                      </button>
                    </div>
                  </div>

                  <textarea
                    className="studio-editor"
                    style={{ minHeight: 380, lineHeight: 1.7 }}
                    value={studioResult}
                    onChange={(e) => setStudioResult(e.target.value)}
                  />
                </div>
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
                <strong>80+ Tech & FinTech Giants</strong>
                <p>One-click direct queueing for Big Tech, AI Labs & Quant firms.</p>
              </div>
              <span className="source-state">Track</span>
            </div>
          </div>

          <div className="subpage-section-heading">
            <div>
              <h2>Tracked Companies Directory ({allCareerSites.length})</h2>
              <p>Search, track, or auto-extract custom companies and portals. Click &quot;＋&quot; on any company to queue opportunities.</p>
            </div>
            <button
              className="primary-button"
              style={{ fontSize: 12, height: 34, padding: "0 14px", display: "flex", alignItems: "center", gap: 6 }}
              onClick={() => {
                setAddCompanyForm({ input: searchCompanyQuery, company: searchCompanyQuery, url: "", category: "AI / ML", isResolving: false, resolveError: "" });
                setIsAddCompanyModalOpen(true);
              }}
            >
              ＋ Add Custom Company / Site
            </button>
          </div>

          {/* Live Search & Filter Bar */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
              <input
                className="login-input"
                style={{ width: "100%", paddingLeft: 34, height: 38, fontSize: 13 }}
                placeholder="🔍 Search 80+ companies by name, category, or URL..."
                value={searchCompanyQuery}
                onChange={(e) => setSearchCompanyQuery(e.target.value)}
              />
              {searchCompanyQuery && (
                <button
                  onClick={() => setSearchCompanyQuery("")}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="career-filter-bar" style={{ margin: 0 }}>
              {careerCategories.map((cat) => (
                <button key={cat} className={`filter-tab${careerFilter === cat ? " active" : ""}`} onClick={() => setCareerFilter(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt to add if search query yields 0 results */}
          {searchCompanyQuery && filteredCareerSites.length === 0 && (
            <div style={{
              padding: "16px 20px",
              marginBottom: 18,
              borderRadius: 8,
              border: "1px dashed rgba(0, 229, 153, 0.4)",
              background: "rgba(0, 229, 153, 0.05)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12
            }}>
              <div>
                <strong style={{ color: "#fff", fontSize: 13 }}>No company named &quot;{searchCompanyQuery}&quot; found in standard catalog</strong>
                <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                  Add it as a custom tracked company. We can auto-resolve its career portal online so you can queue roles immediately.
                </span>
              </div>
              <button
                className="primary-button"
                style={{ height: 32, fontSize: 11, padding: "0 14px" }}
                onClick={() => {
                  setAddCompanyForm({ input: searchCompanyQuery, company: searchCompanyQuery, url: "", category: "AI / ML", isResolving: false, resolveError: "" });
                  setIsAddCompanyModalOpen(true);
                }}
              >
                ⚡ Auto-Resolve & Track &quot;{searchCompanyQuery}&quot;
              </button>
            </div>
          )}

          <div className="career-grid">
            {filteredCareerSites.map((site) => (
              <div key={site.company} className="career-card-wrap">
                <a href={site.url} target="_blank" rel="noopener noreferrer" className="career-card">
                  <div className="career-logo" style={{ background: `${site.accent}20`, color: site.accent }}>{site.initials}</div>
                  <div className="career-info">
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong>{site.company}</strong>
                      {site.isCustom && (
                        <span style={{ fontSize: 9, background: "rgba(0, 229, 153, 0.15)", color: "var(--accent)", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>Custom</span>
                      )}
                    </div>
                    <span>{site.category}</span>
                  </div>
                  <span className="career-arrow">↗</span>
                </a>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <button className="career-track-btn" onClick={() => trackCompany(site)} title={`Track & Queue ${site.company}`}>＋</button>
                  {site.isCustom && (
                    <button
                      className="doc-delete-btn"
                      onClick={() => removeCustomCompany(site.company)}
                      title={`Remove ${site.company}`}
                      style={{ height: 32, width: 28, fontSize: 11 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
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
              <div className="subpage-section-heading">
                <h2>Default Cover Letter (Baseline Profile Template)</h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Your primary default letter used as the voice baseline when synthesizing letters for newly discovered internships.
                </p>
              </div>
              <div className="form-grid">
                <label className="wide-field">
                  DEFAULT TEMPLATE CONTENT (Variables: {"{COMPANY}"}, {"{ROLE}"}, {"{NAME}"})
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
                  <div key={job.id} className="job-card" role="button" tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={() => openReview(job)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openReview(job); } }}
                  >
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
                    <div className="job-actions" onClick={(e) => e.stopPropagation()}>
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
                <h2>My Activity Log</h2>
                <p>Your personal automation history and application actions</p>
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
          <div style={{ padding: "8px 12px", marginTop: "8px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)" }}>
            <span>StratumApply v2.4</span>
            <span style={{ fontSize: "10px", background: "rgba(0, 229, 153, 0.12)", color: "var(--accent)", padding: "1px 6px", borderRadius: "4px" }}>Encrypted Session</span>
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
            <button
              className="small-button secondary"
              style={{ fontSize: 11, padding: "4px 10px", borderColor: "rgba(0, 229, 153, 0.35)", color: "var(--accent)" }}
              onClick={() => setIsArchitectureModalOpen(true)}
            >
              ⚡ How StratumApply Works
            </button>
            <div className="sync-status"><span className="live-dot" />Database Synced</div>
            <button className="icon-button"><Icon name="bell" /><span className="notification-dot" /></button>
            <div className="top-avatar">{displayInitials}</div>
          </div>
        </header>

        <div className="content-wrap">
          {renderWorkspacePage()}

          <footer className="page-footer">
            <span>
              <span className="footer-spark">✦</span> StratumApply · Built by <strong style={{ color: "var(--text-primary)" }}>Shubhankar Tiwari</strong> (Columbia University)
            </span>
            <div style={{ display: "flex", gap: "14px", alignItems: "center", fontSize: "12px" }}>
              <a
                href="https://shubhankar-tiwari.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
              >
                Portfolio ↗
              </a>
              <a
                href="https://www.linkedin.com/in/shubhankartiw1/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#00A3FF", textDecoration: "none", fontWeight: 500 }}
              >
                LinkedIn ↗
              </a>
              <a
                href="https://github.com/shubhankartiwari99"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 500 }}
              >
                GitHub ↗
              </a>
              <button onClick={() => setActiveSection("portals")}>Manage Portals</button>
            </div>
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
              {/* Left Column: Job Intelligence & Application Data */}
              <div className="review-col-left">
                <div className="fit-breakdown">
                  <strong>{reviewingJob.fitScore}%</strong>
                  <div>
                    <h4 style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>AI Profile Alignment</h4>
                    <p>Background in AI/ML & engineering matches requirements for this role.</p>
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

                {/* Resume / Documents checklist */}
                <div className="prefill-card">
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Application Checklist</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "var(--bg-tertiary)", borderRadius: 6, border: "1px solid var(--border-subtle)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>📄</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Resume</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{documents.filter(d => d.kind === "resume").length > 0 ? documents.filter(d => d.kind === "resume")[0].name : "No resume uploaded"}</div>
                        </div>
                      </div>
                      {documents.filter(d => d.kind === "resume").length > 0
                        ? <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, background: "rgba(0,229,153,0.1)", padding: "2px 7px", borderRadius: 4 }}>✓ Ready</span>
                        : <button className="small-button secondary" style={{ fontSize: 10, padding: "2px 8px" }} onClick={() => setActiveSection("documents")}>Upload ↗</button>
                      }
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "var(--bg-tertiary)", borderRadius: 6, border: "1px solid var(--border-subtle)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>✍️</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Cover Letter</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Tailored for {reviewingJob.company}</div>
                        </div>
                      </div>
                      {reviewingJob.generatedCoverLetter
                        ? <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, background: "rgba(0,229,153,0.1)", padding: "2px 7px", borderRadius: 4 }}>✓ Generated</span>
                        : <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, background: "rgba(245,158,11,0.1)", padding: "2px 7px", borderRadius: 4 }}>⚠ Pending</span>
                      }
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "var(--bg-tertiary)", borderRadius: 6, border: "1px solid var(--border-subtle)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14 }}>👤</span>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Candidate Profile</div>
                          <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{profile.fullName || "Not set"} · {profile.email || "No email"}</div>
                        </div>
                      </div>
                      {profile.fullName && profile.email
                        ? <span style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, background: "rgba(0,229,153,0.1)", padding: "2px 7px", borderRadius: 4 }}>✓ Ready</span>
                        : <button className="small-button secondary" style={{ fontSize: 10, padding: "2px 8px" }} onClick={() => { setReviewingJob(null); setActiveSection("profile"); }}>Complete ↗</button>
                      }
                    </div>
                  </div>
                </div>

                <div className="prefill-card" style={{ marginTop: 0 }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Pre-fill Data for Application Form</h4>
                  <div className="prefill-grid">
                    <div className="prefill-item">
                      <strong>NAME</strong>
                      <span>{profile.fullName || "—"}</span>
                    </div>
                    <div className="prefill-item">
                      <strong>EMAIL</strong>
                      <span>{profile.email || "—"}</span>
                    </div>
                    <div className="prefill-item">
                      <strong>LINKEDIN</strong>
                      <span style={{ wordBreak: "break-all" }}>{profile.linkedin || "—"}</span>
                    </div>
                    <div className="prefill-item">
                      <strong>PORTFOLIO</strong>
                      <span style={{ wordBreak: "break-all" }}>{profile.portfolio || "—"}</span>
                    </div>
                    <div className="prefill-item">
                      <strong>AUTH STATUS</strong>
                      <span>{profile.workAuthorization || "—"}</span>
                    </div>
                    <div className="prefill-item">
                      <strong>PHONE</strong>
                      <span>{profile.phone || "—"}</span>
                    </div>
                    <div className="prefill-item">
                      <strong>ACTIVE RESUME</strong>
                      <span style={{ color: documents.length > 0 ? "var(--cyan)" : "var(--text-muted)" }}>
                        {documents.length > 0 ? documents[0].name : "Not uploaded"}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button className="small-button secondary" style={{ fontSize: 10 }} onClick={() => { navigator.clipboard.writeText(profile.email || ""); setNotice("Email copied!"); }}>📋 Copy Email</button>
                    <button className="small-button secondary" style={{ fontSize: 10 }} onClick={() => { navigator.clipboard.writeText(profile.fullName || ""); setNotice("Name copied!"); }}>📋 Copy Name</button>
                    {profile.linkedin && <button className="small-button secondary" style={{ fontSize: 10 }} onClick={() => { navigator.clipboard.writeText(profile.linkedin); setNotice("LinkedIn URL copied!"); }}>📋 Copy LinkedIn</button>}
                    {profile.portfolio && <button className="small-button secondary" style={{ fontSize: 10 }} onClick={() => { navigator.clipboard.writeText(profile.portfolio); setNotice("Portfolio URL copied!"); }}>📋 Copy Portfolio</button>}
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

                {reviewingJob.applyUrl && (
                  <div className="review-section" style={{ background: "rgba(0, 229, 153, 0.04)", border: "1px solid rgba(0, 229, 153, 0.2)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <h3 style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Application Link</h3>
                    </div>
                    <a href={reviewingJob.applyUrl} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "var(--accent)", wordBreak: "break-all", textDecoration: "underline" }}>
                      {reviewingJob.applyUrl} ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Right Column: Tailored Cover Letter Editor */}
              <div className="review-col-right">
                <div className="review-section-header">
                  <div>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Tailored Cover Letter</h3>
                    <p className="review-cl-note" style={{ margin: "2px 0 0" }}>
                      Tied specifically to <strong>{reviewingJob.company}</strong> ({reviewingJob.role}). Anchored to your attached base letter and profile.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className="stat-pill active">
                      {editedCoverLetter ? `${editedCoverLetter.trim().split(/\s+/).filter(Boolean).length} words` : "Empty"}
                    </span>
                    <button className={`review-copy-btn${copied ? " copied" : ""}`} onClick={copyCoverLetter}>
                      <Icon name="copy" /> {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Tone & Attached Base Voice Selection */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "var(--cyan)", fontWeight: 700 }}>📎 BASE VOICE:</span>
                      <select
                        style={{ background: "transparent", color: "#fff", border: "1px solid var(--border-default)", borderRadius: 4, padding: "2px 6px", fontSize: 11, cursor: "pointer", outline: "none" }}
                        value={reviewBaseLetterId}
                        onChange={(e) => setReviewBaseLetterId(e.target.value)}
                      >
                        <option value="" style={{ background: "#111622", color: "#fff" }}>Default Profile Letter</option>
                        {coverLetters.map((cl) => (
                          <option key={cl.id} value={cl.id} style={{ background: "#111622", color: "#fff" }}>
                            {cl.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="tone-selector" style={{ margin: 0 }}>
                      {[
                        { id: "technical", label: "Tech & ML" },
                        { id: "impact", label: "Impact" },
                        { id: "quantitative", label: "Quant" },
                        { id: "academic", label: "Research" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          className={`tone-button${reviewTone === t.id ? " active" : ""}`}
                          onClick={() => setReviewTone(t.id)}
                          style={{ padding: "3px 8px", fontSize: 10 }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    className="primary-button"
                    style={{ width: "100%", height: 32, fontSize: 11 }}
                    onClick={() => generateCoverLetterForJob(reviewingJob.id, reviewTone, reviewBaseLetterId)}
                    disabled={isGeneratingCL}
                  >
                    {isGeneratingCL ? "Synthesizing with AI…" : `⚡ Regenerate Tailored Cover Letter for ${reviewingJob.company}`}
                  </button>
                </div>

                <textarea
                  className="review-cover-editor"
                  style={{ minHeight: 310, lineHeight: 1.65 }}
                  value={editedCoverLetter}
                  onChange={(e) => setEditedCoverLetter(e.target.value)}
                  placeholder="Click 'Regenerate Tailored Cover Letter' or paste your customized letter here..."
                />
              </div>
            </div>

            <div className="review-footer">
              <button className="review-discard-btn" onClick={() => discardJob(reviewingJob.id)}>
                <Icon name="trash" /> Remove Job
              </button>
              <div className="review-footer-actions">
                {reviewingJob.status !== "submitted" ? (
                  <button className="primary-button review-approve" onClick={() => approveApplication(reviewingJob)}>
                    <Icon name="check" /> Submit Application Internally (Direct Tunnel)
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                    ✓ Application Submitted Internally to {reviewingJob.company}
                  </span>
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

      {/* ── ADD CUSTOM COMPANY / CAREER SITE MODAL ── */}
      {isAddCompanyModalOpen && (
        <div className="review-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsAddCompanyModalOpen(false); }}>
          <div className="review-panel" style={{ maxWidth: 540 }}>
            <div className="review-header">
              <div>
                <h2>Add Company to Tracked Directory</h2>
                <p style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 4 }}>
                  Enter a website domain, company name, or ATS board URL (Greenhouse, Lever). StratumApply will auto-resolve its portal or you can configure it manually.
                </p>
              </div>
              <button className="review-close" onClick={() => setIsAddCompanyModalOpen(false)}><Icon name="close" /></button>
            </div>
            <div className="review-body">
              {/* Online Resolution Bar */}
              <div style={{
                marginBottom: 16,
                padding: "14px 16px",
                border: "1px dashed rgba(0, 229, 153, 0.4)",
                borderRadius: 8,
                background: "rgba(0, 229, 153, 0.04)",
              }}>
                <label style={{ display: "block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--cyan)", marginBottom: 6 }}>
                  ⚡ ONLINE AUTO-RESOLVE (DOMAIN OR ATS URL)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="login-input"
                    style={{ flex: 1 }}
                    placeholder="e.g. linear.app, ramp.com, or greenhouse/lever URL"
                    value={addCompanyForm.input}
                    onChange={(e) => setAddCompanyForm((f) => ({ ...f, input: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); resolveOnlineCompany(); } }}
                  />
                  <button
                    type="button"
                    className="primary-button"
                    style={{ height: 38, fontSize: 11, padding: "0 14px", flexShrink: 0 }}
                    onClick={resolveOnlineCompany}
                    disabled={addCompanyForm.isResolving || !addCompanyForm.input.trim()}
                  >
                    {addCompanyForm.isResolving ? "Resolving…" : "Auto-Resolve"}
                  </button>
                </div>
                {addCompanyForm.resolveError && (
                  <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>
                    {addCompanyForm.resolveError}
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!addCompanyForm.company.trim() || !addCompanyForm.url.trim()) return;
                const companyName = addCompanyForm.company.trim();
                const initials = companyName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || companyName.slice(0, 2).toUpperCase();
                saveCustomCompany({
                  company: companyName,
                  url: addCompanyForm.url.trim(),
                  category: addCompanyForm.category,
                  accent: "#00E599",
                  initials,
                  isCustom: true,
                });
              }}>
                <div className="custom-modal-grid">
                  <label>COMPANY NAME<input value={addCompanyForm.company} onChange={(e) => setAddCompanyForm((f) => ({ ...f, company: e.target.value }))} placeholder="e.g. Linear" required /></label>
                  <label>CAREER PAGE / ATS URL<input value={addCompanyForm.url} onChange={(e) => setAddCompanyForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://linear.app/careers" required /></label>
                  <label>INDUSTRY CATEGORY
                    <select
                      className="login-input"
                      value={addCompanyForm.category}
                      onChange={(e) => setAddCompanyForm((f) => ({ ...f, category: e.target.value }))}
                      style={{ background: "var(--bg-tertiary)", cursor: "pointer", width: "100%", height: 38 }}
                    >
                      <option value="AI / ML">AI / ML</option>
                      <option value="Big Tech">Big Tech</option>
                      <option value="FinTech & Quant">FinTech & Quant</option>
                      <option value="Startups & Growth">Startups & Growth</option>
                      <option value="Engineering">Engineering & Deep Tech</option>
                    </select>
                  </label>
                </div>
                <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button type="button" className="small-button secondary" onClick={() => setIsAddCompanyModalOpen(false)}>Cancel</button>
                  <button type="submit" className="primary-button">Track This Company ↗</button>
                </div>
              </form>
            </div>
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
                  Upload previous letters or paste text. The AI extracts your genuine style, company, and projects to curate new applications.
                </p>
              </div>
              <button className="review-close" onClick={() => setIsNewCLModalOpen(false)}><Icon name="close" /></button>
            </div>
            <form className="review-body" onSubmit={handleAddCoverLetter}>
              {/* Upload Dropzone */}
              <div style={{
                marginBottom: 16,
                padding: "16px 20px",
                border: "2px dashed rgba(0, 229, 153, 0.35)",
                borderRadius: 8,
                background: "rgba(0, 229, 153, 0.04)",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}>
                <span style={{ fontSize: 26 }}>📄</span>
                <strong style={{ fontSize: 13, color: "#fff" }}>Upload Cover Letter File (.pdf, .docx, .txt, .md)</strong>
                <span style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 440 }}>
                  Select or drop a file to automatically extract the text, company name, and role so you don&apos;t have to type anything.
                </span>
                <label className="small-button secondary" style={{ marginTop: 6, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent)" }}>
                  <span>📂 Choose File to Auto-Extract</span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    style={{ display: "none" }}
                    onChange={handleModalCoverLetterUpload}
                  />
                </label>
                {modalExtractedNotice && (
                  <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4, fontWeight: 600 }}>
                    {modalExtractedNotice}
                  </div>
                )}
              </div>

              <div className="custom-modal-grid">
                <label>IDENTIFIER / TITLE<input value={newCLForm.name} onChange={(e) => setNewCLForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Google ML Intern 2024" required /></label>
                <label>COMPANY SUBMITTED TO<input value={newCLForm.companySubmittedTo} onChange={(e) => setNewCLForm((f) => ({ ...f, companySubmittedTo: e.target.value }))} placeholder="e.g. Google" /></label>
                <label>ROLE SUBMITTED TO<input value={newCLForm.roleSubmittedTo} onChange={(e) => setNewCLForm((f) => ({ ...f, roleSubmittedTo: e.target.value }))} placeholder="e.g. Software Engineering Intern" /></label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 20 }}>
                  <input type="checkbox" checked={newCLForm.isTemplate} onChange={(e) => setNewCLForm((f) => ({ ...f, isTemplate: e.target.checked }))} />
                  <span>Set as Default Cover Letter</span>
                </label>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ display: "block", fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)", marginBottom: 6 }}>COVER LETTER CONTENT</label>
                <textarea
                  className="review-cover-editor"
                  style={{ minHeight: 220 }}
                  value={newCLForm.content}
                  onChange={(e) => setNewCLForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Upload a file above or paste your past cover letter text here..."
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

      {/* ── IN-APP DIRECT PORTAL GATEWAY CONSOLE MODAL ── */}
      {selectedPortalForModal && (
        <div className="portal-gateway-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedPortalForModal(null); }}>
          <div className="portal-gateway-modal">
            <div className="gateway-header">
              <div className="gateway-header-left">
                <div className="gateway-logo" style={{ background: `${selectedPortalForModal.accent}20`, color: selectedPortalForModal.accent }}>
                  {selectedPortalForModal.initials}
                </div>
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" />INTERNAL PORTAL GATEWAY</div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>
                    {selectedPortalForModal.name} Direct Session
                  </h2>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    {selectedPortalForModal.subtitle} · 100% In-App Session Relay (Zero Third-Party Redirects)
                  </p>
                </div>
              </div>
              <button className="review-close" onClick={() => setSelectedPortalForModal(null)}>
                <Icon name="close" />
              </button>
            </div>

            {/* Gateway Connect Panel */}
            <div className="gateway-terminal" style={{ marginBottom: 16 }}>
              <div className="terminal-line active">
                <span>›</span>
                <span>INIT: Connecting StratumApply internal session to {selectedPortalForModal.name}...</span>
              </div>
              <div className="terminal-line success">
                <span>✓</span>
                <span>IDENTITY: Candidate verified — {profile.email || "st3907@columbia.edu"}.</span>
              </div>
              <div className="terminal-line success">
                <span>✓</span>
                <span>ENCRYPTION: Session anchored to your private workspace. No data leaves StratumApply.</span>
              </div>
              <div className="terminal-line">
                <span>›</span>
                <span>STATUS: {selectedPortalForModal.connectionStatus === "connected" ? "ACTIVE — SESSION SYNCED WITH ENGINE" : "READY — CLICK CONNECT BELOW"}</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>CAPABILITY UNLOCKED</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginTop: 4 }}>{selectedPortalForModal.capability}</div>
              </div>
              <div style={{ padding: "12px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>QUICK CLIPBOARD</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                  <button className="small-button secondary" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => { navigator.clipboard.writeText(profile.email || ""); setNotice("Email copied!"); }}>📋 Email</button>
                  <button className="small-button secondary" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => { navigator.clipboard.writeText(profile.fullName || ""); setNotice("Name copied!"); }}>📋 Name</button>
                  {profile.linkedin && <button className="small-button secondary" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => { navigator.clipboard.writeText(profile.linkedin); setNotice("LinkedIn copied!"); }}>📋 LinkedIn</button>}
                  {profile.portfolio && <button className="small-button secondary" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => { navigator.clipboard.writeText(profile.portfolio); setNotice("Portfolio copied!"); }}>📋 Portfolio</button>}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="small-button secondary" onClick={() => setSelectedPortalForModal(null)}>
                Close
              </button>
              {selectedPortalForModal.connectionStatus === "connected" ? (
                <button
                  className="primary-button"
                  onClick={() => disconnectPortal(selectedPortalForModal.id)}
                  disabled={isConnectingPortal}
                  style={{ padding: "0 20px", height: 38, background: "rgba(244,63,94,0.1)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.3)" }}
                >
                  {isConnectingPortal ? "Disconnecting…" : "Disconnect Session"}
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={() => connectPortalInternally(selectedPortalForModal.id)}
                  disabled={isConnectingPortal}
                  style={{ padding: "0 20px", height: 38 }}
                >
                  {isConnectingPortal ? "Connecting…" : "⚡ Connect Internal Session"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE SYSTEM ARCHITECTURE & WORKFLOW MODAL ── */}
      {isArchitectureModalOpen && (
        <div className="how-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsArchitectureModalOpen(false); }}>
          <div className="how-modal">
            <div className="how-header">
              <div>
                <div className="eyebrow"><span className="eyebrow-line" />SYSTEM ARCHITECTURE & LIFECYCLE</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>⚡ How StratumApply Works</h2>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                  Autonomous multi-portal job application pipeline with strict human-in-the-loop review.
                </p>
              </div>
              <button className="review-close" onClick={() => setIsArchitectureModalOpen(false)}><Icon name="close" /></button>
            </div>

            <div className="how-step-grid">
              <div className="how-step-card">
                <div className="how-step-num">1</div>
                <h4>Multi-Portal Discovery</h4>
                <p>
                  Connects to <strong>Handshake</strong> (Columbia Engineering), <strong>GoinGlobal</strong>, <strong>LinkedIn</strong>, <strong>Greenhouse</strong>, <strong>Lever</strong>, and <strong>Workday</strong>. Automatically pulls job descriptions, tags, and evaluates 0–100 candidate fit.
                </p>
              </div>

              <div className="how-step-card">
                <div className="how-step-num">2</div>
                <h4>Attached Base Letter & Profile Anchor</h4>
                <p>
                  Your uploaded resume, profile variables, and <strong>attached base cover letters</strong> establish your authentic voice. The engine extracts real project anecdotes and avoids generic cookie-cutter phrasing.
                </p>
              </div>

              <div className="how-step-card">
                <div className="how-step-num">3</div>
                <h4>AI Contextual Synthesis</h4>
                <p>
                  Ties the target job description directly to your profile. Select from 4 strategic styles: <strong>Deep Tech & ML</strong>, <strong>Founder Impact</strong>, <strong>Quant Rigor</strong>, or <strong>Academic Research</strong> with custom focal points.
                </p>
              </div>

              <div className="how-step-card">
                <div className="how-step-num">4</div>
                <h4>Human-in-the-Loop Review Gate</h4>
                <p>
                  Zero accidental submissions. StratumApply prepares the complete dossier, pre-fills applicant data, and halts at an interactive review screen for your final stamp of approval.
                </p>
              </div>

              <div className="how-step-card">
                <div className="how-step-num">5</div>
                <h4>Direct Submission & Tracking</h4>
                <p>
                  Launch directly into the target company ATS with pre-filled fields and 1-click clipboard transfer. Submissions are saved to your private database and added to your AI learning corpus.
                </p>
              </div>
            </div>

            <div style={{ padding: "16px 20px", background: "rgba(0, 229, 153, 0.08)", border: "1px solid rgba(0, 229, 153, 0.25)", borderRadius: "var(--radius-md)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                <strong style={{ color: "#fff" }}>Ready to apply?</strong> Pick any role in your queue or test tailored synthesis in the AI Studio.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="small-button secondary" onClick={() => { setIsArchitectureModalOpen(false); setActiveSection("studio"); }}>
                  Open AI Studio
                </button>
                <button className="primary-button" onClick={() => { setIsArchitectureModalOpen(false); setActiveSection("overview"); }}>
                  Go to Mission Control
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
