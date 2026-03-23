import type { JamInfo, JamMetadata, JamOrigin, JamType } from '@/types/jam.types';
import type { JamLabSettings } from '@/types/settings.types';
import { getCreator } from './userFactory';

const DEFAULT_TITLES: Record<JamType, Partial<Record<JamOrigin, string>>> = {
  screenshot: {
    ios: 'Screenshot from iOS',
    extension: 'Screenshot from Browser Extension',
  },
  video: {
    ios: 'Recording from iOS',
    extension: 'Recording from Browser Extension',
    intercom: 'User Recording from Intercom',
    recording_link: 'User Recording from Recording Link',
  },
};

const DEFAULT_DESCRIPTIONS: Record<JamOrigin, string> = {
  recording_link: 'User shared a recording demonstrating the issue.',
  intercom: 'Customer reported this issue during support conversation.',
  extension:
    "When users tap the submit button multiple times quickly on iOS Safari, the form submits duplicate requests causing a 500 error. This is most noticeable on slower network connections where the loading state doesn't appear fast enough.",
  ios: 'App crashes when submitting the form rapidly. Race condition in validation.',
};

export function generateJamInfo(settings: JamLabSettings): JamInfo {
  const title =
    settings.title === 'custom' && settings.customTitle
      ? settings.customTitle
      : DEFAULT_TITLES[settings.jamType][settings.origin] ?? 'Untitled Jam';

  const description = settings.hasDescription
    ? settings.descriptionText || DEFAULT_DESCRIPTIONS[settings.origin]
    : null;

  return {
    id: `jam-${Date.now()}`,
    type: settings.jamType,
    origin: settings.origin,
    title,
    description,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    creatorId: getCreator().id,
  };
}

export function generateJamMetadata(settings: JamLabSettings): JamMetadata {
  const isIOS = settings.origin === 'ios';

  return {
    location: 'Germany',
    os: isIOS
      ? { name: 'iOS', version: '17.2', arch: 'arm64' }
      : { name: 'macOS', version: '15.2.0', arch: 'arm' },
    browser: isIOS
      ? { name: 'Safari', version: '17.2' }
      : { name: 'Chrome', version: '136.0.7103.113' },
    windowSize: isIOS ? { width: 390, height: 844 } : { width: 1780, height: 1296 },
    captureSize:
      settings.jamType === 'screenshot'
        ? { width: 906, height: 674 }
        : { width: 1920, height: 1080 },
  };
}
