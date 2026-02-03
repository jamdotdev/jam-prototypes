import "@radix-ui/themes/styles.css";
import "./globals.css";
import { Theme } from "@radix-ui/themes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pylon Integration Test",
  description: "Testing Pylon integration with Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Theme appearance="dark" accentColor="blue" grayColor="slate" radius="medium">
          {children}
        </Theme>
      </body>
    </html>
  );
}
