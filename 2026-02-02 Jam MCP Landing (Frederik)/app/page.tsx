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
  StarFilledIcon,
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
    <Button
      variant="ghost"
      size="1"
      onClick={handleCopy}
      style={{ cursor: "pointer", transition: "transform 0.2s" }}
    >
      {copied ? (
        <CheckIcon style={{ color: "var(--green-9)" }} />
      ) : (
        <CopyIcon />
      )}
    </Button>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}) {
  return (
    <Box
      className="feature-card fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Flex direction="column" gap="4">
        <Box className="feature-icon">{icon}</Box>
        <Heading size="4" weight="bold">
          {title}
        </Heading>
        <Text size="2" style={{ color: "var(--gray-11)", lineHeight: 1.6 }}>
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
  delay = 0,
}: {
  number: number;
  title: string;
  code: string;
  delay?: number;
}) {
  return (
    <Box
      className="install-step fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Box className="step-number">{number}</Box>
      <Flex direction="column" gap="2" style={{ flex: 1 }}>
        <Text weight="medium" size="3">
          {title}
        </Text>
        <Flex align="center" gap="2" className="code-block">
          <Code size="2" style={{ flex: 1, color: "var(--violet-11)" }}>
            {code}
          </Code>
          <CopyButton text={code} />
        </Flex>
      </Flex>
    </Box>
  );
}

function Sparkles() {
  const sparkles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    duration: `${2 + Math.random() * 2}s`,
  }));

  return (
    <>
      {sparkles.map((sparkle) => (
        <Box
          key={sparkle.id}
          className="sparkle"
          style={{
            left: sparkle.left,
            top: sparkle.top,
            animationDelay: sparkle.delay,
            animationDuration: sparkle.duration,
          }}
        />
      ))}
    </>
  );
}

