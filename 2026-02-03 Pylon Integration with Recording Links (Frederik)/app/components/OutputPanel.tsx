"use client";

import { useRef, useEffect } from "react";
import { Box, Card, Flex, Text, TextArea, Button } from "@radix-ui/themes";
import { Link2Icon, ChatBubbleIcon } from "@radix-ui/react-icons";
import { CopyButton } from "./CopyButton";
import type { Issue } from "../lib/types";

interface OutputPanelProps {
  issue: Issue;
  recordingLink: string;
  message: string;
  onCopyLink?: () => void;
  onCopyMessage?: () => void;
}

export function OutputPanel({
  issue,
  recordingLink,
  message,
  onCopyLink,
  onCopyMessage,
}: OutputPanelProps) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <Flex direction="column" gap="4">
      {/* Recording Link */}
      <Card size="2">
        <Flex direction="column" gap="3">
          <Flex align="center" gap="2">
            <Link2Icon />
            <Text size="2" weight="medium">
              Recording Link for #{issue.number}
            </Text>
          </Flex>
          <Box
            style={{
              padding: "10px 12px",
              background: "var(--gray-3)",
              borderRadius: 6,
              wordBreak: "break-all",
              fontFamily: "monospace",
              fontSize: 12,
            }}
          >
            {recordingLink}
          </Box>
          <Flex gap="2" wrap="wrap">
            <CopyButton
              text={recordingLink}
              label="Copy Link"
              onCopy={onCopyLink}
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
      <Card size="2">
        <Flex direction="column" gap="3">
          <Flex align="center" gap="2">
            <ChatBubbleIcon />
            <Text size="2" weight="medium">
              Message for {issue.customer}
            </Text>
          </Flex>
          <TextArea
            ref={textAreaRef}
            size="2"
            value={message}
            readOnly
            style={{
              minHeight: 80,
              maxHeight: "70vh",
              overflow: "auto",
              fontFamily: "inherit",
              resize: "none",
            }}
          />
          <CopyButton
            text={message}
            label="Copy Message"
            variant="solid"
            onCopy={onCopyMessage}
          />
        </Flex>
      </Card>
    </Flex>
  );
}
