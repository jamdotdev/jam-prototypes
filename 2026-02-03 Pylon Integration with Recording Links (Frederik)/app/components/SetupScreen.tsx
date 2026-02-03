"use client";

import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  Card,
  TextField,
  Callout,
  Link,
} from "@radix-ui/themes";
import {
  Link2Icon,
  ReloadIcon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";

interface SetupScreenProps {
  recordingUrl: string;
  setRecordingUrl: (url: string) => void;
  apiToken: string;
  setApiToken: (token: string) => void;
  onConnect: () => void;
  isLoading: boolean;
  error: string | null;
}

export function SetupScreen({
  recordingUrl,
  setRecordingUrl,
  apiToken,
  setApiToken,
  onConnect,
  isLoading,
  error,
}: SetupScreenProps) {
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
                  Create your recording link at{" "}
                  <Link
                    href="https://jam.dev/s/recording-links"
                    target="_blank"
                  >
                    jam.dev/s/recording-links
                  </Link>
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
