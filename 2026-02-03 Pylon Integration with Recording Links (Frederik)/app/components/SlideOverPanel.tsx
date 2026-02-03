"use client";

import { useEffect } from "react";
import { Box, Flex, IconButton, Text } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";

interface SlideOverPanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function SlideOverPanel({
  open,
  onClose,
  title,
  children,
}: SlideOverPanelProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when panel is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <Box
        className="slide-over-backdrop"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: "opacity 0.2s ease, visibility 0.2s ease",
          zIndex: 40,
        }}
      />

      {/* Panel */}
      <Box
        className="slide-over-panel"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          maxWidth: 420,
          background: "var(--gray-1)",
          borderLeft: "1px solid var(--gray-6)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          boxShadow: open ? "-4px 0 24px rgba(0, 0, 0, 0.1)" : "none",
        }}
      >
        {/* Header */}
        <Flex
          justify="between"
          align="center"
          px="4"
          py="3"
          style={{ borderBottom: "1px solid var(--gray-6)" }}
        >
          <Text size="3" weight="medium">
            {title || "Details"}
          </Text>
          <IconButton
            size="2"
            variant="ghost"
            onClick={onClose}
            style={{ cursor: "pointer" }}
          >
            <Cross2Icon width={18} height={18} />
          </IconButton>
        </Flex>

        {/* Content */}
        <Box
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
          }}
        >
          {children}
        </Box>
      </Box>
    </>
  );
}
