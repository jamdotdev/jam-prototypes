# Jam for Mac UI playground

[Open hosted playground](https://jamdotdev.github.io/jam-prototypes/mac-chris/) · [Open the Recording belt](https://jamdotdev.github.io/jam-prototypes/mac-chris/?surface=recording)

Chris's copy of [Martin's playground](../2026-09-09%20Jam%20for%20Mac%20(Martin)), exploring one-click recording: the belt has no Record button, and recording starts from a record card on the hovered window, the screen, or the drawn area.

Open `index.html` directly, or run a local server from this directory:

```sh
python3 serve.py
```

Then open http://127.0.0.1:8765. The local server supports video seeking before the full recording has loaded, the browser handoff in the welcome flow, and saving playground defaults (see below). No build step, dependencies, or network services are required.

Switch surfaces from the **View** menu in the fake macOS menu bar: Welcome screen, Onboarding, Recording belt, and DraftUI. Add `?surface=welcome`, `onboarding`, `recording`, or `draft` to the URL to open one directly. The settings button at the right of the menu bar opens the playground sidebar, which holds each surface's controls. Each surface remembers its controls and position during the session. Switching away from DraftUI pauses its video, and leaving the Recording belt releases the camera.

The windows preserve the Figma frames' 700 × 500 onboarding and 1027 × 619 DraftUI dimensions at desktop size and scale to fit smaller viewports. Drag a title bar to move its window and toolbar together. Double-click a title bar to center the window. Title bars also support arrow keys (Shift for larger steps) and Home to recenter.

### Saving playground defaults

When served by `serve.py`, **Make Default** in the sidebar saves the current controls as that surface's defaults. They're written to `playground-defaults-data.js`, so commit that file to share them. The hosted page and `index.html` opened as a file can't save.

## Welcome screen

The first-launch window: an entrance animation with orbiting stickers over a reveal grid, then **Continue in browser**. The sidebar can replay the entrance, tune the sticker orbit, and pause and scrub through each stage.

The entrance opens with a soft pad greeting that fades out over several seconds (browsers hold it until the first click when the page loads). The sidebar's Greeting sound section picks it, including three synthesized pads (`GreetingBloom` by default, `GreetingPad`, `GreetingAir`), sets its volume, and replays it.

Continue in browser animates the cursor handoff, then opens `auth.html`, a simulated "Launching Jam" page with an "Open Jam.app?" dialog. Served locally on macOS, `serve.py` opens it in your default browser and waits for you to return. On the hosted page it opens in a popup. Confirming returns to the app's permissions step (Screen Recording, Camera, Microphone). No real sign-in happens and no OS permissions are requested. Turning on a permission switch plays a short click (`CoolClick` by default); the Permissions sidebar's Switch sound section swaps it, sets its volume, or turns it off.

## Recording belt

The capture UI over a sample desktop with a Finder window and a browser window:

- **Selection.** Screen, Window, or Area. Recording starts from the target rather than the belt: a record card (icon and name over one dark panel) sits on the hovered window or the hovered screen, or just below the drawn area (above it when there's no room below). The panel leads with a **Record window**, **Record screen** or **Record area** pill, then carries what applies to that target: sizing (aspect ratio, width and height, and Resize presets; the Capture section's Rulers button switch adds the rulers toggle back for Area) or the screen's resolution, and Chrome's logs status under a divider. Clicking anywhere on a hovered window or screen also starts recording. The hovered window's red tint is drawn above every window, so its whole frame shows even where another overlaps it, and a window recording with logs enabled gets a **Capturing logs** notch on its bottom edge. Notion stands in for an Electron app, which records console logs only in debug mode. By default (**Notion logs: Turn on once**) Record never asks: Notion records straight away, and the logs row is an opt-in, **Turn on console logs** with **Restarts Notion** under it. Turning it on closes Notion, reopens it loading, and returns to the card with **Logs enabled**; a recording made without logs offers the same opt-in on the draft. Jam then remembers Notion: **Reopen Notion** in the sidebar simulates opening it again later, which drops debug mode, and Jam relaunches it with logs on while it loads and says so in a notification. **Ask on Record** switches to the earlier flow, where the row reads **Restart to capture logs** with a shimmer and the row, Record, or a click on the window opens a Jam alert offering **Restart** or **Capture without logs**. The sidebar's Window picker section switches back to select-then-record (which brings back the belt's Record button and the notch on the frame's bottom edge), limits the start to the button, toggles whether Chrome's Jam extension is connected, and resets Notion to its first-time state. Area mode can draw, drag, and resize a region, with sizing notches, aspect presets, and optional rulers. Switching from a selected window to Area starts from that window's bounds.
- **Belt.** Pause, restart, and stop, a timer, and the Idle, Recording, Paused, and Time limit states. Change the state from the sidebar to preview each one.
- **Sounds.** Recording start, pause, resume, restart, the final-seconds warning, and the end each play a UI sound. The sidebar's Sounds section turns them off, sets the volume, and picks any of the sounds in `assets/sounds/` (or None) per moment; picking one plays it.
- **Camera bubble.** Use Mac camera requests the real camera, which needs a secure context such as `127.0.0.1`. Drag the bubble to snap it to a corner or edge, where it's remembered per selection. It resizes, zooms, mirrors, and can follow the cursor. Dashed placeholders show where it will land.

