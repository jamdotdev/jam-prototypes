"use client";

import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  Card,
  Badge,
  TextArea,
  TextField,
  Separator,
  Callout,
  Dialog,
  Select,
  IconButton,
  Link,
} from "@radix-ui/themes";
import {
  CopyIcon,
  CheckIcon,
  Link2Icon,
  ChatBubbleIcon,
  PersonIcon,
  ReloadIcon,
  ExclamationTriangleIcon,
  GearIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { useState, useEffect, useCallback } from "react";

const DEFAULT_RECORDING_URL = "https://jam.dev/?jam-recording=8SmwyAu";
const PYLON_BASE_URL = "https://app.usepylon.com/issues";
const PYLON_API_URL = "https://api.usepylon.com";

// Storage keys
const STORAGE_KEYS = {
  recordingUrl: "jam-pylon-recording-url",
  apiToken: "jam-pylon-api-token",
  selectedAgent: "jam-pylon-selected-agent",
  folderId: "jam-pylon-folder-id",
};

// Normalized issue type for both mock and Pylon data
interface Issue {
  id: string;
  number: number;
  title: string;
  customer: string;
  status: string;
  assigneeId?: string;
  assigneeName?: string;
}

interface Agent {
  id: string;
  name: string;
  email: string;
}

// Pylon API response types
interface PylonIssue {
  id: string;
  number: number;
  title: string;
  state: string;
  requester?: {
    name?: string;
    email?: string;
  };
  assignee?: {
    id: string;
    name?: string;
    email?: string;
  };
}

interface PylonUser {
  id: string;
  name: string;
  email: string;
}

interface PylonSearchResponse {
  data: PylonIssue[];
  request_id: string;
}

interface PylonUsersResponse {
  data: PylonUser[];
  request_id: string;
}

// Mock data
const mockAgents: Agent[] = [
  { id: "usr_001", name: "Sarah Chen", email: "sarah@company.com" },
  { id: "usr_002", name: "Mike Johnson", email: "mike@company.com" },
  { id: "usr_003", name: "Emily Davis", email: "emily@company.com" },
];

const mockIssues: Issue[] = [
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

// Convert Pylon issue to our normalized format
function normalizePylonIssue(pylonIssue: PylonIssue): Issue {
  return {
    id: pylonIssue.id,
    number: pylonIssue.number,
    title: pylonIssue.title,
    customer:
      pylonIssue.requester?.name || pylonIssue.requester?.email || "Unknown",
    status: pylonIssue.state,
    assigneeId: pylonIssue.assignee?.id,
    assigneeName: pylonIssue.assignee?.name || pylonIssue.assignee?.email,
  };
}

// Fetch issues from Pylon API
async function fetchPylonIssues(
  apiToken: string,
  assigneeId?: string
): Promise<Issue[]> {
  const filters: Record<string, unknown> = {
    field: "state",
    operator: "in",
    values: ["new", "waiting_on_you", "waiting_on_customer"],
  };

  // Add assignee filter if selected
  const body: Record<string, unknown> = { limit: 50 };
  if (assigneeId) {
    body.filters = {
      operator: "and",
      filters: [
        filters,
        { field: "assignee_id", operator: "equals", value: assigneeId },
      ],
    };
  } else {
    body.filters = filters;
  }

  const response = await fetch(`${PYLON_API_URL}/issues/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  const data: PylonSearchResponse = await response.json();
  return data.data.map(normalizePylonIssue);
}

// Fetch users/agents from Pylon API
async function fetchPylonAgents(apiToken: string): Promise<Agent[]> {
  const response = await fetch(`${PYLON_API_URL}/users/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit: 100 }),
  });

  if (!response.ok) {
    return [];
  }

  const data: PylonUsersResponse = await response.json();
  return data.data.map((u) => ({ id: u.id, name: u.name, email: u.email }));
}

