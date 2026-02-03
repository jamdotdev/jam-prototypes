"use client";

import { useEffect, useState } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { CheckIcon } from "@radix-ui/react-icons";

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export function Toast({ message, visible, onHide, duration = 3000 }: ToastProps) {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsShowing(true);
      const timer = setTimeout(() => {
        setIsShowing(false);
        setTimeout(onHide, 200); // Wait for fade out animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible && !isShowing) return null;

  return (
    <Flex
      align="center"
      gap="2"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--gray-12)",
        color: "var(--gray-1)",
        padding: "10px 16px",
        borderRadius: 8,
        zIndex: 9999,
        opacity: isShowing ? 1 : 0,
        transition: "opacity 0.2s ease",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
      }}
    >
      <CheckIcon width={16} height={16} />
      <Text size="2" weight="medium">
        {message}
      </Text>
    </Flex>
  );
}
