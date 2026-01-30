# SharePage Layout System Specification

> Engineering handover document for implementing the SharePage split-panel layout in the main application.

---

## Overview

The SharePage layout is a responsive two-panel system with a main content area and a DevTools panel. The system supports:

- **Inline mode**: Both panels side-by-side with resizable divider
- **Full-width mode**: Main panel only (DevTools closed or undocked)
- **Undocked mode**: DevTools in a separate browser window

---

## 1. Layout Modes

### 1.1 Full-Width Mode
- Single panel fills available space
- Active when DevTools is closed OR undocked to separate window
- "Show Devtools" button visible in main header (ghost button with code icon)

### 1.2 Split Mode
- Two panels with unified visual container (shared background, shadow, border-radius)
- Resizable divider between panels
- DevTools panel has its own header with controls

### 1.3 Undocked Mode
- DevTools opens in separate browser window
- Main window shows full-width layout
- Windows communicate via BroadcastChannel API
- "Dock" action returns DevTools inline

---

## 2. Panel Ratio System

### 2.1 Preset Ratios
Three built-in layout presets:

| Preset | Main Panel | DevTools Panel | Use Case |
|--------|------------|----------------|----------|
| `60/40` | 75% | 25% | Default, content-focused |
| `50/50` | 50% | 50% | Equal split |
| `40/60` | 30% | 70% | DevTools-focused |

### 2.2 Layout Controls

**DevTools header toolbar (left to right):**
- **Layout icon button**: Shows **current** layout state (not anticipatory next state)
  - Tooltip describes current layout (e.g., "Large main panel")
  - Click cycles to next preset in sequence
- **Dropdown chevron**: Opens menu with preset options and undock actions
- **Separator**: Visual divider (1px vertical line)
- **"Hide Devtools" button**: Ghost button with code icon to close DevTools panel

**Main header (when DevTools closed/undocked):**
- **"Show Devtools" button**: Ghost button with code icon to open DevTools panel

**Cycle sequence**: `60/40` → `50/50` → `40/60` → `60/40` ...

### 2.3 Custom Ratios
- User can drag divider to any position
- Custom ratio takes precedence over preset
- Constrained range: **30% to 75%** (main panel)
- Snap behavior: Snaps to preset when within 5% threshold

### 2.4 Ratio Calculation
```
effectiveRatio = customRatio ?? presetRatio

where presetRatio:
  '60/40' → 75%
  '50/50' → 50%
  '40/60' → 30%
```

---

## 3. Resizable Divider

### 3.1 Interaction Design
- **Visual**: Thin line (1px) with hidden handle
- **Hit area**: 8px wide (extends 4px each side)
- **Handle**: 4px × 40px, appears on hover/drag
- **Cursor**: `col-resize` during drag

### 3.2 Drag Behavior
- Drag starts on mousedown
- Ratio calculated as mouse position / container width
- Transitions disabled during drag for smooth feedback
- Drag ends on mouseup (anywhere on document)

### 3.3 Constraints
```
MIN_MAIN_PANEL = 30%
MAX_MAIN_PANEL = 75%
```

---

## 4. DevTools Undocking

### 4.1 Undock Positions

**Undock Right:**
- Width: 720px (fixed)
- Height: Matches main window height
- Position: 8px gap to right of main window

**Undock Bottom:**
- Width: Matches main window width
- Height: 400px (fixed)
- Position: 8px gap below main window

### 4.2 Window Management
- Window name: `'jam-devtools'` (reuses same window on re-undock)
- Poll interval: 500ms to detect window close
- Auto-cleanup: Returns to inline mode when undocked window closes

### 4.3 Cross-Window Communication

**BroadcastChannel**: `'jam-devtools'`

| Message Type | Direction | Action |
|--------------|-----------|--------|
| `dock` | Undocked → Main | Close popup, show inline |
| `close` | Undocked → Main | Mark as closed |

---

## 5. State Management

### 5.1 State Shape
```typescript
interface DevToolsState {
  isOpen: boolean;           // DevTools visibility
  layoutRatio: LayoutRatio;  // Current preset ('60/40' | '50/50' | '40/60')
  customRatio: number | null; // Custom dragged ratio (null = use preset)
  isUndocked: boolean;       // In separate window
  isDragging: boolean;       // Divider drag in progress
}
```

### 5.2 Derived State
```typescript
// Computed from state
effectiveRatio: number;      // Actual % to use (custom ?? preset)
showDevToolsInline: boolean; // isOpen && !isUndocked
showDevToolsToggle: boolean; // !isOpen || isUndocked
```

### 5.3 Persistence
- **Storage**: localStorage
- **Key**: `'jam-devtools-state'`
- **Persisted**: `layoutRatio`, `customRatio` only
- **Not persisted**: `isOpen`, `isUndocked`, `isDragging`

