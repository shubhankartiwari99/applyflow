/**
 * StratumApply Chrome Extension — In-Page Job Extractor & Floating Action Button
 */

(function () {
  let activeWidget = null;
  let isCapturing = false;

  function cleanText(text) {
    if (!text) return "";
    return text.replace(/\s+/g, " ").trim();
  }

  function extractJsonLd() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const json = JSON.parse(script.textContent || "{}");
        const items = Array.isArray(json) ? json : json["@graph"] ? json["@graph"] : [json];
        for (const item of items) {
          if (item["@type"] === "JobPosting") {
            const company = typeof item.hiringOrganization === "object" ? item.hiringOrganization.name : item.hiringOrganization;
            const location = typeof item.jobLocation === "object"
              ? (item.jobLocation.address?.addressLocality || item.jobLocation.address?.addressRegion || "Remote")
              : "Remote";
            return {
              role: cleanText(item.title),
              company: cleanText(company),
              location: cleanText(location),
              jobDescription: cleanText(item.description),
            };
          }
        }
      } catch {}
    }
    return null;
  }

  function extractLinkedIn() {
    const jsonLd = extractJsonLd();
    const titleEl = document.querySelector(".job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24, .job-view-layout h1");
    const companyEl = document.querySelector(".job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name");
    const locationEl = document.querySelector(".job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet");
    const descEl = document.querySelector("#job-details, .jobs-description__content, .jobs-box__html-content");

    const role = cleanText(titleEl?.innerText || jsonLd?.role);
    const company = cleanText(companyEl?.innerText || jsonLd?.company);
    const location = cleanText(locationEl?.innerText || jsonLd?.location || "United States");
    const jobDescription = cleanText(descEl?.innerText || jsonLd?.jobDescription);

    if (!role && !company) return null;

    return {
      role,
      company,
      location,
      jobDescription,
      source: "linkedin",
      sourceUrl: window.location.href,
      applyUrl: window.location.href,
      tags: ["LinkedIn", "Captured via Extension"],
    };
  }

  function extractHandshake() {
    const jsonLd = extractJsonLd();
    const titleEl = document.querySelector('h1[data-hook="job-title"], h1');
    const companyEl = document.querySelector('a[data-hook="employer-name"], [class*="employerName"], [class*="employer-name"]');
    const locationEl = document.querySelector('[data-hook="job-location"], [class*="job-location"]');
    const descEl = document.querySelector('[data-hook="job-description"], [class*="job-description"], [class*="description"]');

    const role = cleanText(titleEl?.innerText || jsonLd?.role);
    const company = cleanText(companyEl?.innerText || jsonLd?.company);
    const location = cleanText(locationEl?.innerText || jsonLd?.location || "Campus Listing");
    const jobDescription = cleanText(descEl?.innerText || jsonLd?.jobDescription);

    if (!role && !company) return null;

    return {
      role,
      company,
      location,
      jobDescription,
      source: "handshake",
      sourceUrl: window.location.href,
      applyUrl: window.location.href,
      tags: ["Handshake", "Campus Listing", "Captured via Extension"],
    };
  }

  function extractWorkday() {
    const jsonLd = extractJsonLd();
    const titleEl = document.querySelector('[data-automation-id="jobPostingHeader"], h2');
    const locEl = document.querySelector('[data-automation-id="locations"]');
    const descEl = document.querySelector('[data-automation-id="jobPostingDescription"]');

    const hostParts = window.location.hostname.split(".");
    const companyGuess = hostParts[0].replace(/[^a-zA-Z0-9]/g, " ");

    const role = cleanText(titleEl?.innerText || jsonLd?.role);
    const company = cleanText(jsonLd?.company || companyGuess.charAt(0).toUpperCase() + companyGuess.slice(1));
    const location = cleanText(locEl?.innerText || jsonLd?.location || "Enterprise Site");
    const jobDescription = cleanText(descEl?.innerText || jsonLd?.jobDescription);

    if (!role) return null;

    return {
      role,
      company,
      location,
      jobDescription,
      source: "workday",
      sourceUrl: window.location.href,
      applyUrl: window.location.href,
      tags: ["Workday", "Enterprise", "Captured via Extension"],
    };
  }

  function extractGreenhouseOrLever() {
    const jsonLd = extractJsonLd();
    const isGH = window.location.hostname.includes("greenhouse.io");
    const titleEl = document.querySelector(".app-title, .posting-headline h2");
    const companyEl = document.querySelector(".company-name, .main-header-logo");
    const descEl = document.querySelector("#content, .section-page");

    const role = cleanText(titleEl?.innerText || jsonLd?.role);
    const company = cleanText(companyEl?.innerText || jsonLd?.company || document.title.split("-")[0]);
    const jobDescription = cleanText(descEl?.innerText || jsonLd?.jobDescription);

    if (!role) return null;

    return {
      role,
      company,
      location: "Hybrid / Remote",
      jobDescription,
      source: isGH ? "greenhouse" : "lever",
      sourceUrl: window.location.href,
      applyUrl: window.location.href,
      tags: [isGH ? "Greenhouse" : "Lever", "Direct ATS", "Captured via Extension"],
    };
  }

  function detectCurrentJob() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes("linkedin.com")) return extractLinkedIn();
    if (host.includes("joinhandshake.com")) return extractHandshake();
    if (host.includes("myworkdayjobs.com")) return extractWorkday();
    if (host.includes("greenhouse.io") || host.includes("lever.co")) return extractGreenhouseOrLever();

    const jsonLd = extractJsonLd();
    if (jsonLd?.role && jsonLd?.company) {
      return {
        role: jsonLd.role,
        company: jsonLd.company,
        location: jsonLd.location,
        jobDescription: jsonLd.jobDescription,
        source: "web",
        sourceUrl: window.location.href,
        applyUrl: window.location.href,
        tags: ["Web", "Captured via Extension"],
      };
    }
    return null;
  }

  function renderFloatingWidget() {
    const job = detectCurrentJob();
    if (!job || !job.role) {
      if (activeWidget) {
        activeWidget.remove();
        activeWidget = null;
      }
      return;
    }

    if (activeWidget) return; // already rendered

    const container = document.createElement("div");
    container.id = "stratumapply-extension-root";
    container.innerHTML = `
      <div class="stratum-card">
        <div class="stratum-brand">
          <span class="stratum-dot"></span>
          <span class="stratum-title">StratumApply</span>
        </div>
        <div class="stratum-job-preview">
          <div class="stratum-role" title="${job.role}">${job.role}</div>
          <div class="stratum-company">${job.company} · ${job.location || "Remote"}</div>
        </div>
        <button id="stratum-capture-btn" class="stratum-btn">
          <span>⚡</span> Capture to Pipeline
        </button>
      </div>
    `;

    document.body.appendChild(container);
    activeWidget = container;

    const btn = container.querySelector("#stratum-capture-btn");
    btn.addEventListener("click", async () => {
      if (isCapturing) return;
      isCapturing = true;
      btn.innerHTML = `<span>⏳</span> Saving…`;
      btn.disabled = true;

      const freshJob = detectCurrentJob() || job;

      chrome.runtime.sendMessage({ action: "CAPTURE_JOB", jobData: freshJob }, (response) => {
        isCapturing = false;
        if (response && response.success) {
          btn.classList.add("success");
          btn.innerHTML = `<span>✓</span> Added to Queue!`;
          setTimeout(() => {
            btn.classList.remove("success");
            btn.innerHTML = `<span>⚡</span> Captured Again`;
            btn.disabled = false;
          }, 3500);
        } else {
          btn.classList.add("error");
          btn.innerHTML = `<span>⚠️</span> ${response?.error || "Error saving"}`;
          setTimeout(() => {
            btn.classList.remove("error");
            btn.innerHTML = `<span>⚡</span> Retry Capture`;
            btn.disabled = false;
          }, 3500);
        }
      });
    });
  }

  // Monitor DOM mutations for single-page applications (LinkedIn SPA routing)
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(renderFloatingWidget, 1200);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial render attempt
  setTimeout(renderFloatingWidget, 1500);

  // Allow popup to query active job
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_PAGE_JOB") {
      const job = detectCurrentJob();
      sendResponse({ job });
    }
  });
})();
