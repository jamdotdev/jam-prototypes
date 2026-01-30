# Sharepage Layout Prototype

A responsive split-panel layout prototype for jam.dev sharepages with DevTools panel.

## Features

- **Split Panel Layout**: Resizable two-panel system with main content and DevTools
- **Layout Presets**: Three preset ratios (60/40, 50/50, 40/60) with custom drag support
- **Undock Support**: DevTools can be undocked to a separate window (right or bottom)
- **Cross-Window Sync**: Theme and state synchronization via BroadcastChannel API
- **Dark Mode**: Full light/dark theme toggle with localStorage persistence
- **Custom Design Tokens**: Radix UI Themes with custom accent color scale

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Components**: Radix UI Themes
- **Styling**: styled-components + CSS Modules
- **State Management**: React hooks with localStorage persistence

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the prototype.

## Documentation

See [docs/sharepage-layout-spec.md](./docs/sharepage-layout-spec.md) for the engineering handover specification.

## Key Files

- `components/SharePageLayout/` - Main split-panel layout
- `components/DevToolsHeader/` - DevTools panel header with controls
- `components/ThemeProvider/` - Theme context and Radix Theme wrapper
- `hooks/useDevToolsState.ts` - DevTools state management
- `hooks/useTheme.ts` - Theme preference management
- `app/globals.css` - Design tokens and dark mode CSS variables
