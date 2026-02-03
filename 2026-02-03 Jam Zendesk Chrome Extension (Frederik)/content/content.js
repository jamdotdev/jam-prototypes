// Jam + Zendesk Content Script
// Injects floating action button on Zendesk ticket pages

// Demo data for testing on google.com
const DEMO_TICKET = {
  id: 12345,
  subject: "Unable to export data from dashboard",
  requesterName: "Sarah Johnson",
  status: "open",
};

const DEMO_SETTINGS = {
  recordingUrl: "https://jam.dev/?jam-recording=demo-recording-id",
  subdomain: "demo",
  email: "demo@example.com",
  apiToken: "demo-token",
};

let currentTicketId = null;
let currentTicket = null;
let settings = null;
let panelOpen = false;

// Icons as SVG strings
const STRAWBERRY_ICON = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2C11 2 10 2.5 9.5 3.5C9 2.5 8 2 7 2C6 2 5.5 3 6 4C4 4 3 5 3 7C3 9 4.5 10 6 10C6 10 5 12 5 15C5 19 8 22 12 22C16 22 19 19 19 15C19 12 18 10 18 10C19.5 10 21 9 21 7C21 5 20 4 18 4C18.5 3 18 2 17 2C16 2 15 2.5 14.5 3.5C14 2.5 13 2 12 2Z" fill="#FF6B6B"/>
  <path d="M9.5 3.5C10 2.5 11 2 12 2C13 2 14 2.5 14.5 3.5M9.5 3.5C9 2.5 8 2 7 2C6 2 5.5 3 6 4M9.5 3.5L10 5M14.5 3.5L14 5M14.5 3.5C15 2.5 16 2 17 2C18 2 18.5 3 18 4" stroke="#4ADE80" stroke-width="1.5" stroke-linecap="round"/>
  <ellipse cx="9" cy="13" rx="1" ry="1.5" fill="#FFE066"/>
  <ellipse cx="12" cy="16" rx="1" ry="1.5" fill="#FFE066"/>
  <ellipse cx="15" cy="13" rx="1" ry="1.5" fill="#FFE066"/>
  <ellipse cx="10.5" cy="18" rx="1" ry="1.5" fill="#FFE066"/>
  <ellipse cx="13.5" cy="18" rx="1" ry="1.5" fill="#FFE066"/>
