import type { JamLabSettings } from '@/types/settings.types';
import type {
  NavigationData,
  NavigationEvent,
  NavigationTab,
} from '@/types/navigation.types';
import type { MetadataItem } from '@/data/constants/devToolsDefaults';

const URL_POOLS: string[][] = [
  [
    'buggle.com/login',
    'buggle.com/dashboard',
    'buggle.com/dashboard/settings',
    'buggle.com/dashboard/jams/f59a39f5',
    'buggle.com/team/engineering',
  ],
  [
    'linear.app/acme/board',
    'linear.app/acme/issue/JAM-142',
    'linear.app/acme/issue/JAM-143',
    'linear.app/acme/settings',
  ],
  [
    'github.com/acme/frontend/pull/847',
    'github.com/acme/frontend/pull/847/files',
    'github.com/acme/frontend/issues/312',
  ],
  [
    'slack.com/acme/C04NXYZ1234',
    'slack.com/acme/C04NXYZ5678',
  ],
];

const TAB_LABELS = ['Tab 1', 'Tab 2', 'Tab 3', 'Tab 4'];

// --- Seeded random utilities ---

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function fakeUuid(rand: () => number): string {
  const hex = () => Math.floor(rand() * 16).toString(16);
  const seg = (n: number) => Array.from({ length: n }, hex).join('');
  return `${seg(8)}-${seg(4)}-${seg(4)}-${seg(4)}-${seg(12)}`;
}

// --- URL-context-aware custom property templates ---

