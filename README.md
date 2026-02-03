# Jam Prototypes

A collection of self-contained prototypes for jam.dev.

## Structure

Each folder is a standalone prototype with its own dependencies and setup instructions.

### Naming Convention

```
YYYY-MM-DD Prototype Name (Creator)
```

**Examples:**
- `2026-01-30 Sharepage Layout (Martin)`
- `2026-02-15 Dashboard Redesign (Chris)`

### Guidelines

1. **Self-contained**: Each prototype should be fully runnable on its own
2. **README**: Include a README.md in each prototype folder with setup instructions
3. **Dependencies**: Each prototype has its own `package.json` / dependency management
4. **Date**: Use the date when the prototype was started
5. **Creator**: Use first name of the primary creator

## Prototypes

| Folder | Description | Tech Stack |
|--------|-------------|------------|
| [2026-01-28 PIP Recording Window (Chris)](./2026-01-28%20PIP%20Recording%20Window%20(Chris)) | Floating Picture-in-Picture window for screen recording with audio waveform visualization | Vanilla JS, Document PIP API, Web Audio API |
| [2026-01-30 Sharepage Layout (Martin)](./2026-01-30%20Sharepage%20Layout%20(Martin)) | Split-panel layout with DevTools, theming system | Next.js, Radix UI, styled-components |
| [2026-02-02 Jam MCP Landing (Frederik)](./2026-02-02%20Jam%20MCP%20Landing%20(Frederik)) | Landing page for Jam MCP integration | Next.js, Radix Themes, TypeScript |
| [2026-02-03 Pylon Integration Test (Frederik)](./2026-02-03%20Pylon%20Integration%20Test%20(Frederik)) | Testing Pylon integration | Next.js, Radix Themes, TypeScript |
