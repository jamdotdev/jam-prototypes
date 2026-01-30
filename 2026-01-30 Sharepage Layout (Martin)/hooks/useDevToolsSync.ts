'use client';

import { useEffect, useRef } from 'react';

const CHANNEL_NAME = 'jam-devtools';

type MessageType = 'state-update' | 'close' | 'dock' | 'ping' | 'theme-change';

export interface DevToolsMessage {
  type: MessageType;
  payload?: unknown;
}

export function useDevToolsSync(
  onMessage?: (message: DevToolsMessage) => void
) {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Create broadcast channel
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);

    // Listen for messages
    if (onMessage) {
      channelRef.current.onmessage = (event) => {
        onMessage(event.data as DevToolsMessage);
      };
    }

    return () => {
      channelRef.current?.close();
    };
  }, [onMessage]);

  const sendMessage = (message: DevToolsMessage) => {
    channelRef.current?.postMessage(message);
  };

  const sendStateUpdate = (state: unknown) => {
    sendMessage({ type: 'state-update', payload: state });
  };

  const sendClose = () => {
    sendMessage({ type: 'close' });
  };

  const sendDock = () => {
    sendMessage({ type: 'dock' });
  };

  const sendThemeChange = (theme: string) => {
    sendMessage({ type: 'theme-change', payload: theme });
  };

  return {
    sendMessage,
    sendStateUpdate,
    sendClose,
    sendDock,
    sendThemeChange,
  };
}
