/**
 * StratumApply Chrome Extension — Background Service Worker (Manifest V3)
 */

const DEFAULT_SERVER_URL = "http://localhost:3000";

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(["serverUrl"], (result) => {
    if (!result.serverUrl) {
      chrome.storage.sync.set({ serverUrl: DEFAULT_SERVER_URL });
    }
  });
});

// Message listener for content scripts & popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CAPTURE_JOB") {
    handleJobCapture(request.jobData)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message || "Failed to save job" }));
    return true; // Keep channel open for async response
  }

  if (request.action === "CHECK_CONNECTION") {
    checkServerConnection()
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ connected: false, error: err.message }));
    return true;
  }
});

async function getServerConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["serverUrl", "authToken", "devUserId"], (items) => {
      resolve({
        serverUrl: (items.serverUrl || DEFAULT_SERVER_URL).replace(/\/+$/, ""),
        authToken: items.authToken || "",
        devUserId: items.devUserId || "user_primary",
      });
    });
  });
}

async function handleJobCapture(jobData) {
  const config = await getServerConfig();
  const url = `${config.serverUrl}/api/jobs`;

  const headers = {
    "Content-Type": "application/json",
  };

  if (config.authToken) {
    headers["Authorization"] = `Bearer ${config.authToken}`;
  } else if (config.devUserId) {
    headers["x-user-id"] = config.devUserId;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...jobData,
        status: "ready_for_review",
      }),
      credentials: "include",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("StratumApply sign in required. Please sign into your StratumApply dashboard tab.");
      }
      throw new Error(data.error || `Server responded with ${response.status}`);
    }

    return { success: true, job: data.job };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect to StratumApply",
    };
  }
}

async function checkServerConnection() {
  const config = await getServerConfig();
  const url = `${config.serverUrl}/api/jobs?limit=1`;

  const headers = {};
  if (config.authToken) {
    headers["Authorization"] = `Bearer ${config.authToken}`;
  } else if (config.devUserId) {
    headers["x-user-id"] = config.devUserId;
  }

  try {
    const res = await fetch(url, { headers, credentials: "include" });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { connected: true, authenticated: true, serverUrl: config.serverUrl, totalJobs: data.total ?? 0 };
    }
    if (res.status === 401) {
      return { connected: true, authenticated: false, serverUrl: config.serverUrl };
    }
    return { connected: false, error: `HTTP ${res.status}`, serverUrl: config.serverUrl };
  } catch (error) {
    return { connected: false, error: "Cannot reach server", serverUrl: config.serverUrl };
  }
}
