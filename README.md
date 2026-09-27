<div align="center">

# ⚡ StratumApply

### Autonomous Multi-Portal Career Command Center & Human-In-The-Loop Internship Engine

[![Next.js 15](https://img.shields.io/badge/Next.js-15.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Neon Database](https://img.shields.io/badge/Neon-PostgreSQL-00E599?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Vitest](https://img.shields.io/badge/Vitest-Passing-729B1B?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <b>A unified, high-performance command center for discovering AI/ML, engineering, and quant opportunities across campus boards and tech ATS platforms — synthesizing tailored cover letters, pre-filling application dossiers, and pausing for human review before final submission.</b>
</p>

</div>

---

## 🚀 Key Highlights

- **🎯 Multi-Portal Gateway**: Instant synchronization and direct deep-links for **Handshake** (Columbia Engineering), **GoinGlobal**, **LinkedIn**, **Greenhouse**, **Lever**, **Workday**, **Simplify**, and **Jobright AI**.
- **🧠 AI Cover Letter Studio**: Synthesizes job-specific cover letters that learn from your previous submissions and writing style. Adjust tone between *Technical / Engineering*, *Executive & Visionary*, *Direct & Punchy*, or *Academic / Research*.
- **📊 Algorithmic Fit Scorer**: Evaluates job descriptions against target roles (AI Engineer, ML Intern, Quant, Data Science), locations, and visa constraints to calculate a 0–100 match score.
- **🛡️ Human-In-The-Loop Review Gate**: Zero accidental or uncontrolled submissions. StratumApply prepares the full dossier, matches credentials, and halts at an interactive review modal for your final stamp of approval.
- **🔐 Privacy & Secure Passkey Architecture**: Zero plain-text credentials stored. Personal passkeys are individually salted and cryptographically hashed with PBKDF2 (SHA-512, 100,000 iterations). Candidate workspaces remain private, self-service, and cookie-secured.
- **⚡ Dual-Store Data Layer**: Seamless transition between **Neon Serverless PostgreSQL** in production and an **instant In-Memory store** for zero-dependency local development.
- **🧪 100% Tested**: Vitest unit test suite verifying cryptographic hashing, status transition state machines, portal definitions, and application preparer logic.

---

## 🏛️ Application Architecture & Lifecycle

```mermaid
flowchart TD
    subgraph Discovery ["1. Multi-Source Discovery"]
        A[Handshake / GoinGlobal / ATS Feed] --> B[Job Discovery Radar]
        B -->|Status: Discovered| C[(PostgreSQL / Store)]
    end

    subgraph Intelligence ["2. AI Synthesis & Matching"]
        C --> D[Fit Matcher Engine]
        D -->|Fit Score 0-100| E[Target Queue]
        E --> F[AI Application Preparer]
        F -->|Pulls Resume & Cover Letter Corpus| G[Tailored Cover Letter & Form Prefill]
    end

    subgraph HumanGate ["3. Human-In-The-Loop Gate"]
        G -->|Status: Ready for Review| H[Application Review Dossier Modal]
        H -->|User Edits & Approves| I[Status: Approved]
        H -->|User Rejects / Discards| J[Status: Discarded]
    end

    subgraph FinalSubmission ["4. Submission & Tracking"]
        I --> K[Direct Portal Launch & Auto-fill Verification]
        K -->|Status: Submitted| L[Status: Interview / Tracking]
    end
```

---

## 🌐 Integrated Career Portals

| Portal | Scope & Capability | Default Login URL |
| :--- | :--- | :--- |
| **Handshake** | Columbia Engineering campus recruitment & on-campus interviews | `https://columbiaengineering.joinhandshake.com/login` |
| **GoinGlobal** | International postings, global visa sponsorship, and H-1B hiring | `https://online.goinglobal.com/` |
| **LinkedIn** | AI/ML internships, Easy Apply matching, and recruiter outreach | `https://www.linkedin.com/login` |
| **Greenhouse** | High-growth startups, scale-ups, and AI research labs | `https://boards.greenhouse.io/` |
| **Lever** | Modern tech companies with 1-click ATS application formats | `https://jobs.lever.co/` |
| **Workday** | Enterprise, Big Tech, and Tier-1 financial institutions | `https://www.myworkday.com/` |
| **Simplify** | Autofill copilot and rapid-apply aggregator integration | `https://simplify.jobs/` |
| **Jobright AI** | Curated AI, machine learning, and data science job radar | `https://jobright.ai/` |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **UI & State**: [React 19](https://react.dev/), Vanilla CSS Design System with Glassmorphism & Micro-animations
- **Database**: [Neon Serverless PostgreSQL](https://neon.tech/) (`@neondatabase/serverless`)
- **Authentication**: Salted Passkey with `node:crypto` PBKDF2 SHA-512 (100,000 iterations) & `HttpOnly` Secure Cookie Sessions
- **AI Intelligence**: OpenAI API integration (`gpt-4o`) with robust heuristic fallbacks
- **Testing**: [Vitest 4](https://vitest.dev/)

---

## 🚦 Getting Started Locally

### Prerequisites
- Node.js `v20.0.0` or higher (Tested on Node `v25.2.1`)
- npm `v10+`

### 1. Clone & Install
```bash
git clone https://github.com/shubhankartiwari99/stratumapply.git
cd stratumapply
npm install
```

### 2. Run Local Development Server
To launch in local mode (with zero external database or email dependencies required):

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000). Enter your email and choose any passkey to immediately create your private isolated workspace.

### 3. Run the Unit Test Suite
Run the 27 unit tests verifying all core modules:

```bash
npm test
```

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🚢 Deploying to Vercel

StratumApply is architected for zero-configuration deployment to [Vercel](https://vercel.com):

1. **Import Repository**: Connect `shubhankartiwari99/stratumapply` in the Vercel Dashboard.
2. **Attach Neon Database**:
   - Install the **Neon** integration from the Vercel Marketplace, or supply an existing PostgreSQL connection string via `DATABASE_URL`.
   - The database schema (`db/schema.sql`) automatically provisions tables and migrations on the first authenticated request.
3. **Configure Environment Variables**:
   Add the following in **Vercel Settings → Environment Variables**:

   | Variable | Description | Example |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | Neon Postgres Connection String | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
   | `AUTH_SECRET` | 32+ character random secret for session cookies | `openssl rand -hex 32` |
   | `OPENAI_API_KEY` | *(Optional)* OpenAI key for custom cover letter synthesis | `sk-proj-...` |
   | `OPENAI_MODEL` | *(Optional)* Model identifier (defaults to `gpt-4o`) | `gpt-4o` |

4. **Deploy**: Hit **Deploy**. Your command center is live!

---

## 🔒 Security & Privacy Model

- **PBKDF2 SHA-512 Passkeys**: Passwords/passkeys are never stored in plain text. Every passkey is protected with a unique 32-byte cryptographic salt and 100,000 rounds of PBKDF2 SHA-512 hashing.
- **Cryptographic User Isolation**: In the database, user identifiers are stored as irreversible HMAC hashes using your `AUTH_SECRET`.
- **Stateless Candidate Isolation**: Each candidate gets a totally isolated workspace. Cascade delete constraints ensure complete data purge if requested.
- **Ethical Automation**: StratumApply acts as an intelligence assistant and copilot. It never runs blind headless submissions or bypasses CAPTCHAs.

---

## 👨‍💻 Creator & Engineering Lead

**Shubhankar Tiwari**  
*Columbia University*

[![LinkedIn](https://img.shields.io/badge/LinkedIn-shubhankartiwari-0A66C2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/shubhankartiwari)
[![GitHub](https://img.shields.io/badge/GitHub-shubhankartiwari99-181717?style=flat-square&logo=github)](https://github.com/shubhankartiwari99)
[![Email](https://img.shields.io/badge/Email-st3907%40columbia.edu-blue?style=flat-square&logo=gmail)](mailto:st3907@columbia.edu)

Designed and engineered at Columbia University to automate multi-portal internship tracking, AI-augmented cover letter synthesis, and human-verified ATS submission pipelines across Handshake, LinkedIn, Greenhouse, and Lever.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
