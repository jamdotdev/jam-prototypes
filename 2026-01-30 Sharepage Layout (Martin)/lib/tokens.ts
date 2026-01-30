// Design tokens extracted from Figma
// https://www.figma.com/design/8T7EGqxPIt9xRFWTztUU2J/Titles--Description-and-Activity

export const tokens = {
  colors: {
    // Gray scale
    gray: {
      1: '#fcfcfc',
      2: '#f9f9f9',
      8: '#bbbbbb',
      11: '#646464',
      12: '#202020',
    },
    // Gray alpha (for borders, overlays)
    grayAlpha: {
      1: 'rgba(0,0,0,0.01)',
      2: 'rgba(0,0,0,0.02)',
      3: 'rgba(0,0,0,0.06)',
      4: 'rgba(0,0,0,0.09)',
      7: 'rgba(0,0,0,0.19)',
      8: 'rgba(0,0,0,0.27)',
      9: 'rgba(0,0,0,0.45)',
      10: 'rgba(0,0,0,0.49)',
      11: 'rgba(0,0,0,0.61)',
    },
    // Accent (mint green)
    accent: {
      9: '#7cedc7',
      alpha7: 'rgba(0,172,112,0.54)',
    },
    // Semantic colors
    text: {
      primary: '#202020',
      secondary: '#646464',
      tertiary: '#838383',
      disabled: '#bbbbbb',
      inverse: '#ffffff',
      success: '#2a7e3b',
      info: '#0d74ce',
    },
    // Panel backgrounds
    panel: {
      solid: '#ffffff',
      translucent: 'rgba(255,255,255,0.8)',
      default: 'rgba(255,255,255,0.8)',
    },
    // Other semantic
    accentContrast: '#1c2024',
    whiteContrast: '#ffffff',
    white: '#ffffff',
    // Semantic error/status
    error7: '#f4a9aa',
    purple7: '#d1afec',
    // Indigo (for highlights)
    indigo: {
      2: '#f7f9ff',
      4: '#e1e9ff',
    },
    // Avatar colors
    avatars: {
      leafCo: '#017E42',
    },
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '24px',
    6: '32px',
    8: '48px',
    9: '64px',
  },

  radius: {
    1: '4.5px',
    2: '6px',
    3: '9px',
    4: '12px',
    5: '18px',
    full: '9999px',
  },

  typography: {
    fontFamily: {
      text: "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      code: "'CommitMono', 'SF Mono', Monaco, Consolas, monospace",
    },
    fontSize: {
      1: '12px',
      2: '14px',
      3: '16px',
      5: '20px',
    },
    lineHeight: {
      1: '16px',
      2: '20px',
      3: '24px',
      5: '28px',
    },
    letterSpacing: {
      1: '0.03px',
      2: '0px',
      3: '0px',
      5: '-0.1px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 600,
    },
  },

  shadows: {
    2: '0px 0px 0px 1px rgba(0,0,0,0.01), 0px 0px 1px 0px rgba(0,0,0,0.27), 0px 1px 2px 0px rgba(0,0,0,0.09)',
    3: '0px 1px 2px 0px rgba(0,0,0,0.02), 0px 1px 3px 0px rgba(0,0,0,0.09), 0px 0px 0px 1px rgba(0,0,0,0.01), 0px 0px 1px 0px rgba(0,0,0,0.27)',
    4: '0px 2px 4px -1px rgba(0,0,0,0.09), 0px 4px 6px -1px rgba(0,0,0,0.09), 0px 0px 0px 1px rgba(0,0,0,0.01), 0px 0px 1px 0px rgba(0,0,0,0.27)',
  },

  components: {
    buttonHeight: {
      1: '24px',
      2: '32px',
    },
  },
} as const;

// CSS variable exports for use in CSS modules
export const cssVars = {
  '--color-gray-1': tokens.colors.gray[1],
  '--color-gray-2': tokens.colors.gray[2],
  '--color-gray-8': tokens.colors.gray[8],
  '--color-gray-11': tokens.colors.gray[11],
  '--color-gray-12': tokens.colors.gray[12],
  '--color-gray-alpha-4': tokens.colors.grayAlpha[4],
  '--color-gray-alpha-7': tokens.colors.grayAlpha[7],
  '--color-gray-alpha-8': tokens.colors.grayAlpha[8],
  '--color-accent-9': tokens.colors.accent[9],
  '--color-accent-contrast': tokens.colors.accentContrast,
  '--color-text-primary': tokens.colors.text.primary,
  '--color-text-secondary': tokens.colors.text.secondary,
  '--color-panel-solid': tokens.colors.panel.solid,
  '--spacing-1': tokens.spacing[1],
  '--spacing-2': tokens.spacing[2],
  '--spacing-3': tokens.spacing[3],
  '--spacing-4': tokens.spacing[4],
  '--spacing-5': tokens.spacing[5],
  '--spacing-6': tokens.spacing[6],
  '--radius-2': tokens.radius[2],
  '--radius-3': tokens.radius[3],
  '--radius-4': tokens.radius[4],
  '--radius-5': tokens.radius[5],
  '--shadow-3': tokens.shadows[3],
} as const;

export type Tokens = typeof tokens;
