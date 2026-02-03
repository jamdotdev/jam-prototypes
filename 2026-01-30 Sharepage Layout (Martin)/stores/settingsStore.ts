import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { JamLabSettings } from '@/types/settings.types';
import type { IntegrationType } from '@/types/activity.types';
import { DEFAULT_SETTINGS } from '@/types/settings.types';

interface SettingsStore extends JamLabSettings {
  setJamType: (type: 'video' | 'screenshot') => void;
  setOrigin: (origin: JamLabSettings['origin']) => void;
  setTitle: (mode: 'default' | 'custom', customTitle?: string) => void;
  setDescription: (enabled: boolean, text?: string) => void;
  setComments: (enabled: boolean, count?: number) => void;
  setIntegrations: (enabled: boolean) => void;
  toggleIntegration: (integration: IntegrationType) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setJamType: (jamType) =>
        set((state) => {
          const needsOriginReset =
            jamType === 'screenshot' &&
            (state.origin === 'intercom' || state.origin === 'recording_link');
          return {
            jamType,
            ...(needsOriginReset ? { origin: 'extension' as const } : {}),
          };
        }),
      setOrigin: (origin) => set({ origin }),
      setTitle: (title, customTitle) => set({ title, customTitle: customTitle ?? '' }),
      setDescription: (hasDescription, descriptionText) =>
        set({ hasDescription, descriptionText: descriptionText ?? '' }),
      setComments: (hasComments, commentCount) =>
        set({ hasComments, commentCount: commentCount ?? 4 }),
      setIntegrations: (hasIntegrations) => set({ hasIntegrations }),
      toggleIntegration: (integration) =>
        set((state) => ({
          integrations: state.integrations.includes(integration)
            ? state.integrations.filter((i) => i !== integration)
            : [...state.integrations, integration],
        })),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    { name: 'jam-lab-settings' }
  )
);

export const useSettings = () =>
  useSettingsStore(
    useShallow((state) => ({
      jamType: state.jamType,
      origin: state.origin,
      title: state.title,
      customTitle: state.customTitle,
      hasDescription: state.hasDescription,
      descriptionText: state.descriptionText,
      hasComments: state.hasComments,
      commentCount: state.commentCount,
      hasIntegrations: state.hasIntegrations,
      integrations: state.integrations,
    }))
  );