export default function Home() {
  return (
    <Box style={{ position: "relative" }}>
      {/* Header */}
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        style={{
          backdropFilter: "blur(16px)",
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderBottom: "1px solid var(--gray-5)",
          zIndex: 100,
        }}
      >
        <Container size="4">
          <Flex justify="between" align="center" py="3">
            <Flex align="center" gap="2">
              <Box
                className="logo-glow"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background:
                    "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text size="3" weight="bold" style={{ color: "white" }}>
                  J
                </Text>
              </Box>
              <Text size="4" weight="bold">
                Jam MCP
              </Text>
              <Badge
                color="violet"
                variant="soft"
                size="1"
                className="float-badge"
              >
                Beta
              </Badge>
            </Flex>
            <Flex gap="4" align="center">
              <Link
                href="https://github.com/ANG13T/jam-mcp"
                target="_blank"
                size="2"
                color="gray"
                style={{ transition: "color 0.2s" }}
                highContrast
              >
                GitHub
              </Link>
              <Link
                href="https://jam.dev"
                target="_blank"
                size="2"
                color="gray"
                highContrast
              >
                jam.dev
              </Link>
              <Button size="2" variant="solid" className="cta-primary">
                Get Started
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Hero Section */}
      <Section
        size="4"
        className="hero-gradient"
        pt="9"
        style={{ position: "relative", overflow: "hidden" }}
      >
        <Box className="grid-pattern" />
        <Sparkles />
        <Container size="3" style={{ position: "relative", zIndex: 1 }}>
          <Flex direction="column" align="center" gap="6" py="9">
            <Badge
              size="2"
              color="violet"
              variant="soft"
              className="float-badge"
              style={{ cursor: "default" }}
            >
              <Flex align="center" gap="1">
                <StarFilledIcon />
                Model Context Protocol
              </Flex>
            </Badge>
            <Heading
              size="9"
              align="center"
              weight="bold"
              style={{ maxWidth: 800 }}
            >
              Bug reports in your{" "}
              <span className="gradient-text">AI workflow</span>
            </Heading>
            <Text
              size="5"
              align="center"
              style={{ maxWidth: 600, color: "var(--gray-11)", lineHeight: 1.6 }}
            >
              Connect Claude, Cursor, and other AI tools to Jam. Access bug
              reports, session replays, and debugging context without leaving
              your editor.
            </Text>
            <Flex gap="4" mt="4">
              <Button size="4" variant="solid" className="cta-primary">
                <RocketIcon width={18} height={18} />
                Get Started Free
              </Button>
              <Button
                size="4"
                variant="outline"
                style={{ borderWidth: 2 }}
              >
                View Documentation
              </Button>
            </Flex>

            {/* Quick Install */}
            <Box mt="6" style={{ width: "100%", maxWidth: 520 }}>
              <Flex
                align="center"
                gap="2"
                className="code-block gradient-border"
                justify="between"
                style={{ padding: "20px 24px" }}
              >
                <Code size="3" style={{ color: "var(--violet-11)" }}>
                  npx @anthropic-ai/create-mcp jam
                </Code>
                <CopyButton text="npx @anthropic-ai/create-mcp jam" />
              </Flex>
            </Box>

            {/* Social proof */}
            <Flex
              gap="6"
              mt="6"
              align="center"
              style={{ color: "var(--gray-10)" }}
            >
              <Flex align="center" gap="2">
                <Flex>
                  {[...Array(5)].map((_, i) => (
                    <StarFilledIcon
                      key={i}
                      style={{ color: "var(--amber-9)" }}
                    />
                  ))}
                </Flex>
                <Text size="2">Loved by developers</Text>
              </Flex>
              <Text size="2">|</Text>
              <Text size="2">Works with Claude, Cursor, Windsurf & more</Text>
            </Flex>
          </Flex>
        </Container>
      </Section>

      {/* Features Section */}
      <Section size="4" style={{ position: "relative" }}>
        <Container size="4">
          <Flex direction="column" gap="8">
            <Flex direction="column" gap="3" align="center">
              <Badge size="1" color="gray" variant="soft">
                Features
              </Badge>
              <Heading size="8" align="center" weight="bold">
                Everything your AI needs to{" "}
                <span className="gradient-text">debug</span>
              </Heading>
              <Text
                size="4"
                align="center"
                style={{ maxWidth: 550, color: "var(--gray-11)" }}
              >
                Give your AI assistant full context on bugs, so it can help you
                fix them faster.
              </Text>
            </Flex>

            <Grid columns={{ initial: "1", sm: "2", md: "3" }} gap="5" mt="4">
              <FeatureCard
                icon={<MagnifyingGlassIcon width={22} height={22} />}
                title="Search Bug Reports"
                description="Query your Jam workspace to find relevant bugs by keyword, status, assignee, or custom filters. Your AI gets instant access to your entire bug history."
                delay={0}
              />
              <FeatureCard
                icon={<CodeIcon width={22} height={22} />}
                title="Console & Network Logs"
                description="Access full console output and network request details from bug session replays. Every error, warning, and API call at your AI's fingertips."
                delay={100}
              />
              <FeatureCard
                icon={<LightningBoltIcon width={22} height={22} />}
                title="Instant Context"
                description="No more copy-pasting. Your AI gets browser info, stack traces, and repro steps automatically. Debug in seconds, not minutes."
                delay={200}
              />
            </Grid>
          </Flex>
        </Container>
      </Section>

      {/* Install Section */}
      <Section size="4" style={{ background: "var(--gray-2)" }}>
        <Container size="3">
          <Flex direction="column" gap="8">
            <Flex direction="column" gap="3" align="center">
              <Badge size="1" color="violet" variant="soft">
                Installation
              </Badge>
              <Heading size="8" align="center" weight="bold">
                Up and running in{" "}
                <span className="gradient-text">minutes</span>
              </Heading>
              <Text
                size="4"
                align="center"
                style={{ color: "var(--gray-11)" }}
              >
                Three steps to connect Jam to your AI workflow.
              </Text>
            </Flex>

            <Flex direction="column" gap="6" mt="4">
              <InstallStep
                number={1}
                title="Install the Jam MCP server"
                code="npm install -g @anthropic-ai/mcp-jam"
                delay={0}
              />
              <InstallStep
                number={2}
                title="Add your Jam API key"
                code="export JAM_API_KEY=your_api_key_here"
                delay={100}
              />
              <InstallStep
                number={3}
                title="Configure your MCP client"
                code='{ "mcpServers": { "jam": { "command": "mcp-jam" } } }'
                delay={200}
              />
            </Flex>

            <Flex justify="center" mt="4">
              <Button
                size="4"
                variant="solid"
                className="cta-primary"
                asChild
              >
                <Link
                  href="https://docs.jam.dev/mcp"
                  target="_blank"
                  style={{ textDecoration: "none" }}
                >
                  Read Full Documentation
                </Link>
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Section>

      {/* CTA Section */}
      <Section size="4" style={{ position: "relative", overflow: "hidden" }}>
        <Box
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.15), transparent 70%)",
          }}
        />
        <Container size="2" style={{ position: "relative", zIndex: 1 }}>
          <Flex direction="column" gap="5" align="center" py="6">
            <Heading size="8" align="center" weight="bold">
              Ready to supercharge your{" "}
              <span className="gradient-text">debugging?</span>
            </Heading>
            <Text
              size="4"
              align="center"
              style={{ color: "var(--gray-11)", maxWidth: 450 }}
            >
              Join thousands of developers using Jam MCP to fix bugs faster with
              AI.
            </Text>
            <Button size="4" variant="solid" className="cta-primary" mt="2">
              <RocketIcon width={18} height={18} />
              Get Started Free
            </Button>
          </Flex>
        </Container>
      </Section>

      {/* Footer */}
      <Box py="6" style={{ borderTop: "1px solid var(--gray-4)" }}>
        <Container size="4">
          <Flex justify="between" align="center">
            <Flex align="center" gap="2">
              <Box
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background:
                    "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text size="1" weight="bold" style={{ color: "white" }}>
                  J
                </Text>
              </Box>
              <Text size="2" color="gray">
                Built by Jam
              </Text>
            </Flex>
            <Flex gap="4">
              <Link
                href="https://jam.dev"
                target="_blank"
                size="2"
                color="gray"
                highContrast
              >
                jam.dev
              </Link>
              <Link
                href="https://github.com/ANG13T/jam-mcp"
                target="_blank"
                size="2"
                color="gray"
                highContrast
              >
                GitHub
              </Link>
            </Flex>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
}
