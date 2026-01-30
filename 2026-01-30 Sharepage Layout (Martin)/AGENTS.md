# Agent Guidelines

## Styling Rules

### Rule 1: Use Radix Themes Components Instead of Custom CSS

**Never style buttons, inputs, or interactive elements with custom CSS.** Always use Radix Themes components with their built-in props (`variant`, `color`, `size`, `radius`) to achieve the desired visual outcome.

```tsx
// ❌ Bad - Custom CSS styling
<button className={styles.myButton}>Click me</button>

// ✅ Good - Radix Themes component with props
<Button variant="solid" size="2" color="gray">Click me</Button>
```

### Rule 2: Maximize Radix Component Reuse

Before writing custom CSS, check if a Radix Themes component can achieve the same result. The goal is to minimize custom CSS and maximize consistency with the design system.

**When custom CSS is acceptable:**
- Layout containers (flex, grid arrangements)
- Positioning and spacing between components
- Unique border-radius combinations (e.g., split buttons)
- Transform utilities (rotations, flips)
- Non-interactive elements without Radix equivalents

**When custom CSS is NOT acceptable:**
- Button backgrounds, colors, hover states
- Input field styling
- Typography (use `Text`, `Heading` components)
- Badges, tooltips, dialogs, dropdowns

### Rule 3: Use Component Props Over className

Radix Themes components accept styling props. Use these instead of CSS overrides:

```tsx
// ❌ Bad - CSS override
<Button className={styles.largeGrayButton}>Submit</Button>

// ✅ Good - Component props
<Button variant="outline" size="3" color="gray">Submit</Button>
```

### Rule 4: Never Set Icon Size Inside Buttons

Radix `Button` and `IconButton` components automatically size nested icons based on the button's `size` prop. **Do not manually set icon dimensions** unless explicitly requested by the user.

```tsx
// ❌ Bad - Manual icon sizing
<IconButton variant="ghost" size="1" color="gray">
  <XCloseIcon size={20} />
</IconButton>

// ✅ Good - Let Radix handle icon sizing
<IconButton variant="ghost" size="1" color="gray">
  <XCloseIcon />
</IconButton>
```

**Why?**
- Radix applies appropriate sizing via CSS to child SVGs
- Manual sizing can cause misalignment or inconsistent proportions
- Button `size` prop is the single source of truth for dimensions

---

## Radix Themes Component Inventory

