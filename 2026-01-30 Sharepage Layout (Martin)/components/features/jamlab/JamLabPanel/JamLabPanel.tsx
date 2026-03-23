'use client';

import { ScrollArea, Button, Separator } from '@radix-ui/themes';
import { useSettingsStore } from '@/stores/settingsStore';
import { JamTypeControl } from '../controls/JamTypeControl';
import { OriginControl } from '../controls/OriginControl';
import { TitleControl } from '../controls/TitleControl';
import { DescriptionControl } from '../controls/DescriptionControl';
import { CommentsControl } from '../controls/CommentsControl';
import { IntegrationsControl } from '../controls/IntegrationsControl';
import { NavigationControl } from '../controls/NavigationControl';
import { CustomMetadataStateControl } from '../controls/CustomMetadataStateControl';
import styles from './JamLabPanel.module.css';

export function JamLabPanel() {
  const reset = useSettingsStore((s) => s.reset);
  const jamType = useSettingsStore((s) => s.jamType);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.title}>
          <span>/ Jam Lab</span>
        </div>
      </div>

      <ScrollArea className={styles.scrollArea}>
        <div className={styles.content}>
          <JamTypeControl />
          <Separator size="4" />
          <OriginControl />
          <Separator size="4" />
          <TitleControl />
          <Separator size="4" />
          <DescriptionControl />
          <Separator size="4" />
          <CommentsControl />
          <Separator size="4" />
          <IntegrationsControl />
          {jamType === 'video' && (
            <>
              <Separator size="4" />
              <NavigationControl />
              <Separator size="4" />
              <CustomMetadataStateControl />
            </>
          )}
        </div>
      </ScrollArea>

      <div className={styles.footer}>
        <Button
          variant="ghost"
          color="red"
          size="1"
          onClick={reset}
          style={{ width: '100%' }}
        >
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
