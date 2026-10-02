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
| [2026-02-03 Pylon Integration with Recording Links (Frederik)](./2026-02-03%20Pylon%20Integration%20with%20Recording%20Links%20(Frederik)) | Generate Jam recording links with Pylon issue context | Next.js, Radix Themes, TypeScript |
| [2026-09-09 Jam for Mac (Martin)](./2026-09-09%20Jam%20for%20Mac%20(Martin)) | Menu bar onboarding and DraftUI with draggable windows, animated grid, magnifier, and video trimming | HTML, CSS, JavaScript |
| [2026-10-01 Jam for Mac (Chris)](./2026-10-01%20Jam%20for%20Mac%20(Chris)) | Copy of the Mac playground exploring one-click recording from a record card on the window, screen, or area | HTML, CSS, JavaScript |

## Hosted prototypes

[Jam for Mac playground](https://jamdotdev.github.io/jam-prototypes/mac/) · [Open DraftUI](https://jamdotdev.github.io/jam-prototypes/mac/?surface=draft)

[Jam for Mac one-click recording](https://jamdotdev.github.io/jam-prototypes/mac-chris/?surface=recording)

GitHub Pages publishes both Mac playgrounds automatically when either folder or the Pages workflow changes on `main`. The deployment includes only the static playground files and assets; other prototypes keep their existing setup.
