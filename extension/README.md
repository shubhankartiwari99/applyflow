# StratumApply Chrome Extension (Manifest V3)

> 1-Click Job Importer for LinkedIn, Handshake, Workday, Greenhouse & Lever.

This extension connects directly to your StratumApply workspace to capture job postings, job descriptions, and apply URLs with a single click.

---

## 🚀 How to Install & Test Right Now (Developer Mode)

1. Open **Google Chrome** (or Edge, Brave, Arc).
2. Go to `chrome://extensions/` in the URL bar.
3. Turn on the **"Developer mode"** toggle in the top-right corner.
4. Click **"Load unpacked"** in the top-left corner.
5. Select this folder:
   ```
   /Users/shubhankartiwari/Documents/nyc welcome/extension
   ```
6. The **StratumApply** extension will appear in your Chrome toolbar!

---

## 🎯 How to Use It

1. Start your StratumApply dev server if it isn't running:
   ```bash
   npm run dev
   ```
2. Navigate to any job posting on:
   - **LinkedIn**: `https://www.linkedin.com/jobs/...`
   - **Handshake**: `https://columbiaengineering.joinhandshake.com/...`
   - **Workday**: `https://*.myworkdayjobs.com/...`
   - **Greenhouse / Lever**: `https://boards.greenhouse.io/...` or `https://jobs.lever.co/...`
3. A sleek floating badge appears in the bottom right: **`[ ⚡ Capture to Pipeline ]`**.
4. Click it — the job, company, full description, and direct apply link are instantly synced into your StratumApply database!
5. Or click the StratumApply icon in your Chrome toolbar to view the popup.

---

## 📦 How to Publish to the Chrome Web Store

When you want to share this extension with the public:
1. Zip the contents of the `extension/` folder:
   ```bash
   cd extension && zip -r stratumapply-extension.zip manifest.json background.js content.js content.css popup.html popup.js icons/
   ```
2. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).
3. Pay the one-time $5 developer registration fee.
4. Click **"New Item"** and upload `stratumapply-extension.zip`.
5. Fill in the title, description, and screenshot, then submit for review.
6. Once approved, anyone in the world can install it with 1 click!
