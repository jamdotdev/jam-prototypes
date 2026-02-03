// Generate recording link with Zendesk ticket context
function generateRecordingLink(baseUrl, ticket, ticketUrl) {
  const url = new URL(baseUrl);
  const title = `[${ticket.id}] ${ticket.subject}`;
  url.searchParams.set("jam-title", title);
  url.searchParams.set("jam-reference", ticketUrl);
  return url.toString();
}
