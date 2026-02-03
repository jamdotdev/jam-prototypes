export type JamType = 'video' | 'screenshot';
export type JamOrigin = 'recording_link' | 'intercom' | 'extension' | 'ios';

export interface JamInfo {
  id: string;
  type: JamType;
  origin: JamOrigin;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
}

export interface JamMetadata {
  location: string;
  os: { name: string; version: string; arch: string };
  browser: { name: string; version: string };
  windowSize: { width: number; height: number };
  captureSize: { width: number; height: number };
}