---

## 6. Component Architecture

### 6.1 Button Component Wrapper

**Pattern**: Wrap Radix UI Button with custom variant mapping

```typescript
// Variant mapping (our API → Radix API)
const VariantMapping = {
  solid: 'solid',
  soft: 'soft',
  outline: 'outline',
  surface: 'surface',
  ghost: 'soft',  // Ghost uses 'soft' internally
};
```

**Why ghost → soft?**
- Radix's native `ghost` uses `height: fit-content`
- This causes inconsistent heights with other variants
- Mapping to `soft` ensures fixed height
- CSS override makes background transparent

**Data attribute pattern:**
```tsx
<StyledButton
  variant={VariantMapping[variant]}  // Radix variant
  data-variant={variant}             // Original variant for CSS
  {...props}
/>
```

### 6.2 Styling Overrides

**Global button styles:**
```css
border-radius: var(--radius-3);  /* 9px */
font-weight: 500;
```

**Ghost variant override:**
```css
[data-variant="ghost"] {
  background-color: transparent;

  &:hover:not(:disabled) {
    background-color: var(--gray-a3);
  }
}
```

---

## 7. Theming System

### 7.1 Radix Theme Configuration
```tsx
<Theme
  accentColor="teal"   // Base color (overridden below)
  grayColor="gray"
  radius="medium"
  scaling="100%"
/>
```

### 7.2 Custom Accent Color Scale

Override Radix's accent variables with custom mint green:

```css
:root .radix-themes {
  --accent-1: #f9fefc;   /* Lightest background */
  --accent-2: #f2fcf8;
  --accent-3: #dbfaee;
  --accent-4: #c5f6e3;
  --accent-5: #aeeed6;
  --accent-6: #96e2c6;
  --accent-7: #76d2b2;
  --accent-8: #3bbe98;
  --accent-9: #7cedc7;   /* Primary accent */
  --accent-10: #71e3bd;
  --accent-11: #007b5c;  /* Text on light */
  --accent-12: #114435;  /* Darkest */

  /* Alpha variants */
  --accent-a1 through --accent-a12

  /* Semantic */
  --accent-contrast: #0a281e;
  --accent-surface: #effbf6cc;
  --accent-indicator: #7cedc7;
  --accent-track: #7cedc7;
}
```

### 7.3 Custom CSS Variable System

**Token categories:**
- `--color-gray-*`: Gray scale (1-12)
- `--color-gray-alpha-*`: Transparent grays
- `--color-text-*`: Semantic text colors (primary, secondary, tertiary, disabled, inverse)
- `--color-panel-*`: Panel backgrounds (solid, translucent)
- `--spacing-*`: Space scale (1-6)
- `--radius-*`: Border radius scale (1-5, full)
- `--shadow-*`: Elevation shadows (2-4)
- `--font-*`: Typography (text, code)

---

## 8. CSS Implementation Notes

### 8.1 Flex Layout Pattern
```css
/* Main wrapper */
.panelsWrapper {
  display: flex;
  flex: 1;
  min-width: 0;  /* Critical for flex shrinking */
  overflow: hidden;
}

/* Main panel - fixed percentage */
.mainPanelWrapper {
  flex: 0 0 var(--main-ratio);
  min-width: 0;
}

/* DevTools panel - fill remaining */
.devToolsPanelWrapper {
  flex: 1;
  min-width: 0;
}
```

### 8.2 Transition Handling
```css
/* Smooth transitions normally */
.mainPanelWrapper {
  transition: flex 0.2s ease;
}

/* Disable during drag for responsiveness */
.layout.dragging .mainPanelWrapper {
  transition: none;
}
```

### 8.3 CSS Custom Property for Ratio
```tsx
// Set dynamically via inline style
<Flex style={{ '--main-ratio': `${effectiveRatio}%` }}>
```

---

## 9. Accessibility Considerations

- Divider should be keyboard accessible (arrow keys to resize)
- Focus management when toggling DevTools
- Screen reader announcements for layout changes
- Respect `prefers-reduced-motion` for transitions

---

## 10. Implementation Checklist

- [ ] Split panel layout with flex
- [ ] Three preset ratio options
- [ ] Custom ratio via drag
- [ ] Divider with hover/active states
- [ ] LocalStorage persistence for ratios
- [ ] Undock to separate window (right/bottom)
- [ ] BroadcastChannel communication
- [ ] Window close detection
- [ ] Button wrapper with variant mapping
- [ ] Custom accent color scale
- [ ] Transition management during drag

---

## References

- **Prototype repo**: This codebase
- **Radix Themes**: https://www.radix-ui.com/themes
- **Figma design**: [Link to Figma file]
