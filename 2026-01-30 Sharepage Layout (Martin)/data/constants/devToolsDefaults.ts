import type { JamOrigin, JamType } from '@/types/jam.types';

export interface MetadataItem {
  type: 'simple' | 'icon' | 'timestamp' | 'code';
  label: string;
  value: string;
  icon?: 'apple' | 'chrome' | React.ReactNode;
  version?: string;
  expandable?: boolean;
}

// Dynamic device metadata based on origin and jam type
export function generateDeviceMetadata(origin: JamOrigin, jamType: JamType): MetadataItem[] {
  if (origin === 'ios') {
    return [
      { type: 'simple', label: 'Location', value: 'Germany' },
      { type: 'icon', label: 'OS', value: 'iOS', version: '18.4.1', icon: 'apple' },
      { type: 'simple', label: 'Device', value: 'iPhone 16' },
      { type: 'simple', label: 'Battery', value: '55% Unplugged · Low power mode on' },
      { type: 'simple', label: 'Storage space', value: '127,42 GB · 3,41 GB available' },
    ];
  }

  const items: MetadataItem[] = [
    { type: 'simple', label: 'Location', value: 'Germany' },
    { type: 'icon', label: 'OS', value: 'macOS (arm)', version: '15.2.0', icon: 'apple' },
    { type: 'icon', label: 'Browser', value: 'Chrome', version: '136.0.7103.113', icon: 'chrome' },
    { type: 'simple', label: 'Window size', value: '1780x1296' },
  ];

  if (jamType === 'screenshot') {
    items.push({ type: 'simple', label: 'Screenshot size', value: '906x674' });
  }

  return items;
}

// Intercom-specific metadata shown in the JamMetaDataSection card
export const INTERCOM_METADATA: MetadataItem[] = [
  { type: 'simple', label: 'Email address', value: 'user@intercom.io' },
  {
    type: 'code',
    label: 'IntercomAgentID',
    value: JSON.stringify('d8d035c1-5df3-422f-90c7-b81986b531d8'),
    expandable: false,
  },
];

// Keep DEFAULT_METADATA for backwards compatibility
export const DEFAULT_METADATA: MetadataItem[] = generateDeviceMetadata('extension', 'video');

export const DEFAULT_CUSTOM_PROPERTIES: MetadataItem[] = [
  { type: 'simple', label: 'URL', value: 'buggle.com/longurl/ide830fk3a4ml' },
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
    label: 'activeTeam',
    value: JSON.stringify({
      id: '634eaf31-20c9-0300-263b-3fa158294736',
      name: 'Engineering',
      slug: 'engineering',
      plan: 'enterprise',
      members: [
        {
          userId: '6c836ba0-e05a-433d-981b-34456cbe086e',
          role: 'owner',
          joinedAt: '2024-03-15T08:22:41Z',
        },
        {
          userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          role: 'member',
          joinedAt: '2024-04-02T11:15:33Z',
        },
        {
          userId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          role: 'member',
          joinedAt: '2024-04-18T09:42:17Z',
        },
        {
          userId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
          role: 'admin',
          joinedAt: '2024-05-22T16:08:55Z',
        },
      ],
      settings: {
        defaultVisibility: 'team',
        allowGuestAccess: false,
        requireMFA: true,
        ssoEnabled: true,
        ssoProvider: 'okta',
      },
      billing: {
        status: 'active',
        nextInvoiceDate: '2026-02-01T00:00:00Z',
        monthlySeats: 25,
      },
    }),
    expandable: true,
  },
  {
    type: 'code',
    label: 'viewedJam',
    value: JSON.stringify({
      id: 'f59a39f5-3f84-4ab1-8bca-691a4c8e2f17',
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
    label: 'sessionState',
    value: JSON.stringify({
      sessionId: 'sess_2xK9mPqR4vT7wY1z',
      startedAt: '2026-01-30T14:33:12Z',
      lastActivity: '2026-01-30T15:47:33Z',
      pageViews: 23,
      currentPage: '/dashboard/jams/f59a39f5',
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
    label: 'networkRequests',
    value: JSON.stringify({
      summary: {
        total: 47,
        successful: 44,
        failed: 3,
        avgResponseTime: 142,
      },
      failedRequests: [
        {
          url: '/api/v2/analytics/events',
          status: 503,
          duration: 30021,
          error: 'Service Unavailable',
        },
        {
          url: '/api/v2/notifications/subscribe',
          status: 408,
          duration: 60000,
          error: 'Request Timeout',
        },
        {
          url: '/api/v2/upload/screenshot',
          status: 413,
          duration: 892,
          error: 'Payload Too Large',
        },
      ],
      slowRequests: [
        { url: '/api/v2/jams/search', status: 200, duration: 2341 },
        { url: '/api/v2/team/members', status: 200, duration: 1876 },
        { url: '/api/v2/reports/generate', status: 200, duration: 4502 },
      ],
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
          url: '/dashboard/jams/f59a39f5',
          count: 1,
        },
      ],
      warnings: 12,
      infos: 45,
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
