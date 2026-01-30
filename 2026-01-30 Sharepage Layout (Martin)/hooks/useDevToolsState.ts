'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type LayoutRatio = '60/40' | '50/50' | '40/60';

interface DevToolsState {
  isOpen: boolean;
  layoutRatio: LayoutRatio;
  customRatio: number | null; // Custom ratio from dragging (percentage for main panel)
  isUndocked: boolean;
  isDragging: boolean;
}

const LAYOUT_RATIOS: LayoutRatio[] = ['60/40', '50/50', '40/60'];
const STORAGE_KEY = 'jam-devtools-state';

// Panel constraints (exported for use in ResizableDivider)
export const MIN_MAIN_PANEL = 30;
export const MAX_MAIN_PANEL = 75;

// Parse ratio string to get main panel percentage
// 60/40 and 40/60 jump to max/min constraints
export function getRatioPercentage(ratio: LayoutRatio): number {
  switch (ratio) {
    case '60/40':
      return MAX_MAIN_PANEL; // 75% - main panel at max, dev tools at min
    case '40/60':
      return MIN_MAIN_PANEL; // 30% - main panel at min, dev tools at max
    case '50/50':
    default:
      return 50;
  }
}

// Get effective ratio (custom or preset)
export function getEffectiveRatio(state: DevToolsState): number {
  return state.customRatio ?? getRatioPercentage(state.layoutRatio);
}

export function useDevToolsState() {
  const [state, setState] = useState<DevToolsState>({
    isOpen: true,
    layoutRatio: '50/50',
    customRatio: null,
    isUndocked: false,
    isDragging: false,
  });

  const undockedWindowRef = useRef<Window | null>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setState((prev) => ({
          ...prev,
          layoutRatio: parsed.layoutRatio || '50/50',
          customRatio: parsed.customRatio || null,
        }));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        layoutRatio: state.layoutRatio,
        customRatio: state.customRatio,
      })
    );
  }, [state.layoutRatio, state.customRatio]);

  // Check if undocked window is closed
  useEffect(() => {
    if (!state.isUndocked || !undockedWindowRef.current) return;

    const checkWindow = setInterval(() => {
      if (undockedWindowRef.current?.closed) {
        setState((prev) => ({ ...prev, isUndocked: false }));
        undockedWindowRef.current = null;
      }
    }, 500);

    return () => clearInterval(checkWindow);
  }, [state.isUndocked]);

  const openDevTools = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: true }));
  }, []);

  const closeDevTools = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const cycleLayout = useCallback(() => {
    setState((prev) => {
      const currentIndex = LAYOUT_RATIOS.indexOf(prev.layoutRatio);
      const nextIndex = (currentIndex + 1) % LAYOUT_RATIOS.length;
      return {
        ...prev,
        layoutRatio: LAYOUT_RATIOS[nextIndex],
        customRatio: null, // Reset custom ratio when cycling presets
      };
    });
  }, []);

  const setLayoutRatio = useCallback((ratio: LayoutRatio) => {
    setState((prev) => ({
      ...prev,
      layoutRatio: ratio,
      customRatio: null, // Reset custom ratio when selecting preset
    }));
  }, []);

  const setCustomRatio = useCallback((ratio: number) => {
    // Snap to preset if within 5%
    for (const preset of LAYOUT_RATIOS) {
      const presetValue = getRatioPercentage(preset);
      if (Math.abs(ratio - presetValue) <= 5) {
        setState((prev) => ({
          ...prev,
          layoutRatio: preset,
          customRatio: null,
        }));
        return;
      }
    }

    // Otherwise use custom ratio
    setState((prev) => ({
      ...prev,
      customRatio: Math.max(MIN_MAIN_PANEL, Math.min(MAX_MAIN_PANEL, ratio)),
    }));
  }, []);

  const setIsDragging = useCallback((isDragging: boolean) => {
    setState((prev) => ({ ...prev, isDragging }));
  }, []);

  const undockRight = useCallback(() => {
    // Position popup to the right of the main window
    const width = 720;
    const height = window.outerHeight; // Match main window height
    const left = window.screenX + window.outerWidth + 8; // 8px gap
    const top = window.screenY;

    const popup = window.open(
      '/devtools',
      'jam-devtools',
      `width=${width},height=${height},left=${left},top=${top},popup=true`
    );

    if (popup) {
      undockedWindowRef.current = popup;
      setState((prev) => ({ ...prev, isUndocked: true }));
    }
  }, []);

  const undockBottom = useCallback(() => {
    // Position popup below the main window
    const width = window.outerWidth;
    const height = 400;
    const left = window.screenX;
    const top = window.screenY + window.outerHeight + 8; // 8px gap

    const popup = window.open(
      '/devtools',
      'jam-devtools',
      `width=${width},height=${height},left=${left},top=${top},popup=true`
    );

    if (popup) {
      undockedWindowRef.current = popup;
      setState((prev) => ({ ...prev, isUndocked: true }));
    }
  }, []);

  const dock = useCallback(() => {
    if (undockedWindowRef.current && !undockedWindowRef.current.closed) {
      undockedWindowRef.current.close();
    }
    undockedWindowRef.current = null;
    setState((prev) => ({ ...prev, isUndocked: false, isOpen: true }));
  }, []);

  const focusDevTools = useCallback(() => {
    if (undockedWindowRef.current && !undockedWindowRef.current.closed) {
      undockedWindowRef.current.focus();
    }
  }, []);

  return {
    ...state,
    effectiveRatio: getEffectiveRatio(state),
    openDevTools,
    closeDevTools,
    cycleLayout,
    setLayoutRatio,
    setCustomRatio,
    setIsDragging,
    undockRight,
    undockBottom,
    dock,
    focusDevTools,
  };
}