</svg>`;
const LINK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;
const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
const CHECK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
const CLOSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

// Check if we're on demo page (google.com)
function isDemoMode() {
  return window.location.hostname.includes("google.com");
}

// Extract ticket ID from Zendesk URL
function getTicketIdFromUrl() {
  // Demo mode on google.com
  if (isDemoMode()) {
    return "12345";
  }

  // Zendesk ticket URL pattern: /agent/tickets/{id}
  const match = window.location.pathname.match(/\/agent\/tickets\/(\d+)/);
  return match ? match[1] : null;
}

// Create the FAB container
function createFAB() {
  const existing = document.getElementById("jam-zendesk-fab");
  if (existing) existing.remove();

  const fab = document.createElement("div");
  fab.id = "jam-zendesk-fab";
  fab.innerHTML = `
    <button class="fab-button" title="Jam + Zendesk">
      ${STRAWBERRY_ICON}
    </button>
    <div class="fab-panel">
      <div class="panel-header">
        <h3 class="panel-title">Jam + Zendesk</h3>
        <button class="panel-close" title="Close">${CLOSE_ICON}</button>
      </div>
      <div class="panel-content" id="jam-panel-content">
        <div class="loading">Loading...</div>
      </div>
    </div>
  `;

  document.body.appendChild(fab);

  // Event listeners
  fab.querySelector(".fab-button").addEventListener("click", togglePanel);
  fab.querySelector(".panel-close").addEventListener("click", closePanel);

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (panelOpen && !fab.contains(e.target)) {
      closePanel();
    }
  });

  // Close on escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panelOpen) {
      closePanel();
    }
  });

  return fab;
}

function togglePanel() {
  panelOpen = !panelOpen;
  const panel = document.querySelector("#jam-zendesk-fab .fab-panel");
  if (panelOpen) {
    panel.classList.add("open");
    loadPanelContent();
  } else {
    panel.classList.remove("open");
  }
}

function closePanel() {
  panelOpen = false;
  document.querySelector("#jam-zendesk-fab .fab-panel")?.classList.remove("open");
}

async function loadPanelContent() {
  const content = document.getElementById("jam-panel-content");

  // Demo mode - use mock data
  if (isDemoMode()) {
    settings = DEMO_SETTINGS;
    currentTicket = DEMO_TICKET;
    renderPanelContent();
    return;
  }

  // Load settings
  settings = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, resolve);
  });

  if (!settings?.recordingUrl || !settings?.subdomain || !settings?.apiToken) {
    content.innerHTML = `
      <div class="not-configured">
        <p>Please configure the extension first.</p>
        <p>Click the extension icon to open settings.</p>
      </div>
    `;
    return;
  }

  // Fetch ticket data
  content.innerHTML = `<div class="loading">Loading ticket data...</div>`;

  try {
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "FETCH_TICKET", ticketId: currentTicketId },
        resolve
      );
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    currentTicket = response.ticket;
    renderPanelContent();
  } catch (error) {
    content.innerHTML = `<div class="error">Failed to load ticket: ${error.message}</div>`;
  }
}

function renderPanelContent() {
  if (!currentTicket || !settings) return;

  const content = document.getElementById("jam-panel-content");
  const recordingLink = generateRecordingLink(
    settings.recordingUrl,
    currentTicket,
    window.location.href
  );

  const demoNotice = isDemoMode()
    ? `<div class="demo-notice">Demo Mode - Testing on Google</div>`
    : "";

  content.innerHTML = `
    ${demoNotice}
    <div class="panel-section">
      <div class="ticket-info">
        <span class="ticket-id">#${currentTicket.id}</span>
        <span class="ticket-requester">${escapeHtml(currentTicket.requesterName)}</span>
      </div>
      <div class="ticket-subject">${escapeHtml(currentTicket.subject)}</div>
    </div>
    <div class="panel-section">
      <div class="section-label">
        ${LINK_ICON}
        Recording Link
      </div>
      <div class="link-box">${escapeHtml(recordingLink)}</div>
      <div class="btn-row">
        <button class="copy-btn copy-btn-solid" data-copy="link">
          ${COPY_ICON}
          Copy Link
        </button>
        <a href="${recordingLink}" target="_blank" class="copy-btn copy-btn-outline">
          Open Link
        </a>
      </div>
    </div>
  `;

  // Copy button handler
  content.querySelector('[data-copy="link"]').addEventListener("click", async (e) => {
    await copyWithFeedback(e.currentTarget, recordingLink);
  });
}

async function copyWithFeedback(button, text) {
  const originalHTML = button.innerHTML;
  try {
    await navigator.clipboard.writeText(text);
    button.innerHTML = `${CHECK_ICON} Copied!`;
    setTimeout(() => {
      button.innerHTML = originalHTML;
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Watch for URL changes (SPA navigation)
function watchUrlChanges() {
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      handleUrlChange();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also handle popstate
  window.addEventListener("popstate", handleUrlChange);
}

function handleUrlChange() {
  const ticketId = getTicketIdFromUrl();

  if (ticketId) {
    currentTicketId = ticketId;
    currentTicket = null;
    if (!document.getElementById("jam-zendesk-fab")) {
      createFAB();
    }
    if (panelOpen) {
      loadPanelContent();
    }
  } else {
    document.getElementById("jam-zendesk-fab")?.remove();
    currentTicketId = null;
    currentTicket = null;
    panelOpen = false;
  }
}

// Listen for settings updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SETTINGS_UPDATED") {
    settings = null;
    if (panelOpen) {
      loadPanelContent();
    }
  }
});

// Initialize
function init() {
  handleUrlChange();
  watchUrlChanges();
}

// Wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
