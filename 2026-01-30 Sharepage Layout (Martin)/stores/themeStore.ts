import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeStore {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  _resolveSystemTheme: () => void;
}

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolvedTheme: getSystemTheme(),

      setMode: (mode) => {
        const resolved = mode === 'system' ? getSystemTheme() : mode;
        set({ mode, resolvedTheme: resolved });
      },

      toggle: () => {
        const current = get().resolvedTheme;
        set({
          mode: current === 'dark' ? 'light' : 'dark',
          resolvedTheme: current === 'dark' ? 'light' : 'dark',
        });
      },

      _resolveSystemTheme: () => {
        if (get().mode === 'system') {
          set({ resolvedTheme: getSystemTheme() });
        }
      },
    }),
    {
      name: 'jam-theme',
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);

// System preference listener
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    useThemeStore.getState()._resolveSystemTheme();
  });
}
