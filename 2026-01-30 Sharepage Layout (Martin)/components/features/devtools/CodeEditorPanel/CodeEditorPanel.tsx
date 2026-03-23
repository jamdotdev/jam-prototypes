'use client';

import { useEffect, useMemo } from 'react';
import { Text, Flex } from '@radix-ui/themes';
import Editor, { useMonaco } from '@monaco-editor/react';
import { CodeEditorTabs, OpenTab } from '../CodeEditorTabs';
import { useThemeContext } from '@/components/providers/ThemeProvider/ThemeProvider';
import styles from './CodeEditorPanel.module.css';

interface CodeEditorPanelProps {
  tabs: OpenTab[];
  activeTabName: string | null;
  onTabChange: (name: string) => void;
  onTabClose: (name: string) => void;
  layout: 'right' | 'bottom';
}

export function CodeEditorPanel({
  tabs,
  activeTabName,
  onTabChange,
  onTabClose,
  layout,
}: CodeEditorPanelProps) {
  const { resolvedTheme } = useThemeContext();
  const monaco = useMonaco();

  // Define custom themes when Monaco loads
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('radix-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#111113',
          'editor.lineHighlightBackground': '#1a1a1c',
          'editorLineNumber.foreground': '#6e6e77',
          'editorLineNumber.activeForeground': '#b4b4bb',
        },
      });
      monaco.editor.defineTheme('radix-light', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#fcfcfc',
          'editor.lineHighlightBackground': '#f9f9fb',
          'editorLineNumber.foreground': '#8d8d97',
          'editorLineNumber.activeForeground': '#60606c',
        },
      });
    }
  }, [monaco]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.name === activeTabName),
    [tabs, activeTabName]
  );

  const jsonContent = useMemo(() => {
    if (!activeTab) return '';
    if (typeof activeTab.value === 'string') {
      return activeTab.value;
    }
    return JSON.stringify(activeTab.value, null, 2);
  }, [activeTab]);

  const editorTheme = resolvedTheme === 'dark' ? 'radix-dark' : 'radix-light';
  const hasTabs = tabs.length > 0;

  return (
    <div className={`${styles.panel} ${layout === 'bottom' ? styles.bottomLayout : ''}`}>
      {/* Tab bar - always visible */}
      <div className={styles.tabBarContainer}>
        {hasTabs ? (
          <CodeEditorTabs
            tabs={tabs}
            activeTabName={activeTabName}
            onTabChange={onTabChange}
            onTabClose={onTabClose}
          />
        ) : (
          <div className={styles.emptyTabBar}>
            <Text size="1" color="gray">No properties open</Text>
          </div>
        )}
      </div>

      {activeTab?.parseError && (
        <Flex className={styles.parseWarning}>
          <Text size="1" color="amber">
            Truncated data - showing raw value
          </Text>
        </Flex>
      )}

      <div className={styles.editorWrapper}>
        {activeTab ? (
          <Editor
            height="100%"
            language="json"
            value={jsonContent}
            theme={editorTheme}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              lineNumbers: 'on',
              folding: true,
              fontSize: 12,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: 'on',
              renderLineHighlight: 'line',
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8,
              },
              padding: {
                top: 8,
                bottom: 8,
              },
            }}
          />
        ) : (
          <div className={styles.emptyState}>
            <Text size="2" color="gray">Click a property to view JSON</Text>
          </div>
        )}
      </div>
    </div>
  );
}
