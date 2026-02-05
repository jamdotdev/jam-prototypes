import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme } from "@radix-ui/themes";
import { AnalyticsProvider } from "./components/AnalyticsProvider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pylon Integration with Recording Links",
  description: "Generate Jam recording links pre-filled with Pylon issue context",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Theme appearance="inherit" accentColor="blue" grayColor="slate" radius="medium">
          {children}
        </Theme>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
