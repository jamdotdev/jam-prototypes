"use client";

import { Card, Flex, Text, Badge } from "@radix-ui/themes";
import { PersonIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import type { Issue } from "../lib/types";
import { getStatusColor, getStatusLabel } from "../lib/utils";
import { PYLON_BASE_URL } from "../lib/constants";

interface IssueCardProps {
  issue: Issue;
  selected: boolean;
  onClick: () => void;
}

export function IssueCard({ issue, selected, onClick }: IssueCardProps) {
  const handlePylonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`${PYLON_BASE_URL}/${issue.id}`, "_blank");
  };

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
          <Flex align="center" gap="2">
            <Text size="2" weight="bold" color="gray">
              #{issue.number}
            </Text>
            <ExternalLinkIcon
              onClick={handlePylonClick}
              style={{ cursor: "pointer", opacity: 0.5 }}
              width={14}
              height={14}
            />
          </Flex>
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
