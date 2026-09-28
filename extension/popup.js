/**
 * StratumApply Chrome Extension — Popup Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
  const badge = document.getElementById("conn-badge");
  const jobRole = document.getElementById("job-role");
  const jobCompany = document.getElementById("job-company");
  const captureBtn = document.getElementById("capture-btn");
  const serverInput = document.getElementById("server-url");
  const saveBtn = document.getElementById("save-settings-btn");
  const dashboardLink = document.getElementById("dashboard-link");
  const jobCount = document.getElementById("job-count");

  let detectedJob = null;
  let currentServerUrl = "http://localhost:3000";

  // Load saved server URL
  chrome.storage.sync.get(["serverUrl"], (res) => {
    if (res.serverUrl) {
      currentServerUrl = res.serverUrl;
      serverInput.value = res.serverUrl;
    } else {
      serverInput.value = currentServerUrl;
    }
    checkStatus();
  });

  // Check connection status with background worker
  function checkStatus() {
    badge.className = "status-badge";
    badge.textContent = "Checking…";

    chrome.runtime.sendMessage({ action: "CHECK_CONNECTION" }, (response) => {
      if (response && response.connected) {
        badge.className = "status-badge";
        badge.textContent = "● Connected";
        if (typeof response.totalJobs === "number") {
          jobCount.textContent = `${response.totalJobs} jobs in pipeline`;
        }
      } else {
        badge.className = "status-badge offline";
        badge.textContent = "○ Disconnected";
        jobCount.textContent = "Server not reachable";
      }
    });
  }

  // Save server URL
  saveBtn.addEventListener("click", () => {
    let newUrl = serverInput.value.trim().replace(/\/+$/, "");
    if (!newUrl) newUrl = "http://localhost:3000";
    serverInput.value = newUrl;
    currentServerUrl = newUrl;

    chrome.storage.sync.set({ serverUrl: newUrl }, () => {
      saveBtn.textContent = "Saved!";
      setTimeout(() => (saveBtn.textContent = "Save"), 1500);
      checkStatus();
    });
  });

  // Open Dashboard link
  dashboardLink.addEventListener("click", () => {
    chrome.tabs.create({ url: currentServerUrl });
  });

  // Query active tab for detected job
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "GET_PAGE_JOB" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.job || !response.job.role) {
          jobRole.textContent = "No job detected";
          jobCompany.textContent = "Navigate to a job posting on LinkedIn or Handshake";
          captureBtn.style.display = "none";
          return;
        }

        detectedJob = response.job;
        jobRole.textContent = detectedJob.role;
        jobCompany.textContent = `${detectedJob.company} · ${detectedJob.location || "Remote"}`;
        captureBtn.style.display = "flex";
      });
    }
  } catch (err) {
    jobRole.textContent = "Extension active";
    jobCompany.textContent = "Browse to any career platform to capture jobs";
  }

  // Handle Capture button click
  captureBtn.addEventListener("click", () => {
    if (!detectedJob) return;

    captureBtn.disabled = true;
    captureBtn.textContent = "Saving to Pipeline…";

    chrome.runtime.sendMessage({ action: "CAPTURE_JOB", jobData: detectedJob }, (response) => {
      captureBtn.disabled = false;
      if (response && response.success) {
        captureBtn.textContent = "✓ Added to StratumApply!";
        captureBtn.style.background = "#00e599";
        captureBtn.style.color = "#070a0f";
        checkStatus();
      } else {
        captureBtn.textContent = "⚠️ " + (response?.error || "Failed to save");
        captureBtn.style.background = "#f43f5e";
        captureBtn.style.color = "#ffffff";
        setTimeout(() => {
          captureBtn.textContent = "⚡ Capture to Pipeline";
          captureBtn.style.background = "";
          captureBtn.style.color = "";
        }, 3000);
      }
    });
  });
});
