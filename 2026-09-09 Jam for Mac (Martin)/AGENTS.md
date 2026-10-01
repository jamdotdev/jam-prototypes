# Agent guidelines

Context for picking up the Jam for Mac playground. `README.md` describes what each surface does; this file covers how the
code fits together and how to work on it.

## What this is

A static HTML/CSS/JS reconstruction of the Jam for Mac app's UI, built from the
[Mac App (MVP) Figma file](https://www.figma.com/design/FsOtrtQux8vRJHZI7Uwbte/Mac-App--MVP-). It simulates a macOS
desktop with four surfaces (Welcome screen, Onboarding, Recording belt, DraftUI) and a playground sidebar for tuning
each one. It explores look and feel only: nothing records, uploads, or signs in.

The real app is [jamdotdev/jam-macos](https://github.com/jamdotdev/jam-macos) (SwiftUI). Check it when a question is
about how the shipping app behaves, not how this playground looks.

## Running

```sh
python3 serve.py   # http://127.0.0.1:8765
```

Use `serve.py` rather than opening `index.html` directly when working on it: it serves byte ranges for video seeking,
runs the browser handoff, and is the only way **Make Default** can save.

## Publishing

`.github/workflows/pages.yml` publishes this folder to https://jamdotdev.github.io/jam-prototypes/mac/ on every push to
`main` that touches it. Only top-level `*.html`, `*.css`, `*.js` and `assets/` are copied, so a new file in a
subfolder other than `assets/` won't be published.

Work happens on a branch and lands through a PR. Commits use conventional prefixes scoped to the area, such as
`feat(mac): …`, `feat(recording): …`, `fix(recording): …`.

## Code structure

- **No build step and no dependencies.** Every script is a plain `<script defer>` in `index.html`, so load order
  matters. A new file needs its `<link>` or `<script>` added there.
- **One IIFE per file, exposing a `window.Jam*` global** (`JamRecording`, `JamDraft`, `JamWelcome`, `JamPlayground`,
  `JamDefaults`, …). Modules talk to each other only through those globals.
- **Surfaces** are switched by `JamPlayground.setSurface(name)` in `prototype.js`, which calls each surface's
  `setActive(bool)`. Inactive surfaces must stop animation frames, pause media, and release the camera.
- **Playground controls** are declared in `playground-schema.js`. It describes controls only: each one reads and
  writes through its surface engine's API. Add a control there rather than building sidebar markup.
- **Defaults** live in `playground-defaults-data.js`, which `serve.py` rewrites when someone presses Make Default.
  Each surface registers with `JamDefaults.register(screen, {groups, read, apply, onReset})`. A new setting needs a
  baseline value added to the data file by hand: `serve.py` checks every save against the file's existing shape and
  rejects keys it doesn't have.
- **Style varies by file.** The recording files are written densely, with many statements per line; the others are
  conventionally formatted. Match the file you're editing.
- **Respect reduced motion.** Every animated surface checks `prefers-reduced-motion` and jumps to end states.

## Tests

See `README.md` for the commands. Two things trip people up:

- The `*.test.cjs` files don't import modules. They cut individual functions out of `recording.js` by name
  (`extract('setMode')`) and run them in a `vm` sandbox with stubbed state. When a function starts calling a new helper
  or reading a new variable, add the helper to that test's `extract` list and stub the variable, or the test throws a
  `ReferenceError`.
- The `*.e2e.cjs` files drive Chromium through Playwright against a running `serve.py` on port 8765.

Run both before pushing changes to the recording belt.
