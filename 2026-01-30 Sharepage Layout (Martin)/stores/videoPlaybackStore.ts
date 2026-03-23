import { create } from 'zustand';

const DURATION = 60;

interface VideoPlaybackStore {
  currentTime: number;
  duration: number;
  isPlaying: boolean;

  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
}

export const useVideoPlaybackStore = create<VideoPlaybackStore>()((set) => ({
  currentTime: 0,
  duration: DURATION,
  isPlaying: false,

  setCurrentTime: (currentTime) =>
    set({ currentTime: Math.max(0, Math.min(currentTime, DURATION)) }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
}));
