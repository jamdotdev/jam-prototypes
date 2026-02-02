"use client";

import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  Grid,
  Badge,
  Code,
  Section,
  Link,
} from "@radix-ui/themes";
import {
  CopyIcon,
  CheckIcon,
  RocketIcon,
  MagnifyingGlassIcon,
  LightningBoltIcon,
  CodeIcon,
} from "@radix-ui/react-icons";
import { useState } from "react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="1" onClick={handleCopy} style={{ cursor: "pointer" }}>
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Box className="feature-card">
      <Flex direction="column" gap="3">
        <Box style={{ color: "var(--violet-9)" }}>{icon}</Box>
        <Heading size="4" weight="medium">
          {title}
        </Heading>
        <Text size="2" color="gray">
          {description}
        </Text>
      </Flex>
    </Box>
  );
}

function InstallStep({
  number,
  title,
  code,
}: {
  number: number;
  title: string;
  code: string;
}) {
  return (
    <Box className="install-step">
      <Box className="step-number">{number}</Box>
      <Flex direction="column" gap="2" style={{ flex: 1 }}>
        <Text weight="medium">{title}</Text>
        <Flex align="center" gap="2" className="code-block">
          <Code size="2" style={{ flex: 1 }}>
            {code}
          </Code>
          <CopyButton text={code} />
        </Flex>
      </Flex>
    </Box>
  );
}

export default function Home() {
  return (
    <Box>
      {/* Header */}
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        style={{
          backdropFilter: "blur(12px)",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          borderBottom: "1px solid var(--gray-5)",
          zIndex: 100,
        }}
      >
        <Container size="4">
          <Flex justify="between" align="center" py="3">
            <Flex align="center" gap="2">
              <Box
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text size="2" weight="bold" style={{ color: "white" }}>
                  J
                </Text>
              </Box>
              <Text size="3" weight="bold">
                Jam MCP
              </Text>
              <Badge color="violet" variant="soft" size="1">
                Beta
              </Badge>
            </Flex>
            <Flex gap="4" align="center">
              <Link href="https://github.com/ANG13T/jam-mcp" target="_blank" size="2" color="gray">
                GitHub
              </Link>
              <Link href="https://jam.dev" target="_blank" size="2" color="gray">
                jam.dev
              </Link>
              <Button size="2" variant="soft">
                Get Started
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Hero Section */}
      <Section size="4" className="hero-gradient" pt="9">
        <Container size="3">
          <Flex direction="column" align="center" gap="6" py="9">
            <Badge size="2" color="violet" variant="soft">
              Model Context Protocol
            </Badge>
            <Heading size="9" align="center" weight="bold">
              Bug reports in your{" "}
              <span className="gradient-text">AI workflow</span>
            </Heading>
            <Text size="4" color="gray" align="center" style={{ maxWidth: 600 }}>
              Connect Claude, Cursor, and other AI tools to Jam. Access bug reports,
              session replays, and debugging context without leaving your editor.
            </Text>
            <Flex gap="3" mt="2">
              <Button size="3" variant="solid">
                <RocketIcon />
                Get Started
              </Button>
              <Button size="3" variant="outline">
                View Documentation
              </Button>
            </Flex>

            {/* Quick Install */}
            <Box mt="6" style={{ width: "100%", maxWidth: 500 }}>
              <Flex align="center" gap="2" className="code-block" justify="between">
                <Code size="2">npx @anthropic-ai/create-mcp jam</Code>
                <CopyButton text="npx @anthropic-ai/create-mcp jam" />
              </Flex>
            </Box>
          </Flex>
        </Container>
      </Section>

      {/* Features Section */}
      <Section size="4">
        <Container size="4">
          <Flex direction="column" gap="6">
            <Flex direction="column" gap="2" align="center">
              <Badge size="1" color="gray" variant="soft">
                Features
              </Badge>
              <Heading size="8" align="center">
                Everything your AI needs to debug
              </Heading>
              <Text size="3" color="gray" align="center" style={{ maxWidth: 500 }}>
                Give your AI assistant full context on bugs, so it can help you fix
                them faster.
              </Text>
            </Flex>

            <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="4" mt="4">
              <FeatureCard
                icon={<MagnifyingGlassIcon width={24} height={24} />}
                title="Search Bug Reports"
                description="Query your Jam workspace to find relevant bugs by keyword, status, assignee, or custom filters."
              />
              <FeatureCard
                icon={<CodeIcon width={24} height={24} />}
                title="Console & Network Logs"
                description="Access full console output and network request details from bug session replays."
              />
              <FeatureCard
                icon={<LightningBoltIcon width={24} height={24} />}
                title="Instant Context"
                description="No more copy-pasting. Your AI gets browser info, stack traces, and repro steps automatically."
              />
            </Grid>
          </Flex>
        </Container>
      </Section>

      {/* Install Section */}
      <Section size="4">
        <Container size="3">
          <Flex direction="column" gap="6">
            <Flex direction="column" gap="2" align="center">
              <Badge size="1" color="gray" variant="soft">
                Installation
              </Badge>
              <Heading size="7" align="center">
                Up and running in minutes
              </Heading>
              <Text size="3" color="gray" align="center">
                Three steps to connect Jam to your AI workflow.
              </Text>
            </Flex>

            <Flex direction="column" gap="5" mt="4">
              <InstallStep
                number={1}
                title="Install the Jam MCP server"
                code="npm install -g @anthropic-ai/mcp-jam"
              />
              <InstallStep
                number={2}
                title="Add your Jam API key"
                code="export JAM_API_KEY=your_api_key_here"
              />
              <InstallStep
                number={3}
                title="Configure your MCP client (Claude Desktop, Cursor, etc.)"
                code='{ "mcpServers": { "jam": { "command": "mcp-jam" } } }'
              />
            </Flex>

            <Flex justify="center" mt="4">
              <Button size="3" variant="soft" asChild>
                <Link href="https://docs.jam.dev/mcp" target="_blank">
                  Read Full Documentation
                </Link>
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Section>

      {/* Footer */}
      <Box py="6" style={{ borderTop: "1px solid var(--gray-4)" }}>
        <Container size="4">
          <Flex justify="between" align="center">
            <Text size="2" color="gray">
              Built by Jam
            </Text>
            <Flex gap="4">
              <Link href="https://jam.dev" target="_blank" size="2" color="gray">
                jam.dev
              </Link>
              <Link href="https://github.com/ANG13T/jam-mcp" target="_blank" size="2" color="gray">
                GitHub
              </Link>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}