Reference: [Radix Themes Documentation](https://www.radix-ui.com/themes/docs)

### Layout Components

| Component | Description | Common Props |
|-----------|-------------|--------------|
| `Box` | Generic container | `p`, `m`, `width`, `height` |
| `Flex` | Flexbox container | `direction`, `align`, `justify`, `gap` |
| `Grid` | CSS Grid container | `columns`, `rows`, `gap` |
| `Container` | Centered max-width container | `size` |
| `Section` | Vertical section with padding | `size` |

### Typography Components

| Component | Description | Common Props |
|-----------|-------------|--------------|
| `Text` | Body text | `size`, `weight`, `color`, `align` |
| `Heading` | Headings h1-h6 | `size`, `weight`, `color`, `as` |
| `Code` | Inline code | `size`, `variant`, `color` |
| `Link` | Anchor link | `size`, `weight`, `color`, `underline` |
| `Em` | Emphasized text | - |
| `Strong` | Strong text | - |
| `Quote` | Inline quote | - |
| `Blockquote` | Block quote | `size`, `color` |
| `Kbd` | Keyboard shortcut | `size` |

### Button Components

| Component | Description | Common Props |
|-----------|-------------|--------------|
| `Button` | Standard button | `variant`, `size`, `color`, `radius`, `loading` |
| `IconButton` | Icon-only button | `variant`, `size`, `color`, `radius`, `loading` |

**Button Variants:** `solid`, `soft`, `outline`, `ghost`, `surface`, `classic`
**Button Sizes:** `1` (24px), `2` (32px), `3` (40px), `4` (48px)
**Button Colors:** `gray`, `gold`, `bronze`, `brown`, `yellow`, `amber`, `orange`, `tomato`, `red`, `ruby`, `crimson`, `pink`, `plum`, `purple`, `violet`, `iris`, `indigo`, `blue`, `cyan`, `teal`, `jade`, `green`, `grass`, `lime`, `mint`, `sky`

### Form Components

| Component | Description | Common Props |
|-----------|-------------|--------------|
| `TextField` | Text input | `size`, `variant`, `color`, `radius` |
| `TextArea` | Multi-line input | `size`, `variant`, `color`, `resize` |
| `Select` | Dropdown select | `size`, `variant`, `color` |
| `Checkbox` | Checkbox input | `size`, `variant`, `color` |
| `CheckboxGroup` | Group of checkboxes | `size`, `color` |
| `CheckboxCards` | Card-style checkboxes | `size`, `columns` |
| `Radio` | Radio input | `size`, `variant`, `color` |
| `RadioGroup` | Group of radios | `size`, `color` |
| `RadioCards` | Card-style radios | `size`, `columns` |
| `Switch` | Toggle switch | `size`, `variant`, `color`, `radius` |
| `Slider` | Range slider | `size`, `variant`, `color`, `radius` |
| `SegmentedControl` | Segmented options | `size`, `radius` |

### Overlay Components

| Component | Description | Common Props |
|-----------|-------------|--------------|
| `Dialog` | Modal dialog | `size` |
| `AlertDialog` | Confirmation dialog | `size` |
| `Popover` | Floating content | `size` |
| `HoverCard` | Hover-triggered card | `size` |
| `Tooltip` | Tooltip on hover | `content` |
| `ContextMenu` | Right-click menu | - |
| `DropdownMenu` | Dropdown menu | `size` |

### Data Display Components

| Component | Description | Common Props |
|-----------|-------------|--------------|
| `Avatar` | User avatar | `size`, `variant`, `color`, `radius`, `fallback` |
| `Badge` | Status badge | `size`, `variant`, `color`, `radius` |
| `Callout` | Callout box | `size`, `variant`, `color` |
| `Card` | Card container | `size`, `variant` |
| `DataList` | Key-value list | `size`, `orientation` |
| `Table` | Data table | `size`, `variant` |
| `Tabs` | Tab panels | `size`, `variant` |
| `TabNav` | Navigation tabs | `size` |
| `Progress` | Progress bar | `size`, `variant`, `color`, `radius` |
| `Skeleton` | Loading skeleton | `loading` |
| `Spinner` | Loading spinner | `size`, `loading` |

### Utility Components

| Component | Description | Common Props |
|-----------|-------------|--------------|
| `Separator` | Visual divider | `size`, `orientation` |
| `ScrollArea` | Scrollable container | `size`, `type`, `scrollbars` |
| `AspectRatio` | Fixed aspect ratio | `ratio` |
| `Inset` | Negative margin utility | `side`, `clip` |
| `VisuallyHidden` | Screen reader only | - |
| `Portal` | Render in portal | `container` |
| `Reset` | CSS reset wrapper | - |
| `Slot` | Composition utility | - |
| `AccessibleIcon` | Icon with label | `label` |
| `Theme` | Theme provider | `accentColor`, `grayColor`, `radius`, `scaling` |

---

## Project-Specific Mappings

Based on this project's design, use these Radix components:

| UI Element | Radix Component | Props |
|------------|-----------------|-------|
| Ghost icon button (24px) | `IconButton` | `variant="ghost" size="1" color="gray"` |
| Outline icon button (32px) | `IconButton` | `variant="outline" size="2" color="gray"` |
| Ghost text button (24px) | `Button` | `variant="ghost" size="1" color="gray"` |
| Primary action button | `Button` | `variant="solid" size="2"` |
| Dropdown menu | `DropdownMenu` | `color="gray" variant="soft"` |
| Tooltip | `Tooltip` | `content="..."` |

---

## References

- [Radix Themes Documentation](https://www.radix-ui.com/themes/docs)
- [Radix Themes GitHub](https://github.com/radix-ui/themes)
- [Radix Colors](https://www.radix-ui.com/colors)
