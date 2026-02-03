// Default values
const DEFAULTS = {
  recordingUrl: "https://jam.dev/?jam-recording=wWE7TT1",
  subdomain: "jamdev-70656",
  email: "frits@jam.dev",
  apiToken: "EX2z9E70wLp1P8xrYlFNAQT8nLDOggJgAvqQI0Lv",
};

// DOM Elements
const form = document.getElementById("settings-form");
const recordingUrlInput = document.getElementById("recording-url");
const subdomainInput = document.getElementById("subdomain");
const emailInput = document.getElementById("email");
const apiTokenInput = document.getElementById("api-token");
const statusBadge = document.getElementById("status-badge");
const toast = document.getElementById("toast");

// Load saved settings
async function loadSettings() {
  const result = await chrome.storage.sync.get([
    "recordingUrl",
    "subdomain",
    "email",
    "apiToken",
  ]);

  recordingUrlInput.value = result.recordingUrl || DEFAULTS.recordingUrl;
  subdomainInput.value = result.subdomain || DEFAULTS.subdomain;
  emailInput.value = result.email || DEFAULTS.email;
  apiTokenInput.value = result.apiToken || DEFAULTS.apiToken;

  const subdomain = result.subdomain || DEFAULTS.subdomain;
  const email = result.email || DEFAULTS.email;
  const apiToken = result.apiToken || DEFAULTS.apiToken;

  updateStatus(subdomain, email, apiToken);
}

// Update connection status
function updateStatus(subdomain, email, apiToken) {
  if (subdomain && email && apiToken) {
    statusBadge.textContent = subdomain + ".zendesk.com";
    statusBadge.className = "badge badge-green";
  } else {
    statusBadge.textContent = "Not configured";
    statusBadge.className = "badge badge-gray";
  }
}

// Show toast notification
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

// Verify Zendesk credentials
async function verifyCredentials(subdomain, email, apiToken) {
  try {
    const credentials = btoa(`${email}/token:${apiToken}`);
    const response = await fetch(
      `https://${subdomain}.zendesk.com/api/v2/users/me.json`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Failed to verify credentials:", error);
    return false;
  }
}

// Save settings
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const recordingUrl = recordingUrlInput.value.trim();
  const subdomain = subdomainInput.value.trim().toLowerCase();
  const email = emailInput.value.trim();
  const apiToken = apiTokenInput.value.trim();

  // Verify credentials if all Zendesk fields are filled
  if (subdomain && email && apiToken) {
    const isValid = await verifyCredentials(subdomain, email, apiToken);
    if (!isValid) {
      showToast("Invalid Zendesk credentials");
      return;
    }
  }

  // Save to storage
  await chrome.storage.sync.set({
    recordingUrl,
    subdomain,
    email,
    apiToken,
  });

  updateStatus(subdomain, email, apiToken);
  showToast("Settings saved!");

  // Notify content scripts to refresh
  chrome.tabs.query({ url: "https://*.zendesk.com/*" }, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { type: "SETTINGS_UPDATED" }).catch(() => {
        // Tab might not have content script loaded
      });
    });
  });
});

// Initialize
loadSettings();
