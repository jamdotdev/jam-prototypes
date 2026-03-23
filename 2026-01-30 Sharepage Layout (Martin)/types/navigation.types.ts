import type { MetadataItem } from '@/data/constants/devToolsDefaults';

export interface NavigationEvent {
  id: string;
  tabId: string;
  tabLabel: string;
  url: string;
  timestamp: number;
  customProperties: MetadataItem[];
}

export interface NavigationTab {
  id: string;
  label: string;
  events: NavigationEvent[];
}

export interface NavigationData {
  tabs: NavigationTab[];
  events: NavigationEvent[];
}
