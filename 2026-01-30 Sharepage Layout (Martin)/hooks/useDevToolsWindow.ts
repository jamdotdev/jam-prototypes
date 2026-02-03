import { useRef, useEffect, useCallback } from 'react';
import { useDevToolsStore } from '@/stores/devToolsStore';

export function useDevToolsWindow() {
  const windowRef = useRef<Window | null>(null);
  const isUndocked = useDevToolsStore((s) => s.isUndocked);
  const dock = useDevToolsStore((s) => s.dock);

  const undockRight = useCallback(() => {
    const width = 720;
    const height = window.innerHeight;
    const left = window.screenX + window.innerWidth;
    const top = window.screenY;
    windowRef.current = window.open(
      '/devtools',
      'jam-devtools',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    useDevToolsStore.getState().undock('right');
  }, []);

  const undockBottom = useCallback(() => {
    const width = window.innerWidth;
    const height = 400;
    const left = window.screenX;
    const top = window.screenY + window.innerHeight;
    windowRef.current = window.open(
      '/devtools',
      'jam-devtools',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    useDevToolsStore.getState().undock('bottom');
  }, []);

  const focusWindow = useCallback(() => {
    windowRef.current?.focus();
  }, []);

  // Poll for window close
  useEffect(() => {
    if (!isUndocked) return;
    const interval = setInterval(() => {
      if (windowRef.current?.closed) {
        dock();
        windowRef.current = null;
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isUndocked, dock]);

  return { undockRight, undockBottom, focusWindow };
}
