import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme } from "@radix-ui/themes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jam MCP - Bug Reports in Your AI Workflow",
  description:
    "Connect your AI tools to Jam for instant access to bug reports, session replays, and debugging context.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Theme appearance="dark" accentColor="violet" grayColor="slate" radius="medium">
          {children}
        </Theme>
      </body>
    </html>
  );
}