function getPropertiesForUrl(url: string, rand: () => number): MetadataItem[] {
  // Login page — short JSON
  if (url.includes('/login')) {
    return [
      {
        type: 'code',
        label: 'currentUser',
        value: JSON.stringify({
          id: fakeUuid(rand),
          email: 'sarah.chen@acme.io',
          name: 'Sarah Chen',
          authenticated: false,
        }),
        expandable: false,
      },
      {
        type: 'code',
        label: 'loginAttempt',
        value: JSON.stringify({
          method: 'sso',
          provider: 'okta',
          timestamp: '2026-01-30T14:33:12Z',
          status: 'pending',
        }),
        expandable: false,
      },
    ];
  }

  // Dashboard — long JSON (full user, session, feature flags)
  if (url.endsWith('/dashboard')) {
    return [
      {
        type: 'code',
        label: 'currentUser',
        value: JSON.stringify({
          id: '6c836ba0-e05a-433d-981b-34456cbe086e',
          email: 'sarah.chen@acme.io',
          name: 'Sarah Chen',
          role: 'admin',
          permissions: ['read', 'write', 'delete', 'manage_users'],
          preferences: {
            theme: 'dark',
            notifications: { email: true, push: false, slack: true },
            timezone: 'America/Los_Angeles',
            language: 'en-US',
          },
          metadata: {
            createdAt: '2024-03-15T08:22:41Z',
            lastLogin: '2026-01-30T14:33:12Z',
            loginCount: 847,
          },
        }),
        expandable: true,
      },
      {
        type: 'code',
        label: 'sessionState',
        value: JSON.stringify({
          sessionId: `sess_${fakeUuid(rand).slice(0, 16)}`,
          startedAt: '2026-01-30T14:33:12Z',
          lastActivity: '2026-01-30T15:47:33Z',
          pageViews: Math.floor(rand() * 40) + 5,
          currentPage: '/dashboard',
          referrer: 'https://linear.app/acme/issue/ENG-4521',
          device: {
            type: 'desktop',
            os: 'macOS',
            osVersion: '15.2.0',
            browser: 'Chrome',
            browserVersion: '136.0.7103.113',
          },
          location: {
            country: 'Germany',
            region: 'Bavaria',
            city: 'Munich',
            timezone: 'Europe/Berlin',
          },
          flags: {
            newDashboard: true,
            betaFeatures: true,
            darkMode: true,
          },
        }),
        expandable: true,
      },
      {
        type: 'code',
        label: 'featureFlags',
        value: JSON.stringify({
          flags: {
            'new-dashboard-v2': { enabled: true, variant: 'treatment-b', rollout: 0.75 },
            'ai-suggestions': { enabled: true, variant: 'control', rollout: 0.5 },
            'video-annotations': { enabled: false, variant: null, rollout: 0 },
            'slack-integration-v2': { enabled: true, variant: 'treatment-a', rollout: 1.0 },
            'bulk-actions': { enabled: true, variant: 'treatment-a', rollout: 0.9 },
            'custom-workflows': { enabled: false, variant: null, rollout: 0 },
            'advanced-search': { enabled: true, variant: 'treatment-c', rollout: 0.6 },
          },
          evaluatedAt: '2026-01-30T14:33:12Z',
          source: 'launchdarkly',
          userId: '6c836ba0-e05a-433d-981b-34456cbe086e',
        }),
        expandable: true,
      },
    ];
  }

  // Dashboard settings — medium JSON (user + team settings)
  if (url.includes('/dashboard/settings')) {
    return [
      {
        type: 'code',
        label: 'currentUser',
        value: JSON.stringify({
          id: '6c836ba0-e05a-433d-981b-34456cbe086e',
          email: 'sarah.chen@acme.io',
          name: 'Sarah Chen',
          role: 'admin',
          permissions: ['read', 'write', 'delete', 'manage_users'],
        }),
        expandable: true,
      },
      {
        type: 'code',
        label: 'teamSettings',
        value: JSON.stringify({
          teamId: '634eaf31-20c9-0300-263b-3fa158294736',
          name: 'Engineering',
          plan: 'enterprise',
          security: {
            requireMFA: true,
            ssoEnabled: true,
            ssoProvider: 'okta',
            passwordPolicy: 'strong',
            sessionTimeout: 3600,
          },
          billing: {
            status: 'active',
            nextInvoiceDate: '2026-02-01T00:00:00Z',
            monthlySeats: 25,
            usedSeats: 18,
          },
          integrations: {
            linear: { connected: true, syncEnabled: true },
            slack: { connected: true, channel: '#engineering' },
            github: { connected: true, repos: ['acme/frontend', 'acme/backend'] },
          },
        }),
        expandable: true,
      },
    ];
  }

  // Viewing a specific jam — mixed (jam details + console errors)
  if (url.includes('/dashboard/jams/') || url.includes('/jams/')) {
    const jamId = url.split('/').pop() ?? fakeUuid(rand);
    return [
      {
        type: 'code',
        label: 'viewedJam',
        value: JSON.stringify({
          id: jamId,
          title: 'Login button not responding on Safari',
          status: 'open',
          priority: 'high',
          reporter: {
            id: 'd4e5f6a7-b8c9-0123-defg-234567890123',
            name: 'Alex Rivera',
            email: 'alex.r@acme.io',
          },
          assignee: {
            id: '6c836ba0-e05a-433d-981b-34456cbe086e',
            name: 'Sarah Chen',
          },
          labels: ['bug', 'safari', 'authentication', 'p0'],
          createdAt: '2026-01-29T18:45:22Z',
          updatedAt: '2026-01-30T09:12:08Z',
          comments: 7,
          attachments: 3,
        }),
        expandable: true,
      },
      {
        type: 'code',
        label: 'consoleErrors',
        value: JSON.stringify({
          errors: [
            {
              type: 'TypeError',
              message: "Cannot read properties of undefined (reading 'map')",
              stack:
                'at DashboardList (dashboard.tsx:142:23)\n    at renderWithHooks (react-dom.js:1042:18)\n    at mountIndeterminateComponent (react-dom.js:2847:13)',
              timestamp: '2026-01-30T15:42:17Z',
              url: '/dashboard',
              count: 3,
            },
            {
              type: 'NetworkError',
              message: 'Failed to fetch: /api/v2/analytics/events',
              timestamp: '2026-01-30T15:44:33Z',
              url: `/dashboard/jams/${jamId}`,
              count: 1,
            },
          ],
          warnings: Math.floor(rand() * 20) + 2,
          infos: Math.floor(rand() * 60) + 10,
        }),
        expandable: true,
      },
    ];
  }

  // Team page — medium (team members)
  if (url.includes('/team/')) {
    return [
      {
        type: 'code',
        label: 'activeTeam',
        value: JSON.stringify({
          id: '634eaf31-20c9-0300-263b-3fa158294736',
          name: 'Engineering',
          slug: 'engineering',
          plan: 'enterprise',
          members: [
            { userId: '6c836ba0-e05a-433d-981b-34456cbe086e', role: 'owner', joinedAt: '2024-03-15T08:22:41Z' },
            { userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', role: 'member', joinedAt: '2024-04-02T11:15:33Z' },
            { userId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901', role: 'member', joinedAt: '2024-04-18T09:42:17Z' },
            { userId: 'c3d4e5f6-a7b8-9012-cdef-123456789012', role: 'admin', joinedAt: '2024-05-22T16:08:55Z' },
          ],
          settings: {
            defaultVisibility: 'team',
            allowGuestAccess: false,
            requireMFA: true,
          },
        }),
        expandable: true,
      },
    ];
  }

  // Linear board — medium (board state + user)
  if (url.includes('linear.app') && url.includes('/board')) {
    return [
      {
        type: 'code',
        label: 'currentUser',
        value: JSON.stringify({
          id: fakeUuid(rand),
          email: 'sarah.chen@acme.io',
          name: 'Sarah Chen',
        }),
        expandable: false,
      },
      {
        type: 'code',
        label: 'boardState',
        value: JSON.stringify({
          workspace: 'acme',
          view: 'board',
          filters: {
            assignee: 'me',
            status: ['in_progress', 'todo'],
            priority: ['urgent', 'high'],
          },
          issueCount: { todo: 8, inProgress: 5, done: 23, cancelled: 2 },
          sprint: {
            name: 'Sprint 14',
            startDate: '2026-01-27',
            endDate: '2026-02-07',
            progress: 0.42,
          },
        }),
        expandable: true,
      },
    ];
  }

  // Linear issue — medium (issue details)
  if (url.includes('linear.app') && url.includes('/issue/')) {
    const issueId = url.split('/').pop() ?? 'JAM-142';
    return [
      {
        type: 'code',
        label: 'currentUser',
        value: JSON.stringify({
          id: fakeUuid(rand),
          email: 'sarah.chen@acme.io',
          name: 'Sarah Chen',
        }),
        expandable: false,
      },
      {
        type: 'code',
        label: 'linearIssue',
        value: JSON.stringify({
          id: fakeUuid(rand),
          identifier: issueId,
          title: issueId === 'JAM-142'
            ? 'Share page layout breaks on mobile viewport'
            : 'DevTools panel flickers during resize',
          status: 'in_progress',
          priority: 2,
          assignee: { id: fakeUuid(rand), name: 'Sarah Chen' },
          team: 'Engineering',
          labels: ['bug', 'frontend', 'p1'],
          estimate: 3,
          dueDate: '2026-02-05',
          createdAt: '2026-01-28T10:22:00Z',
          updatedAt: '2026-01-30T14:55:12Z',
          comments: Math.floor(rand() * 8) + 1,
          attachments: Math.floor(rand() * 4),
        }),
        expandable: true,
      },
    ];
  }

  // Linear settings — medium
  if (url.includes('linear.app') && url.includes('/settings')) {
    return [
      {
        type: 'code',
        label: 'workspaceSettings',
        value: JSON.stringify({
          workspace: 'acme',
          plan: 'business',
          features: {
            gitIntegration: true,
            slackIntegration: true,
            figmaIntegration: true,
            cycles: true,
            triage: true,
          },
          notifications: {
            issueAssigned: true,
            issueCommented: true,
            cycleSummary: 'weekly',
          },
        }),
        expandable: true,
      },
    ];
  }

  // GitHub PR — long (PR details with diff stats, reviewers, CI)
  if (url.includes('github.com') && url.includes('/pull/') && !url.includes('/files')) {
    const prNumber = url.match(/\/pull\/(\d+)/)?.[1] ?? '847';
    return [
      {
        type: 'code',
        label: 'currentUser',
        value: JSON.stringify({
          login: 'sarahchen',
          id: fakeUuid(rand),
          name: 'Sarah Chen',
        }),
        expandable: false,
      },
      {
        type: 'code',
        label: 'pullRequest',
        value: JSON.stringify({
          number: parseInt(prNumber),
          title: 'feat: Add responsive DevTools panel layout',
          state: 'open',
          draft: false,
          author: { login: 'sarahchen', name: 'Sarah Chen' },
          base: 'main',
          head: 'feat/devtools-panel',
          createdAt: '2026-01-29T16:30:00Z',
          updatedAt: '2026-01-30T11:22:45Z',
          diffStats: {
            additions: 342,
            deletions: 87,
            changedFiles: 12,
          },
          reviewers: [
            { login: 'alexrivera', state: 'approved', submittedAt: '2026-01-30T09:15:00Z' },
            { login: 'jmartinez', state: 'changes_requested', submittedAt: '2026-01-30T10:30:00Z' },
            { login: 'lwei', state: 'pending' },
          ],
          checks: {
            total: 8,
            passed: 6,
            failed: 1,
            pending: 1,
            details: [
              { name: 'lint', status: 'passed', duration: 45 },
              { name: 'typecheck', status: 'passed', duration: 62 },
              { name: 'unit-tests', status: 'passed', duration: 118 },
              { name: 'integration-tests', status: 'failed', duration: 342, error: 'Timeout in DevToolsPanel.spec.ts' },
              { name: 'e2e-chrome', status: 'passed', duration: 287 },
              { name: 'e2e-firefox', status: 'passed', duration: 301 },
              { name: 'e2e-safari', status: 'passed', duration: 295 },
              { name: 'deploy-preview', status: 'pending' },
            ],
          },
          labels: ['feature', 'frontend', 'needs-review'],
          milestone: 'v2.4.0',
          comments: 14,
        }),
        expandable: true,
      },
    ];
  }

  // GitHub PR files view — long (file changes detail)
  if (url.includes('github.com') && url.includes('/pull/') && url.includes('/files')) {
    return [
      {
        type: 'code',
        label: 'changedFiles',
        value: JSON.stringify({
          total: 12,
          files: [
            { path: 'src/components/DevToolsPanel/DevToolsPanel.tsx', additions: 89, deletions: 12, status: 'modified' },
            { path: 'src/components/DevToolsPanel/DevToolsPanel.module.css', additions: 45, deletions: 8, status: 'modified' },
            { path: 'src/components/ResizableDivider/ResizableDivider.tsx', additions: 67, deletions: 0, status: 'added' },
            { path: 'src/components/ResizableDivider/ResizableDivider.module.css', additions: 32, deletions: 0, status: 'added' },
            { path: 'src/hooks/useResizable.ts', additions: 44, deletions: 0, status: 'added' },
            { path: 'src/components/MainPanel/MainPanel.tsx', additions: 15, deletions: 23, status: 'modified' },
            { path: 'src/types/layout.types.ts', additions: 8, deletions: 2, status: 'modified' },
            { path: 'tests/DevToolsPanel.spec.ts', additions: 42, deletions: 18, status: 'modified' },
          ],
          viewState: {
            expandedFiles: ['src/components/DevToolsPanel/DevToolsPanel.tsx'],
            filter: 'all',
            diffView: 'unified',
          },
        }),
        expandable: true,
      },
    ];
  }

  // GitHub issues — medium
  if (url.includes('github.com') && url.includes('/issues/')) {
    const issueNumber = url.match(/\/issues\/(\d+)/)?.[1] ?? '312';
    return [
      {
        type: 'code',
        label: 'issue',
        value: JSON.stringify({
          number: parseInt(issueNumber),
          title: 'DevTools panel does not persist size across reloads',
          state: 'open',
          author: { login: 'alexrivera', name: 'Alex Rivera' },
          assignees: [{ login: 'sarahchen', name: 'Sarah Chen' }],
          labels: ['bug', 'devtools', 'p2'],
          milestone: 'v2.4.0',
          createdAt: '2026-01-25T09:14:00Z',
          updatedAt: '2026-01-30T08:40:22Z',
          comments: Math.floor(rand() * 10) + 2,
          linkedPR: '#847',
        }),
        expandable: true,
      },
    ];
  }

  // Slack — short (channel info)
  if (url.includes('slack.com')) {
    const channelId = url.split('/').pop() ?? 'C04NXYZ1234';
    const isFirst = channelId === 'C04NXYZ1234';
    return [
      {
        type: 'code',
        label: 'channelInfo',
        value: JSON.stringify({
          id: channelId,
          name: isFirst ? '#bug-reports' : '#engineering',
          topic: isFirst
            ? 'Report bugs here — attach a Jam!'
            : 'Engineering team discussions',
          memberCount: isFirst ? 42 : 18,
          unreadCount: Math.floor(rand() * 15),
        }),
        expandable: false,
      },
    ];
  }

  // Fallback — generic short properties
  return [
    {
      type: 'code',
      label: 'userID',
      value: JSON.stringify(fakeUuid(rand)),
      expandable: false,
    },
  ];
}

// --- Custom properties generation (URL-context-aware) ---

function createSnapshot(url: string, eventIndex: number): MetadataItem[] {
  const rand = seededRandom(eventIndex * 7919 + 42);
  return [
    { type: 'simple', label: 'URL', value: url },
    ...getPropertiesForUrl(url, rand),
  ];
}

// --- Navigation data generation ---

export function generateNavigationData(
  settings: JamLabSettings
): NavigationData {
  const { tabCount, urlChangesPerTab } = settings;
  const totalEvents = tabCount * urlChangesPerTab;

  // Build all events, interleaving across tabs by global index
  const allEvents: NavigationEvent[] = [];
  const tabsMap: Record<string, NavigationEvent[]> = {};

  for (let i = 0; i < tabCount; i++) {
    tabsMap[`tab-${i + 1}`] = [];
  }

  // Create events interleaved: tab0-url0, tab1-url0, tab2-url0, tab0-url1, ...
  let globalIndex = 0;
  for (let urlIdx = 0; urlIdx < urlChangesPerTab; urlIdx++) {
    for (let tabIdx = 0; tabIdx < tabCount; tabIdx++) {
      const tabId = `tab-${tabIdx + 1}`;
      const tabLabel = TAB_LABELS[tabIdx];
      const pool = URL_POOLS[tabIdx % URL_POOLS.length];
      const url = pool[urlIdx % pool.length];
      const timestamp =
        globalIndex === 0
          ? 0
          : Math.floor((globalIndex / totalEvents) * 59) + 1;

      const event: NavigationEvent = {
        id: `nav-${tabIdx}-${urlIdx}`,
        tabId,
        tabLabel,
        url,
        timestamp,
        customProperties: createSnapshot(url, globalIndex),
      };

      allEvents.push(event);
      tabsMap[tabId].push(event);
      globalIndex++;
    }
  }

  // Sort flat list by timestamp (stable — preserves insertion order for ties)
  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  // Build tab structures
  const tabs: NavigationTab[] = [];
  for (let i = 0; i < tabCount; i++) {
    const tabId = `tab-${i + 1}`;
    tabs.push({
      id: tabId,
      label: TAB_LABELS[i],
      events: tabsMap[tabId],
    });
  }

  return { tabs, events: allEvents };
}
