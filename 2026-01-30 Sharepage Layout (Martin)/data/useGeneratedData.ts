import { useMemo } from 'react';
import type { JamLabSettings } from '@/types/settings.types';
import { generateJamInfo, generateJamMetadata } from './factories/jamFactory';
import { generateActivities } from './factories/activityFactory';
import { generateComments } from './factories/commentFactory';
import { getPresetUsers, getUserById } from './factories/userFactory';

export function useGeneratedData(settings: JamLabSettings) {
  return useMemo(
    () => ({
      jam: generateJamInfo(settings),
      metadata: generateJamMetadata(settings),
      activities: generateActivities({
        integrations: settings.integrations,
        origin: settings.origin,
        includeCreation: true,
      }),
      comments: settings.hasComments
        ? generateComments({
            count: settings.commentCount,
            jamType: settings.jamType,
          })
        : [],
      users: getPresetUsers(),
      getUserById,
    }),
    [
      settings.jamType,
      settings.origin,
      settings.title,
      settings.customTitle,
      settings.hasDescription,
      settings.descriptionText,
      settings.hasComments,
      settings.commentCount,
      settings.integrations,
    ]
  );
}