The sidebar exposes the camera, placeholder, and overlay border styling. Nothing is recorded.

## DraftUI

The bundled sample video works offline. Press Play or click the preview to play/pause. Drag either trim handle to see the corresponding frame in the preview; trimmed selections turn orange. The same chevron path bends smoothly into a straight bar while dragging and bends back on release. Quick releases reverse from the current shape, and reduced motion applies the endpoint immediately. The white playhead follows playback; hovering the paused timeline shows a thin dark head and precise timestamp.

The playground controls connection state, trim presets, preview mode, handle animation duration, playback speed, looping, and the camera bubble. In Offline mode, click Offline to open its explanation; click outside or press Escape to dismiss it. Connection and trim state are independent. Title and description are editable. Create Jam and Save to drafts simulate their actions within this preview.

Choose video… loads a browser-compatible file from your computer and generates its timeline thumbnails locally. Nothing is uploaded. Playback stays within the selected range and either loops or stops at its end. The minimum selection is 0.25 seconds. Focus a trim handle or the timeline and use arrow keys to adjust by 0.1 seconds, Shift + arrows for 1 second, Home/End for a boundary, or Space to play/pause.

Figma reference displays the original screenshot and camera bubble for visual comparison. Playing or scrubbing switches back to the actual video so every interaction shows real frames. Reset restores the bundled sample and default DraftUI settings.

## Onboarding

Drag the lens to magnify the window, including the live grid. Double-click the lens to return it to the strawberry. It supports arrow keys (Shift for larger steps) and Home to recenter.

The toolbar has Disperse, Magnetize, Bulge, Twist, Ripple, and Trail effects. Each remembers its own strength, radius, and speed during the session. Grid and Lens switches toggle visibility. Zoom, Size, and Fill adjust the lens and muted gray cell highlights. Reset restores the initial settings and positions. System reduced-motion preferences disable displacement and continuous waves while retaining static hover highlights.

Start Recording simulates a recording timer; it does not access the screen, microphone, or camera. The strawberry opens a sample menu once the lens has been moved away. The back button resets the onboarding preview.

## Sound design

The default sounds come from banks generated by `tools/sound-bank.py`, each one a system:

