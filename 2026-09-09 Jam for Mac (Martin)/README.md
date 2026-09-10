# Jam for Mac UI playground

[Open hosted playground](https://jamdotdev.github.io/jam-prototypes/mac/) · [Open DraftUI](https://jamdotdev.github.io/jam-prototypes/mac/?surface=draft)

Open `index.html` directly, or run a local server from this directory:

```sh
python3 serve.py
```

Then open http://127.0.0.1:8765. The local server supports video seeking before the full recording has loaded. No build step, dependencies, or network services are required.

Use the floating Onboarding / DraftUI switcher above the window. Each surface has its own playground below the window and remembers its controls and position during the session. Switching away from DraftUI pauses its video.

The windows preserve the Figma frames' 700 × 500 onboarding and 1027 × 619 DraftUI dimensions at desktop size and scale to fit smaller viewports. Drag either title bar to move its window and toolbar together. Double-click a title bar to center the window. Title bars also support arrow keys (Shift for larger steps) and Home to recenter.

## DraftUI

The bundled sample video works offline. Press Play or click the preview to play/pause. Drag either trim handle to see the corresponding frame in the preview; trimmed selections turn orange. The same chevron path bends smoothly into a straight bar while dragging and bends back on release. Quick releases reverse from the current shape, and reduced motion applies the endpoint immediately. The white playhead follows playback; hovering the paused timeline shows a thin dark head and precise timestamp.

The playground controls connection state, trim presets, preview mode, handle animation duration, playback speed, looping, and the camera bubble. In Offline mode, click Offline to open its explanation; click outside or press Escape to dismiss it. Connection and trim state are independent. Title and description are editable. Create Jam and Save to drafts simulate their actions within this preview.

Choose video… loads a browser-compatible file from your computer and generates its timeline thumbnails locally. Nothing is uploaded. Playback stays within the selected range and either loops or stops at its end. The minimum selection is 0.25 seconds. Focus a trim handle or the timeline and use arrow keys to adjust by 0.1 seconds, Shift + arrows for 1 second, Home/End for a boundary, or Space to play/pause.

Figma reference displays the original screenshot and camera bubble for visual comparison. Playing or scrubbing switches back to the actual video so every interaction shows real frames. Reset restores the bundled sample and default DraftUI settings.

## Onboarding

Drag the lens to magnify the window, including the live grid. Double-click the lens to return it to the strawberry. It supports arrow keys (Shift for larger steps) and Home to recenter.

The toolbar has Disperse, Magnetize, Bulge, Twist, Ripple, and Trail effects. Each remembers its own strength, radius, and speed during the session. Grid and Lens switches toggle visibility. Zoom, Size, and Fill adjust the lens and muted gray cell highlights. Reset restores the initial settings and positions. System reduced-motion preferences disable displacement and continuous waves while retaining static hover highlights.

Start Recording simulates a recording timer; it does not access the screen, microphone, or camera. The strawberry opens a sample menu once the lens has been moved away. The back button resets the onboarding preview.

Design sources:

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