function getStatusColor(status: string) {
  switch (status) {
    case "new":
      return "blue";
    case "waiting_on_you":
      return "orange";
    case "waiting_on_customer":
      return "yellow";
    case "on_hold":
      return "gray";
    case "closed":
      return "green";
    default:
      return "gray";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "new":
      return "New";
    case "waiting_on_you":
      return "Waiting on you";
    case "waiting_on_customer":
      return "Waiting on customer";
    case "on_hold":
      return "On hold";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

function generateRecordingLink(issue: Issue, baseUrl: string, folderId?: string): string {
  const params = new URLSearchParams();
  params.set("jam-title", `[${issue.number}] ${issue.title}`);
  params.set("jam-reference", `${PYLON_BASE_URL}/${issue.id}`);
  if (folderId?.trim()) {
    params.set("jam-folder", folderId.trim());
  }

  // Check if baseUrl already has query params
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${params.toString()}`;
}

function generateMessage(issue: Issue, link: string): string {
  return `Hi ${issue.customer.split(" ")[0]},

To help us investigate this issue, could you please record what you're experiencing using this link:

${link}

It only takes a few seconds and will automatically capture all the technical details we need.

Thanks!`;
}

function CopyButton({
  text,
  label,
  variant = "soft",
}: {
  text: string;
  label: string;
  variant?: "soft" | "solid";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size="2"
      variant={variant}
      onClick={handleCopy}
      style={{ cursor: "pointer", minWidth: 140 }}
    >
      {copied ? (
        <>
          <CheckIcon />
          Copied!
        </>
      ) : (
        <>
          <CopyIcon />
          {label}
        </>
      )}
    </Button>
  );
}

function IssueCard({
  issue,
  selected,
  onClick,
}: {
  issue: Issue;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      size="2"
      onClick={onClick}
      style={{
        cursor: "pointer",
        border: selected
          ? "2px solid var(--accent-9)"
          : "2px solid transparent",
        transition: "all 0.15s ease",
      }}
    >
      <Flex direction="column" gap="2">
        <Flex justify="between" align="center">
          <Text size="2" weight="bold" color="gray">
            #{issue.number}
          </Text>
          <Badge color={getStatusColor(issue.status)} variant="soft" size="1">
            {getStatusLabel(issue.status)}
          </Badge>
        </Flex>
        <Text size="3" weight="medium">
          {issue.title}
        </Text>
        <Flex align="center" gap="3">
          <Flex align="center" gap="1">
            <PersonIcon />
            <Text size="2" color="gray">
              {issue.customer}
            </Text>
          </Flex>
          {issue.assigneeName && (
            <Text size="1" color="gray">
              → {issue.assigneeName}
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

// Settings Dialog Component
function SettingsDialog({
  open,
  onOpenChange,
  recordingUrl,
  setRecordingUrl,
  folderId,
  setFolderId,
  apiToken,
  setApiToken,
  onSave,
  onDisconnect,
  isConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordingUrl: string;
  setRecordingUrl: (url: string) => void;
  folderId: string;
  setFolderId: (id: string) => void;
  apiToken: string;
  setApiToken: (token: string) => void;
  onSave: () => void;
  onDisconnect: () => void;
  isConnected: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 500 }}>
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title>Settings</Dialog.Title>
          <Dialog.Close>
            <IconButton variant="ghost" color="gray">
              <Cross2Icon />
            </IconButton>
          </Dialog.Close>
        </Flex>

        <Flex direction="column" gap="5">
          {/* Recording Link */}
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              Jam Recording Link
            </Text>
            <TextField.Root
              size="2"
              placeholder="https://jam.dev/?jam-recording=your-id"
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
            />
            <Text size="1" color="gray">
              Create your recording link at{" "}<Link href="https://jam.dev/s/recording-links" target="_blank">jam.dev/s/recording-links</Link>
            </Text>
          </Flex>

          {/* Destination Folder */}
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              Destination Folder ID <Text size="1" color="gray">(optional)</Text>
            </Text>
            <TextField.Root
              size="2"
              placeholder="e.g. ABC123"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            />
            <Text size="1" color="gray">
              Find folder IDs at the end of the Jam folder url (e.g. '/23sy')
            </Text>
          </Flex>

          <Separator size="4" />

          {/* Pylon API Token */}
          <Flex direction="column" gap="2">
            <Flex align="center" gap="2">
              <Text size="2" weight="medium">
                Pylon API Token
              </Text>
              {isConnected && (
                <Badge color="green" variant="soft" size="1">
                  Connected
                </Badge>
              )}
            </Flex>
            <TextField.Root
              size="2"
              type="password"
              placeholder="pylon_api_token_..."
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
            <Text size="1" color="gray">
              Get your API token from Pylon → Settings → API (Admin only)
            </Text>
          </Flex>

          <Separator size="4" />

          <Flex gap="2" justify="end">
            {isConnected && (
              <Button
                variant="outline"
                color="red"
                onClick={() => {
                  onDisconnect();
                  onOpenChange(false);
                }}
                style={{ cursor: "pointer" }}
              >
                Disconnect
              </Button>
            )}
            <Button
              variant="solid"
              onClick={() => {
                onSave();
                onOpenChange(false);
              }}
              style={{ cursor: "pointer" }}
            >
              Save & Connect
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// Setup Screen Component
function SetupScreen({
  recordingUrl,
  setRecordingUrl,
  apiToken,
  setApiToken,
  onConnect,
  isLoading,
  error,
}: {
  recordingUrl: string;
  setRecordingUrl: (url: string) => void;
  apiToken: string;
  setApiToken: (token: string) => void;
  onConnect: () => void;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <Box style={{ minHeight: "100vh", background: "var(--gray-1)" }}>
      <Container size="1" py="9">
        <Flex direction="column" gap="6" align="center">
          <Flex direction="column" gap="2" align="center">
            <Flex
              align="center"
              justify="center"
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: "linear-gradient(135deg, #7c3aed, #ec4899)",
              }}
            >
              <Link2Icon width={28} height={28} color="white" />
            </Flex>
            <Heading size="7" align="center">
              Jam + Pylon
            </Heading>
            <Text size="3" color="gray" align="center">
              Generate Jam recording links for support conversations
            </Text>
          </Flex>

          <Card size="3" style={{ width: "100%", maxWidth: 400 }}>
            <Flex direction="column" gap="4">
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">
                  Jam Recording Link
                </Text>
                <TextField.Root
                  size="3"
                  placeholder="https://jam.dev/?jam-recording=your-id"
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                />
                <Text size="1" color="gray">
                  Create your recording link at{" "}<Link href="https://jam.dev/s/recording-links" target="_blank">jam.dev/s/recording-links</Link>
                </Text>
              </Flex>

              <Flex direction="column" gap="2">
                <Text size="2" weight="medium">
                  Pylon API Token
                </Text>
                <TextField.Root
                  size="3"
                  type="password"
                  placeholder="pylon_api_token_..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <Text size="1" color="gray">
                  Get from Pylon → Settings → API (Admin only)
                </Text>
              </Flex>

              {error && (
                <Callout.Root color="red" size="1">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}

              <Button
                size="3"
                onClick={onConnect}
                disabled={isLoading || !recordingUrl.trim()}
                style={{ cursor: "pointer" }}
              >
                {isLoading ? (
                  <>
                    <ReloadIcon className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Get Started"
                )}
              </Button>

              <Text size="1" color="gray" align="center">
                Leave API token empty to use demo data
              </Text>
            </Flex>
          </Card>
        </Flex>
      </Container>
    </Box>
  );
}

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [baseRecordingUrl, setBaseRecordingUrl] = useState(DEFAULT_RECORDING_URL);
  const [folderId, setFolderId] = useState("");
  const [pylonApiToken, setPylonApiToken] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");

  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [issues, setIssues] = useState<Issue[]>(mockIssues);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem(STORAGE_KEYS.recordingUrl);
    const savedFolderId = localStorage.getItem(STORAGE_KEYS.folderId);
    const savedToken = localStorage.getItem(STORAGE_KEYS.apiToken);
    const savedAgent = localStorage.getItem(STORAGE_KEYS.selectedAgent);

    if (savedUrl) setBaseRecordingUrl(savedUrl);
    if (savedFolderId) setFolderId(savedFolderId);
    if (savedToken) setPylonApiToken(savedToken);
    if (savedAgent) setSelectedAgentId(savedAgent);

    // If we have a saved URL, consider setup complete
    if (savedUrl && savedUrl !== DEFAULT_RECORDING_URL) {
      setIsSetupComplete(true);
      // Auto-connect if we have a token
      if (savedToken) {
        setIsConnected(true);
      }
    }

    setIsInitialized(true);
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.recordingUrl, baseRecordingUrl);
    localStorage.setItem(STORAGE_KEYS.folderId, folderId);
    if (pylonApiToken) {
      localStorage.setItem(STORAGE_KEYS.apiToken, pylonApiToken);
    }
  }, [baseRecordingUrl, folderId, pylonApiToken]);

  // Save selected agent to localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEYS.selectedAgent, selectedAgentId);
    }
  }, [selectedAgentId, isInitialized]);

  const fetchData = useCallback(
    async (agentFilter?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        if (pylonApiToken) {
          const [fetchedIssues, fetchedAgents] = await Promise.all([
            fetchPylonIssues(
              pylonApiToken,
              agentFilter && agentFilter !== "all" ? agentFilter : undefined
            ),
            fetchPylonAgents(pylonApiToken),
          ]);
          setIssues(fetchedIssues);
          if (fetchedAgents.length > 0) {
            setAgents(fetchedAgents);
          }
          setIsConnected(true);
        } else {
          // Use mock data with filter
          const filtered =
            agentFilter && agentFilter !== "all"
              ? mockIssues.filter((i) => i.assigneeId === agentFilter)
              : mockIssues;
          setIssues(filtered);
          setAgents(mockAgents);
          setIsConnected(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setIssues(mockIssues);
        setAgents(mockAgents);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    },
    [pylonApiToken]
  );

  // Fetch data when agent filter changes
  useEffect(() => {
    if (isSetupComplete && isInitialized) {
      fetchData(selectedAgentId);
    }
  }, [selectedAgentId, isSetupComplete, isInitialized, fetchData]);

  const handleConnect = async () => {
    saveSettings();
    setIsSetupComplete(true);
    await fetchData(selectedAgentId);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEYS.apiToken);
    setPylonApiToken("");
    setIsConnected(false);
    setIssues(mockIssues);
    setAgents(mockAgents);
    setSelectedIssue(null);
  };

  const handleSettingsSave = async () => {
    saveSettings();
    await fetchData(selectedAgentId);
  };

  const recordingLink = selectedIssue
    ? generateRecordingLink(selectedIssue, baseRecordingUrl, folderId)
    : "";
  const message = selectedIssue
    ? generateMessage(selectedIssue, recordingLink)
    : "";

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <Box style={{ minHeight: "100vh", background: "var(--gray-1)" }}>
        <Container size="1" py="9">
          <Flex align="center" justify="center">
            <ReloadIcon className="animate-spin" width={24} height={24} />
          </Flex>
        </Container>
      </Box>
    );
  }

  // Show setup screen if not configured
  if (!isSetupComplete) {
    return (
      <SetupScreen
        recordingUrl={baseRecordingUrl}
        setRecordingUrl={setBaseRecordingUrl}
        apiToken={pylonApiToken}
        setApiToken={setPylonApiToken}
        onConnect={handleConnect}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  // Main app view
  return (
    <Box style={{ minHeight: "100vh", background: "var(--gray-1)" }}>
      <Container size="3" py="4">
        <Flex direction="column" gap="4">
          {/* Header */}
          <Flex justify="between" align="center">
            <Flex align="center" gap="3">
              <Flex
                align="center"
                justify="center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #7c3aed, #ec4899)",
                }}
              >
                <Link2Icon width={18} height={18} color="white" />
              </Flex>
              <Box>
                <Heading size="5">Jam + Pylon</Heading>
              </Box>
              {isConnected ? (
                <Badge color="green" variant="soft" size="1">
                  Connected
                </Badge>
              ) : (
                <Badge color="gray" variant="soft" size="1">
                  Demo
                </Badge>
              )}
            </Flex>

            <Flex align="center" gap="2">
              <Button
                size="2"
                variant="ghost"
                onClick={() => fetchData(selectedAgentId)}
                disabled={isLoading}
                style={{ cursor: "pointer" }}
              >
                <ReloadIcon className={isLoading ? "animate-spin" : ""} />
              </Button>
              <IconButton
                size="2"
                variant="ghost"
                onClick={() => setSettingsOpen(true)}
                style={{ cursor: "pointer" }}
              >
                <GearIcon />
              </IconButton>
            </Flex>
          </Flex>

          {/* Agent Filter */}
          <Flex justify="between" align="center">
            <Text size="2" weight="medium" color="gray">
              Conversations
            </Text>
            <Select.Root
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
            >
              <Select.Trigger placeholder="Filter by agent" />
              <Select.Content>
                <Select.Item value="all">All agents</Select.Item>
                <Select.Separator />
                {agents.map((agent) => (
                  <Select.Item key={agent.id} value={agent.id}>
                    {agent.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {/* Issue List */}
          {isLoading ? (
            <Card size="3">
              <Flex align="center" justify="center" py="6" gap="2">
                <ReloadIcon className="animate-spin" />
                <Text color="gray">Loading conversations...</Text>
              </Flex>
            </Card>
          ) : issues.length === 0 ? (
            <Card size="3">
              <Flex align="center" justify="center" py="6">
                <Text color="gray">No open conversations found</Text>
              </Flex>
            </Card>
          ) : (
            <Box
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 12,
              }}
            >
              {issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  selected={selectedIssue?.id === issue.id}
                  onClick={() => setSelectedIssue(issue)}
                />
              ))}
            </Box>
          )}

          {/* Generated Output */}
          {selectedIssue && (
            <Flex direction="column" gap="4">
              <Separator size="4" />

              {/* Recording Link */}
              <Card size="3">
                <Flex direction="column" gap="3">
                  <Flex align="center" gap="2">
                    <Link2Icon />
                    <Text size="2" weight="medium">
                      Recording Link for #{selectedIssue.number}
                    </Text>
                  </Flex>
                  <Box
                    style={{
                      padding: "12px 16px",
                      background: "var(--gray-3)",
                      borderRadius: 8,
                      wordBreak: "break-all",
                      fontFamily: "monospace",
                      fontSize: 13,
                    }}
                  >
                    {recordingLink}
                  </Box>
                  <Flex gap="2">
                    <CopyButton text={recordingLink} label="Copy Link" />
                    <Button
                      size="2"
                      variant="outline"
                      asChild
                      style={{ cursor: "pointer" }}
                    >
                      <a href={recordingLink} target="_blank" rel="noopener">
                        Open Link
                      </a>
                    </Button>
                  </Flex>
                </Flex>
              </Card>

              {/* Message Template */}
              <Card size="3">
                <Flex direction="column" gap="3">
                  <Flex align="center" gap="2">
                    <ChatBubbleIcon />
                    <Text size="2" weight="medium">
                      Message for {selectedIssue.customer}
                    </Text>
                  </Flex>
                  <TextArea
                    size="2"
                    value={message}
                    readOnly
                    style={{
                      minHeight: 160,
                      fontFamily: "inherit",
                      resize: "vertical",
                    }}
                  />
                  <CopyButton
                    text={message}
                    label="Copy Message"
                    variant="solid"
                  />
                </Flex>
              </Card>
            </Flex>
          )}

          {/* Empty State */}
          {!selectedIssue && !isLoading && issues.length > 0 && (
            <Card size="3">
              <Flex
                direction="column"
                align="center"
                justify="center"
                gap="2"
                py="4"
              >
                <Text size="2" color="gray">
                  Select a conversation to generate a recording link
                </Text>
              </Flex>
            </Card>
          )}
        </Flex>
      </Container>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        recordingUrl={baseRecordingUrl}
        setRecordingUrl={setBaseRecordingUrl}
        folderId={folderId}
        setFolderId={setFolderId}
        apiToken={pylonApiToken}
        setApiToken={setPylonApiToken}
        onSave={handleSettingsSave}
        onDisconnect={handleDisconnect}
        isConnected={isConnected}
      />
    </Box>
  );
}
