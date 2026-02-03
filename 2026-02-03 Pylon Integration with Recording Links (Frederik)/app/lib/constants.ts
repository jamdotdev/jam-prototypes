import type { Agent, Issue } from "./types";

export const DEFAULT_RECORDING_URL = "https://jam.dev/?jam-recording=8SmwyAu";
export const PYLON_BASE_URL = "https://app.usepylon.com/issues";
export const PYLON_API_URL = "https://api.usepylon.com";

export const DEFAULT_MESSAGE_TEMPLATE = `Hi {firstName},

To help us investigate this issue, could you please record what you're experiencing using this link:

{link}

It only takes a few seconds and will automatically capture all the technical details we need.

Thanks!`;

export const STORAGE_KEYS = {
  recordingUrl: "jam-pylon-recording-url",
  apiToken: "jam-pylon-api-token",
  selectedAgent: "jam-pylon-selected-agent",
  folderId: "jam-pylon-folder-id",
  messageTemplate: "jam-pylon-message-template",
} as const;

// Mock data for demo mode
export const mockAgents: Agent[] = [
  { id: "usr_001", name: "Sarah Chen", email: "sarah@company.com" },
  { id: "usr_002", name: "Mike Johnson", email: "mike@company.com" },
  { id: "usr_003", name: "Emily Davis", email: "emily@company.com" },
];

export const mockIssues: Issue[] = [
  {
    id: "iss_abc123",
    number: 1042,
    title: "Login page not loading",
    customer: "Alice Smith",
    status: "waiting_on_customer",
    assigneeId: "usr_001",
    assigneeName: "Sarah Chen",
  },
  {
    id: "iss_def456",
    number: 1043,
    title: "Payment failed at checkout",
    customer: "Bob Johnson",
    status: "new",
    assigneeId: "usr_002",
    assigneeName: "Mike Johnson",
  },
  {
    id: "iss_ghi789",
    number: 1044,
    title: "Mobile app crashes on startup",
    customer: "Carol White",
    status: "waiting_on_you",
    assigneeId: "usr_001",
    assigneeName: "Sarah Chen",
  },
  {
    id: "iss_jkl012",
    number: 1045,
    title: "Unable to export reports",
    customer: "David Lee",
    status: "waiting_on_customer",
    assigneeId: "usr_003",
    assigneeName: "Emily Davis",
  },
  {
    id: "iss_mno345",
    number: 1046,
    title: "Dashboard shows wrong data",
    customer: "Eva Martinez",
    status: "new",
    assigneeId: "usr_002",
    assigneeName: "Mike Johnson",
  },
];
