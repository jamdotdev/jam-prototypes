import type { IntegrationType } from './activity.types';

export interface JamLabSettings {
  jamType: 'video' | 'screenshot';
  origin: 'recording_link' | 'intercom' | 'extension' | 'ios';
  title: 'default' | 'custom';
  customTitle: string;
  hasDescription: boolean;
  descriptionText: string;
  hasComments: boolean;
  commentCount: number;
  hasIntegrations: boolean;
  integrations: IntegrationType[];
  tabCount: number;
  urlChangesPerTab: number;
  customMetadataState: 'configured' | 'default' | 'error';
}

export const DEFAULT_SETTINGS: JamLabSettings = {
  jamType: 'video',
  origin: 'extension',
  title: 'default',
  customTitle: '',
  hasDescription: false,
  descriptionText: '',
  hasComments: false,
  commentCount: 4,
  hasIntegrations: false,
  integrations: ['linear'],
  tabCount: 1,
  urlChangesPerTab: 2,
  customMetadataState: 'configured',
};