- **One key.** Everything is drawn from D major 9 (D, F#, A, C#, E), voiced low for weight, so any two sounds that overlap stay consonant.
- **One voice per bank.** **Glass mallet** (`Glass*`, the default) is a deep mallet with a felt thump; **String pluck** (`Pluck*`) is a plucked string with a wooden body, an octave lower. The greeting adds a sustained pad under either.
- **One room.** The same small reverb on every sound.
- **One motif.** The greeting rises through D F# A C# E. Start is a quick rising fifth (D to A), pause and resume are the same third falling and rising (A to F#, F# to A), restart is a quick rewind into the start fifth, the final-seconds tick sits on the unresolved second (E to D), and the end rolls up the triad to the octave. The belt sounds are short and punctate.
- **Three loudness tiers by role.** Touch (the permission switch) is quietest, belt changes sit in the middle, and the greeting is fullest but slow. Files are loudness-matched, so the volume sliders can stay level.

Each Sounds section has a **Bank** selector that switches the belt, greeting, and switch sounds together; it reads Custom once any single sound is changed. The first, higher `Jam*` bank and earlier picks stay in every selector for comparison.

## Files

| Area | Files |
|------|-------|
| Shell, menu bar, onboarding window | `index.html`, `styles.css`, `prototype.js`, `menubar.js`, `grid.js`, `favicon.js` |
| Welcome screen and handoff | `welcome*.js/css`, `glide-easing.*`, `permissions.*`, `permission-grid.js`, `browser-handoff.js`, `auth.*` |
| Recording belt | `recording*.js/css`, `sounds.js`, `assets/sounds/` |
| DraftUI | `draft*.js/css`, `folder-picker.*` |
| Playground sidebar | `playground-*.js/css`, `assets/vendor/dialkit` |
| Local server | `serve.py` |

## Tests

The recording belt has unit tests that load slices of the source into Node, and browser tests that use Playwright against the local server.

```sh
for f in tests/*.test.cjs; do node "$f"; done
python3 tests/recording-camera-defaults.test.py

python3 serve.py &
for f in tests/*.e2e.cjs; do node "$f"; done
```

The browser tests need `playwright` installed. Set `PLAYWRIGHT_MODULE` to its path if it isn't resolvable from here, and `RECORDING_TEST_URL` to use another server.

## Design sources


- [Onboarding window · 2454:87631](https://www.figma.com/design/FsOtrtQux8vRJHZI7Uwbte/Mac-App--MVP-?node-id=2454-87631)
- [Magnifying lens · 2454:87969](https://www.figma.com/design/FsOtrtQux8vRJHZI7Uwbte/Mac-App--MVP-?node-id=2454-87969)
- [DraftUI connected · 2371:3187](https://www.figma.com/design/FsOtrtQux8vRJHZI7Uwbte/Mac-App--MVP-?node-id=2371-3187)
- [DraftUI offline · 2401:20520](https://www.figma.com/design/FsOtrtQux8vRJHZI7Uwbte/Mac-App--MVP-?node-id=2401-20520)
- [Trim controls · 2053:2061](https://www.figma.com/design/FsOtrtQux8vRJHZI7Uwbte/Mac-App--MVP-?node-id=2053-2061)
- [Player heads · 2113:3544](https://www.figma.com/design/FsOtrtQux8vRJHZI7Uwbte/Mac-App--MVP-?node-id=2113-3544)

The wallpaper, strawberry, Wi-Fi, back arrow, lens, and masks in `assets/` are the original Figma exports. HTML/CSS reconstruct the interface; the lens mirrors its DOM and canvas. Typography uses the original SF Pro family when installed, with the macOS system font as a fallback. The desktop mask is also embedded in CSS so it works when opened as a local file.

DraftUI uses the original Figma preview, camera bubble, folder/offline icons, chevrons, play/pause icons, and popover glass surface. The popover glass is a 2× PNG export because SVG browsers do not reproduce Figma's glass and blend effects. Text and interactive controls remain HTML. The bundled sample is a smaller, browser-compatible copy of the user-provided `jam-video.mp4`, preserving the full recording. It is stored as `assets/draft/jam-video.mp4`; its filmstrip is generated from the same video.

To share, zip this entire folder with `index.html` and `assets/` together. Recipients should extract the ZIP completely and open `index.html` in their browser. No installation or internet connection is needed.

Verified in Chromium: original window dimensions, all six effects, lens dragging and recentering, window keyboard movement, recording start/stop, controls, and viewport fitting at 1280 × 900, 800 × 720, and 390 × 844. No page errors were reported. Grid runtime checks also cover reduced motion, visibility suspension, and idle-frame termination.

DraftUI verification covers the original 1027 × 619 frame, actual video playback, both handle drags and preview seeks, orange trimmed state, handle animation/release, hover timestamps, nonloop trim boundaries, looping, offline popover dismissal, local video loading, and state preservation across surfaces. Timeline logic checks cover scaled dragging, minimum duration, keyboard controls, loading/error recovery, and pause on inactive surfaces.
