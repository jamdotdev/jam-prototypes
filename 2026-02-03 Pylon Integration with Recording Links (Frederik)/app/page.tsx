"use client";

import { useState, useEffect, useCallback } from "react";
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
  Select,
  IconButton,
  Checkbox,
} from "@radix-ui/themes";
import {
  Link2Icon,
  ChatBubbleIcon,
  ReloadIcon,
  ExclamationTriangleIcon,
  GearIcon,
  MagnifyingGlassIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";

// Components
import { CopyButton } from "./components/CopyButton";
import { IssueCard } from "./components/IssueCard";
import { SetupScreen } from "./components/SetupScreen";
import { SettingsDialog } from "./components/SettingsDialog";
import { Toast } from "./components/Toast";

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
import { fetchPylonIssues, fetchPylonAgents } from "./lib/api";

const ALL_STATUSES = ["new", "waiting_on_you", "waiting_on_customer"];

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
          const filtered =
            agentFilter && agentFilter !== "all"
              ? mockIssues.filter((i) => i.assigneeId === agentFilter)
              : mockIssues;
          setIssues(filtered);
          setAgents(mockAgents);
          setIsConnected(false);
        }
        setLastUpdated(new Date());
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
    const matchesSearch =
      !searchQuery ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(issue.number).includes(searchQuery);
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

          {/* Issue List */}
          {isLoading ? (
            <Box
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 12,
              }}
            >
              {[1, 2, 3, 4].map((i) => (
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
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 12,
              }}
            >
              {filteredIssues.map((issue) => (
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
                    <CopyButton
                      text={recordingLink}
                      label="Copy Link"
                      onCopy={() => showToast("Link copied!")}
                    />
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
                    onCopy={() => showToast("Message copied!")}
                  />
                </Flex>
              </Card>
            </Flex>
          )}

          {/* Empty State */}
          {!selectedIssue && !isLoading && filteredIssues.length > 0 && (
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
