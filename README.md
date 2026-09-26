# ApplyFlow

ApplyFlow is a multi-user, human-controlled workspace for discovering internship opportunities, preparing application materials, and pausing for a person before final submission.

Each classmate gets a separate workspace. Sign-in uses a short-lived email OTP: ApplyFlow never stores a password, portal password, MFA code, or portal session cookie. In production, the application database stores an HMAC of the email rather than the raw email, a hash of the one-time code, and the user’s workspace data. The workspace is what lets a person resume their profile, links, preferences, queue, and application history on another session.

## What works now

- Passwordless email OTP authentication with an HttpOnly session cookie.
- Neon Postgres persistence for separate user workspaces when deployed on Vercel.
- Local development fallback with an explicit demo mode; the preview code is never returned in production.
- Greenhouse and Lever public-board discovery through `/api/discovery`.
- A directory of company career links, including AI, big tech, semiconductor, startup, and engineering companies.
- LinkedIn, Handshake, GoinGlobal, Simplify, and Jobright browser handoff links.
- Queue filtering, cover-letter placeholder replacement, application review, and the human approval gate.

## Important product boundary

The app does not bypass CAPTCHA, MFA, login controls, robots restrictions, or portal terms. LinkedIn, Handshake, GoinGlobal, Simplify, and Jobright remain browser-handoff/manual-review sources unless an official integration permits more. “Approve & mark submitted” currently records the user’s decision in ApplyFlow; it does not silently submit an external portal form.

The current document section stores document metadata in the workspace. It does not yet upload the original PDF/DOC file or parse it server-side. Add object storage and a document extraction pipeline before treating uploaded files as available across devices.

## Run locally

```bash
npm install
ALLOW_DEMO_AUTH=true npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Enter a synthetic email address; local demo mode shows the OTP in the login screen. Without `ALLOW_DEMO_AUTH=true`, local sign-in requires a configured email provider.

Create a production build with:

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Create or import the project in Vercel.
2. Add Neon from the Vercel Marketplace and make sure `DATABASE_URL` is available to Production, Preview, and Development as needed.
3. Add Resend from the Vercel Marketplace, verify the sender domain, and set `RESEND_API_KEY` and `RESEND_FROM_EMAIL`.
4. Set `AUTH_SECRET` to a long random value. Do not prefix any of these secrets with `NEXT_PUBLIC_`.
5. Set `ALLOW_DEMO_AUTH=false` in Vercel.
6. Deploy. The first authenticated request creates the tables in `db/schema.sql`; the SQL is also included for manual provisioning.

Required production variables:

```text
DATABASE_URL
AUTH_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
ALLOW_DEMO_AUTH=false
```

If any required production variable is missing, ApplyFlow intentionally returns a configuration error instead of showing an OTP or pretending that workspaces are durable.

## Security notes

Keep `.env.local` and provider credentials out of source control. Never ask users to paste portal passwords into ApplyFlow. Use the portal’s own browser login and let the user review every application before an external submission.
