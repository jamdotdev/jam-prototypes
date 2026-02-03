import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LayoutRatio = '60/40' | '50/50' | '40/60';
export const MIN_MAIN_PANEL = 30;
export const MAX_MAIN_PANEL = 75;

const RATIO_TO_PERCENT: Record<LayoutRatio, number> = {
  '60/40': 60,
  '50/50': 50,
  '40/60': 40,
};

interface DevToolsStore {
  isOpen: boolean;
  layoutRatio: LayoutRatio;
  customRatio: number | null;
  isUndocked: boolean;
  isDragging: boolean;
  isTheaterMode: boolean;

  effectiveRatio: () => number;

  open: () => void;
  close: () => void;
  cycleLayout: () => void;
  setLayoutRatio: (ratio: LayoutRatio) => void;
  setCustomRatio: (ratio: number) => void;
  setIsDragging: (dragging: boolean) => void;
  undock: (direction: 'right' | 'bottom') => void;
  dock: () => void;
  toggleTheaterMode: () => void;
}

export const useDevToolsStore = create<DevToolsStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      layoutRatio: '60/40',
      customRatio: null,
      isUndocked: false,
      isDragging: false,
      isTheaterMode: false,

      effectiveRatio: () => {
        const { customRatio, layoutRatio } = get();
        return customRatio ?? RATIO_TO_PERCENT[layoutRatio];
      },

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),

      cycleLayout: () =>
        set((state) => {
          const cycle: LayoutRatio[] = ['60/40', '50/50', '40/60'];
          const idx = cycle.indexOf(state.layoutRatio);
          return { layoutRatio: cycle[(idx + 1) % 3], customRatio: null };
        }),

      setLayoutRatio: (layoutRatio) => set({ layoutRatio, customRatio: null }),

      setCustomRatio: (ratio) => {
        for (const [preset, percent] of Object.entries(RATIO_TO_PERCENT)) {
          if (Math.abs(ratio - percent) < 5) {
            set({ layoutRatio: preset as LayoutRatio, customRatio: null });
            return;
          }
        }
        set({ customRatio: ratio });
      },

      setIsDragging: (isDragging) => set({ isDragging }),

      undock: () => {
        set({ isUndocked: true, isOpen: false });
      },

      dock: () => set({ isUndocked: false, isOpen: true }),
      toggleTheaterMode: () => set((state) => ({ isTheaterMode: !state.isTheaterMode })),
    }),
    {
      name: 'jam-devtools',
      partialize: (state) => ({
        layoutRatio: state.layoutRatio,
        customRatio: state.customRatio,
        isTheaterMode: state.isTheaterMode,
      }),
    }
  )
);
