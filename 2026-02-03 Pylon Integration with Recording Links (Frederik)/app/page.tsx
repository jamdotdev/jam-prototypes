"use client";

import { useState, useEffect, useCallback } from "react";
import { track } from "@vercel/analytics";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  Card,
  Badge,
  TextField,
  Callout,
  Select,
  IconButton,
  Checkbox,
} from "@radix-ui/themes";
import {
  Link2Icon,
  ReloadIcon,
  ExclamationTriangleIcon,
  GearIcon,
  MagnifyingGlassIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";

// Components
import { IssueCard } from "./components/IssueCard";
import { SetupScreen } from "./components/SetupScreen";
import { SettingsDialog } from "./components/SettingsDialog";
import { Toast } from "./components/Toast";
import { SlideOverPanel } from "./components/SlideOverPanel";
import { OutputPanel } from "./components/OutputPanel";

// Lib
import type { Issue, Agent } from "./lib/types";
import {
  DEFAULT_RECORDING_URL,
  DEFAULT_MESSAGE_TEMPLATE,
  STORAGE_KEYS,
  mockAgents,
  mockIssues,
} from "./lib/constants";
import { generateRecordingLink, generateMessage, formatTimeAgo } from "./lib/utils";
import { fetchPylonIssues, fetchPylonAgents, fetchPylonMe } from "./lib/api";

const ALL_STATUSES = ["new", "waiting_on_you", "waiting_on_customer"];

// Polling intervals (in ms)
const ACTIVE_POLL_INTERVAL = 30 * 1000; // 30 seconds when tab is active
const BACKGROUND_POLL_INTERVAL = 3 * 60 * 1000; // 3 minutes when tab is in background

export default function Home() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [baseRecordingUrl, setBaseRecordingUrl] = useState(DEFAULT_RECORDING_URL);
  const [folderId, setFolderId] = useState("");
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE);
  const [pylonApiToken, setPylonApiToken] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");

  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [issues, setIssues] = useState<Issue[]>(mockIssues);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  // Search & filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>(ALL_STATUSES);

  // UX polish
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedUrl = localStorage.getItem(STORAGE_KEYS.recordingUrl);
    const savedFolderId = localStorage.getItem(STORAGE_KEYS.folderId);
    const savedTemplate = localStorage.getItem(STORAGE_KEYS.messageTemplate);
    const savedToken = localStorage.getItem(STORAGE_KEYS.apiToken);
    const savedAgent = localStorage.getItem(STORAGE_KEYS.selectedAgent);

    if (savedUrl) setBaseRecordingUrl(savedUrl);
    if (savedFolderId) setFolderId(savedFolderId);
    if (savedTemplate) setMessageTemplate(savedTemplate);
    if (savedToken) setPylonApiToken(savedToken);
    if (savedAgent) setSelectedAgentId(savedAgent);

    if (savedUrl && savedUrl !== DEFAULT_RECORDING_URL) {
      setIsSetupComplete(true);
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
    localStorage.setItem(STORAGE_KEYS.messageTemplate, messageTemplate);
    if (pylonApiToken) {
      localStorage.setItem(STORAGE_KEYS.apiToken, pylonApiToken);
    }
  }, [baseRecordingUrl, folderId, messageTemplate, pylonApiToken]);

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
          const [fetchedIssues, fetchedAgents, meData] = await Promise.all([
            fetchPylonIssues(
              pylonApiToken,
              agentFilter && agentFilter !== "all" ? agentFilter : undefined
            ),
            fetchPylonAgents(pylonApiToken),
            fetchPylonMe(pylonApiToken),
          ]);
          setIssues(fetchedIssues);
          if (fetchedAgents.length > 0) {
            setAgents(fetchedAgents);
          }
          setWorkspaceName(meData?.name || null);
          setIsConnected(true);
        } else {
          const filtered =
            agentFilter && agentFilter !== "all"
              ? mockIssues.filter((i) => i.assigneeId === agentFilter)
              : mockIssues;
          setIssues(filtered);
          setAgents(mockAgents);
          setIsConnected(false);
          setWorkspaceName(null);
        }
        setLastUpdated(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setIssues(mockIssues);
        setAgents(mockAgents);
        setIsConnected(false);
        setWorkspaceName(null);
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

  // Background polling with visibility-aware intervals
  useEffect(() => {
    if (!isSetupComplete || !isInitialized || !pylonApiToken) {
      return; // Only poll when connected to Pylon API
    }

    let pollInterval: NodeJS.Timeout | null = null;

    const startPolling = (interval: number) => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(() => {
        fetchData(selectedAgentId);
      }, interval);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is in background - poll less frequently
        startPolling(BACKGROUND_POLL_INTERVAL);
      } else {
        // Tab is active - poll more frequently
        startPolling(ACTIVE_POLL_INTERVAL);
      }
    };

    // Start with appropriate interval based on current visibility
    startPolling(document.hidden ? BACKGROUND_POLL_INTERVAL : ACTIVE_POLL_INTERVAL);

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSetupComplete, isInitialized, pylonApiToken, selectedAgentId, fetchData]);

  const handleConnect = async () => {
    saveSettings();
    setIsSetupComplete(true);
    await fetchData(selectedAgentId);
    track("pylon_connected");
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
    track("settings_saved");
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const toggleStatus = (status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilters(ALL_STATUSES);
  };

  // Filter issues based on search and status
  const filteredIssues = issues.filter((issue) => {
    const query = searchQuery.toLowerCase();
    const queryWithoutHash = query.replace(/^#/, ""); // Strip leading # for ticket number search
    const matchesSearch =
      !searchQuery ||
      issue.title.toLowerCase().includes(query) ||
      issue.customer.toLowerCase().includes(query) ||
      String(issue.number).includes(queryWithoutHash);
    const matchesStatus =
      statusFilters.length === 0 || statusFilters.includes(issue.status);
    return matchesSearch && matchesStatus;
  });

  const hasActiveFilters = searchQuery || statusFilters.length !== ALL_STATUSES.length;

  const recordingLink = selectedIssue
    ? generateRecordingLink(selectedIssue, baseRecordingUrl, folderId)
    : "";
  const selectedAgentName = agents.find((a) => a.id === selectedAgentId)?.name;
  const message = selectedIssue
    ? generateMessage(selectedIssue, recordingLink, messageTemplate, selectedAgentName)
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

  // Issue grid content
  const issueGridContent = isLoading ? (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12,
      }}
    >
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} size="2">
          <Flex direction="column" gap="2">
            <Flex justify="between" align="center">
              <Box
                style={{
                  width: 60,
                  height: 16,
                  background: "var(--gray-4)",
                  borderRadius: 4,
                }}
              />
              <Box
                style={{
                  width: 80,
                  height: 20,
                  background: "var(--gray-4)",
                  borderRadius: 4,
                }}
              />
            </Flex>
            <Box
              style={{
                width: "100%",
                height: 20,
                background: "var(--gray-4)",
                borderRadius: 4,
              }}
            />
            <Box
              style={{
                width: "60%",
                height: 16,
                background: "var(--gray-4)",
                borderRadius: 4,
              }}
            />
          </Flex>
        </Card>
      ))}
    </Box>
  ) : filteredIssues.length === 0 ? (
    <Card size="3">
      <Flex align="center" justify="center" py="6" direction="column" gap="2">
        <Text color="gray">
          {hasActiveFilters
            ? "No conversations match your filters"
            : "No open conversations found"}
        </Text>
        {hasActiveFilters && (
          <Button
            size="1"
            variant="soft"
            onClick={clearFilters}
            style={{ cursor: "pointer" }}
          >
            Clear filters
          </Button>
        )}
      </Flex>
    </Card>
  ) : (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 12,
      }}
    >
      {filteredIssues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          selected={selectedIssue?.id === issue.id}
          onClick={() => {
            track("issue_selected", { issueNumber: issue.number, status: issue.status });
            setSelectedIssue(issue);
          }}
        />
      ))}
    </Box>
  );

  // Main app view
  return (
    <Box style={{ minHeight: "100vh", background: "var(--gray-1)" }}>
      {/* Header */}
      <Box style={{ borderBottom: "1px solid var(--gray-4)", background: "var(--gray-1)" }}>
        <Container size="4" py="3">
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
                  {workspaceName || "Connected"}
                </Badge>
              ) : (
                <Badge color="gray" variant="soft" size="1">
                  Demo
                </Badge>
              )}
            </Flex>

            <Flex align="center" gap="2">
              {lastUpdated && (
                <Text size="1" color="gray">
                  {formatTimeAgo(lastUpdated)}
                </Text>
              )}
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
        </Container>
      </Box>

      {/* Main content with side-by-side layout */}
      <Flex style={{ minHeight: "calc(100vh - 65px)" }}>
        {/* Left: Issues */}
        <Box
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
          }}
        >
          <Container size="4">
            <Flex direction="column" gap="4">
              {/* Search & Filters */}
              <Flex gap="3" wrap="wrap" align="center">
                <Box style={{ flex: 1, minWidth: 200 }}>
                  <TextField.Root
                    size="2"
                    placeholder="Search issues..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  >
                    <TextField.Slot>
                      <MagnifyingGlassIcon height="16" width="16" />
                    </TextField.Slot>
                    {searchQuery && (
                      <TextField.Slot>
                        <IconButton
                          size="1"
                          variant="ghost"
                          onClick={() => setSearchQuery("")}
                        >
                          <Cross2Icon height="14" width="14" />
                        </IconButton>
                      </TextField.Slot>
                    )}
                  </TextField.Root>
                </Box>

                <Flex gap="3" align="center">
                  <Flex gap="2" align="center">
                    <Text as="label" size="2">
                      <Flex gap="1" align="center">
                        <Checkbox
                          size="1"
                          checked={statusFilters.includes("new")}
                          onCheckedChange={() => toggleStatus("new")}
                        />
                        <Badge color="blue" variant="soft" size="1">
                          New
                        </Badge>
                      </Flex>
                    </Text>
                    <Text as="label" size="2">
                      <Flex gap="1" align="center">
                        <Checkbox
                          size="1"
                          checked={statusFilters.includes("waiting_on_you")}
                          onCheckedChange={() => toggleStatus("waiting_on_you")}
                        />
                        <Badge color="orange" variant="soft" size="1">
                          On you
                        </Badge>
                      </Flex>
                    </Text>
                    <Text as="label" size="2">
                      <Flex gap="1" align="center">
                        <Checkbox
                          size="1"
                          checked={statusFilters.includes("waiting_on_customer")}
                          onCheckedChange={() => toggleStatus("waiting_on_customer")}
                        />
                        <Badge color="yellow" variant="soft" size="1">
                          On customer
                        </Badge>
                      </Flex>
                    </Text>
                  </Flex>

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
              </Flex>

              {/* Results count & clear */}
              <Flex justify="between" align="center">
                <Text size="2" color="gray">
                  {filteredIssues.length === issues.length
                    ? `${issues.length} conversations`
                    : `Showing ${filteredIssues.length} of ${issues.length}`}
                </Text>
                {hasActiveFilters && (
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={clearFilters}
                    style={{ cursor: "pointer" }}
                  >
                    Clear filters
                  </Button>
                )}
              </Flex>

              {error && (
                <Callout.Root color="red" size="1">
                  <Callout.Icon>
                    <ExclamationTriangleIcon />
                  </Callout.Icon>
                  <Callout.Text>{error}</Callout.Text>
                </Callout.Root>
              )}

              {/* Issue Grid */}
              {issueGridContent}
            </Flex>
          </Container>
        </Box>

        {/* Right: Output Panel (Desktop only) */}
        <Box
          className="desktop-panel"
          style={{
            width: 420,
            borderLeft: "1px solid var(--gray-6)",
            background: "var(--gray-2)",
            overflowY: "auto",
            padding: 16,
          }}
        >
          {selectedIssue ? (
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center">
                <Text size="3" weight="medium">
                  #{selectedIssue.number}
                </Text>
                <IconButton
                  size="1"
                  variant="ghost"
                  onClick={() => setSelectedIssue(null)}
                  style={{ cursor: "pointer" }}
                >
                  <Cross2Icon />
                </IconButton>
              </Flex>
              <OutputPanel
                issue={selectedIssue}
                recordingLink={recordingLink}
                message={message}
                onCopyLink={() => {
                  track("link_copied", { issueNumber: selectedIssue.number });
                  showToast("Link copied!");
                }}
                onCopyMessage={() => {
                  track("message_copied", { issueNumber: selectedIssue.number });
                  showToast("Message copied!");
                }}
              />
            </Flex>
          ) : (
            <Flex
              direction="column"
              align="center"
              justify="center"
              gap="3"
              style={{ height: "100%", minHeight: 300 }}
            >
              <Box
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "var(--gray-4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Link2Icon width={24} height={24} />
              </Box>
              <Flex direction="column" align="center" gap="1">
                <Text size="3" weight="medium">
                  Select a conversation
                </Text>
                <Text size="2" color="gray" align="center">
                  Click on a conversation to generate a recording link
                </Text>
              </Flex>
            </Flex>
          )}
        </Box>
      </Flex>

      {/* Mobile: Slide-over Panel */}
      <Box className="mobile-panel">
        <SlideOverPanel
          open={!!selectedIssue}
          onClose={() => setSelectedIssue(null)}
          title={selectedIssue ? `#${selectedIssue.number}` : undefined}
        >
          {selectedIssue && (
            <OutputPanel
              issue={selectedIssue}
              recordingLink={recordingLink}
              message={message}
              onCopyLink={() => {
                track("link_copied", { issueNumber: selectedIssue.number });
                showToast("Link copied!");
              }}
              onCopyMessage={() => {
                track("message_copied", { issueNumber: selectedIssue.number });
                showToast("Message copied!");
              }}
            />
          )}
        </SlideOverPanel>
      </Box>

      {/* Settings Dialog */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        recordingUrl={baseRecordingUrl}
        setRecordingUrl={setBaseRecordingUrl}
        folderId={folderId}
        setFolderId={setFolderId}
        messageTemplate={messageTemplate}
        setMessageTemplate={setMessageTemplate}
        apiToken={pylonApiToken}
        setApiToken={setPylonApiToken}
        onSave={handleSettingsSave}
        onDisconnect={handleDisconnect}
        isConnected={isConnected}
      />

      {/* Toast */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
    </Box>
  );
}
