# Recording Links Setup — Install Page Prototype

Iteration of the install screen for Recording Links, based on Martin's [original prototype](https://jam-install-ai-prototype.netlify.app/prototype-domain-setup.html) but with framework decisions grounded in customer evidence.

## What changed vs Martin's prototype

| Topic | Martin's prototype | This iteration |
|---|---|---|
| **Frameworks** | HTML, Next.js, Angular, Nuxt, Remix, Vite (6) | HTML, Next.js, Angular, GTM (4) |
| **Selection criteria** | Coverage of common stacks | Documented customer pain or unique technical nuance |
| **Variants** | A (pill), B (tabs), D (chips) | B (tabs) only |
| **Per-tab content** | One snippet, no gotchas | Snippet + gotchas + collapsed fallback per tab |

## Why these 4 tabs

- **HTML** — default; canonical 3-line snippet; covers Vite, Vue, Nuxt, Remix, SvelteKit, WordPress, Shopify, etc. by inheritance
- **Next.js** — 3 documented customer cases (TeachingStrategies, Kittl, SmartTeach) hit `next/script` defer + placement issues; needs framework-specific snippet
- **Angular** — 1 documented customer case (Dec 2025) hit Zone.js change-detection thrash; needs SDK with `runOutsideAngular`
- **GTM** — 2 documented cases (CSUP-491, Nov 2025); standard `<script type="module">` doesn't execute in GTM injection model

Frameworks excluded (Vue, Nuxt, Remix, SvelteKit, Astro, WordPress, Webflow, Shopify) have zero documented customer pain. Their snippet is identical to HTML — only the file path differs. Customer in those stacks uses HTML tab.

See companion docs in `apiofjam` repo (worktree `matheus+recording-link-tech-design`):
- `recording-links-framework-tabs.md` — tab list + inclusion criteria
- `recording-links-tab-html.md` — HTML tab content
- `recording-links-tab-nextjs.md` — Next.js tab content
- `recording-links-tab-angular.md` — Angular tab content
- `recording-links-tab-gtm.md` — GTM tab content

## Per-tab nuances

| Tab | Primary | Secondary (collapsed) | Critical gotchas |
|---|---|---|---|
| HTML | Script tags in `<head>` | — | Don't inject from JS; load on every page |
| Next.js | `<Script>` with `beforeInteractive` (App/Pages Router toggle) | SDK with `useEffect` | ⚠️ No `defer`; mount in root |
| Angular | SDK with `NgZone.runOutsideAngular` | Script tag in `index.html` (not recommended) | Mount in `AppComponent`; CSP origins |
| GTM | Single Custom HTML Tag with dynamic `import()` | 2-tag variant | Don't paste standard snippet; trigger All Pages; publish workspace |

## Tech Stack

- Single HTML file (`index.html`) with inline CSS + vanilla JS
- No build step required — open in browser
- Reuses Martin's design tokens (CSS custom properties), Inter font, JetBrains Mono code

## Running

Just open `index.html` in a browser, or serve the directory:

```bash
python3 -m http.server 8000
# or
npx serve .
```

Visit `http://localhost:8000`.
