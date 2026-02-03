"use client";

import {
  Flex,
  Text,
  Button,
  Badge,
  TextArea,
  TextField,
  Separator,
  Dialog,
  IconButton,
  Link,
} from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordingUrl: string;
  setRecordingUrl: (url: string) => void;
  folderId: string;
  setFolderId: (id: string) => void;
  messageTemplate: string;
  setMessageTemplate: (template: string) => void;
  apiToken: string;
  setApiToken: (token: string) => void;
  onSave: () => void;
  onDisconnect: () => void;
  isConnected: boolean;
}

export function SettingsDialog({
  open,
  onOpenChange,
  recordingUrl,
  setRecordingUrl,
  folderId,
  setFolderId,
  messageTemplate,
  setMessageTemplate,
  apiToken,
  setApiToken,
  onSave,
  onDisconnect,
  isConnected,
}: SettingsDialogProps) {
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
              Create your recording link at{" "}
              <Link href="https://jam.dev/s/recording-links" target="_blank">
                jam.dev/s/recording-links
              </Link>
            </Text>
          </Flex>

          {/* Destination Folder */}
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              Destination Folder ID{" "}
              <Text size="1" color="gray">
                (optional)
              </Text>
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

          {/* Message Template */}
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium">
              Message Template
            </Text>
            <TextArea
              size="2"
              placeholder="Enter your message template..."
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              style={{ minHeight: 120, fontFamily: "inherit" }}
            />
            <Text size="1" color="gray">
              Variables: {"{firstName}"}, {"{customerName}"}, {"{link}"},{" "}
              {"{issueNumber}"}, {"{issueTitle}"}, {"{agentName}"}
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
