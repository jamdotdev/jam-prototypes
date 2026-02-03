// Cache for ticket data
const ticketCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FETCH_TICKET") {
    handleFetchTicket(message.ticketId)
      .then((ticket) => sendResponse({ success: true, ticket }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === "GET_SETTINGS") {
    chrome.storage.sync.get(
      ["recordingUrl", "subdomain", "email", "apiToken"],
      (result) => {
        sendResponse(result);
      }
    );
    return true;
  }
});

// Fetch ticket with caching
async function handleFetchTicket(ticketId) {
  // Check cache
  const cached = ticketCache.get(ticketId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.ticket;
  }

  // Get credentials
  const { subdomain, email, apiToken } = await chrome.storage.sync.get([
    "subdomain",
    "email",
    "apiToken",
  ]);

  if (!subdomain || !email || !apiToken) {
    throw new Error("Zendesk credentials not configured");
  }

  const credentials = btoa(`${email}/token:${apiToken}`);
  const baseUrl = `https://${subdomain}.zendesk.com/api/v2`;

  // Fetch ticket
  const ticketResponse = await fetch(`${baseUrl}/tickets/${ticketId}.json`, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!ticketResponse.ok) {
    throw new Error(`API error: ${ticketResponse.status}`);
  }

  const ticketData = await ticketResponse.json();
  const zendeskTicket = ticketData.ticket;

  // Fetch requester name
  let requesterName = "Unknown";
  if (zendeskTicket.requester_id) {
    try {
      const userResponse = await fetch(
        `${baseUrl}/users/${zendeskTicket.requester_id}.json`,
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        }
      );
      if (userResponse.ok) {
        const userData = await userResponse.json();
        requesterName = userData.user.name || userData.user.email || "Unknown";
      }
    } catch (e) {
      console.error("Failed to fetch requester:", e);
    }
  }

  const ticket = {
    id: zendeskTicket.id,
    subject: zendeskTicket.subject || "No subject",
    requesterName,
    status: zendeskTicket.status,
  };

  // Cache result
  ticketCache.set(ticketId, { ticket, timestamp: Date.now() });

  return ticket;
}

// Clear old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ticketCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      ticketCache.delete(key);
    }
  }
}, 60 * 1000);
