"use client";

import { useState } from "react";
import { Button } from "@radix-ui/themes";
import { CopyIcon, CheckIcon } from "@radix-ui/react-icons";

interface CopyButtonProps {
  text: string;
  label: string;
  variant?: "soft" | "solid";
  onCopy?: () => void;
}

export function CopyButton({
  text,
  label,
  variant = "soft",
  onCopy,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size="2"
      variant={variant}
      onClick={handleCopy}
      style={{ cursor: "pointer", minWidth: 140 }}
    >
      {copied ? (
        <>
          <CheckIcon />
          Copied!
        </>
      ) : (
        <>
          <CopyIcon />
          {label}
        </>
      )}
    </Button>
  );
}
