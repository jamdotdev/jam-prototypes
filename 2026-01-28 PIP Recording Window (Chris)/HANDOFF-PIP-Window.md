# Technical Handoff: Picture-in-Picture Recording Window

This document covers the new PIP-based recording experience to replace the current "recording in progress" UI. The start screen and review screen remain unchanged.

---

## Overview

Instead of keeping users on the recording page during capture, we now open a **Document Picture-in-Picture window** that floats above all content. This lets users navigate freely while maintaining recording controls.

**Browser Requirement**: Chrome 116+ (Document PIP API)

---

## Document Picture-in-Picture API

```javascript
// Check for support
if (!("documentPictureInPicture" in window)) {
  // Fallback to current recording UI
}

// Open PIP window
const pipWindow = await documentPictureInPicture.requestWindow({
  width: 400,
  height: 300,
});

// Inject styles and DOM into PIP window
pipWindow.document.head.appendChild(styleElement);
pipWindow.document.body.appendChild(container);

// Handle PIP window close
pipWindow.addEventListener("pagehide", () => {
  // Stop recording, cleanup
});
```

---

## PIP Window Structure

```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │     Video Preview           │    │
│  │     (rounded corners)       │    │
│  │                             │    │
│  │      ┌───────────┐          │    │
│  │      │ ● 00:42   │          │    │  ← Timer badge (centered)
│  │      └───────────┘          │    │
│  └─────────────────────────────┘    │
│                                     │
│         ┌───┐  ┌───────────┐        │
│         │ 🎤 │  │ ■  Stop   │        │  ← Controls bar
│         └───┘  └───────────┘        │
│        (mute)   (stop + waveform)   │
└─────────────────────────────────────┘
```

---

## Video Preview Frame

### Dynamic Sizing with Rounded Corners

The video preview must maintain rounded corners regardless of the recorded content's aspect ratio. Key insight: the frame container must be explicitly sized to match the video dimensions, not just use `object-fit`.

```javascript
function resizeVideoFrame() {
  const videoWidth = pipVideo.videoWidth;
  const videoHeight = pipVideo.videoHeight;
  if (!videoWidth || !videoHeight) return;

  const aspectRatio = videoWidth / videoHeight;

  // Available space (minus padding for border visibility)
  const wrapRect = videoWrap.getBoundingClientRect();
  const availableWidth = wrapRect.width - 40;
  const availableHeight = wrapRect.height - 40;

  let frameWidth = availableWidth;
  let frameHeight = frameWidth / aspectRatio;

  // Scale down if height exceeds available space
  if (frameHeight > availableHeight) {
    frameHeight = availableHeight;
    frameWidth = frameHeight * aspectRatio;
  }

  videoFrame.style.width = frameWidth + 'px';
  videoFrame.style.height = frameHeight + 'px';
}

// Resize on video metadata load
pipVideo.addEventListener('loadedmetadata', resizeVideoFrame);

// Poll for dimension changes during recording (screen resize)
setInterval(resizeVideoFrame, 500);

// Resize on PIP window resize
pipWindow.addEventListener('resize', resizeVideoFrame);
```

### Frame Styling

```css
.pip-video-frame {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  /* Visible border ensures corners show even at edge cases */
  box-shadow: 0 0 0 3px rgba(255,255,255,0.12),
              0 4px 20px rgba(0,0,0,0.4);
}

.pip-video-frame video {
  display: block;
  width: 100%;
  height: 100%;
}
```

---

## Timer Badge

Centered overlay on the video preview with recording indicator.

```css
.pip-recording-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  padding: 8px 16px;
  border-radius: 999px;
  font-size: 18px;
  font-weight: 500;
  color: #fff;
}

.pip-recording-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff4d4d;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1 }
  50% { opacity: 0.4 }
}
```

---

## Mute Button

Circular button to the left of stop button. Only shown when voice mode is active.

```css
.pip-mute-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.pip-mute-btn.muted {
  background: rgba(255,77,77,0.3);
}
```

### Toggle Logic

```javascript
let isMuted = false;

muteBtn.onclick = () => {
  isMuted = !isMuted;

  // Toggle actual mic track
  micStream.getAudioTracks().forEach(track => {
    track.enabled = !isMuted;
  });

  // Update icon (mic vs mic-off)
  // Update button class for styling
  muteBtn.classList.toggle("muted", isMuted);
};
```

---

## Audio Waveform Visualization

When voice mode is active, the stop button shows an audio-reactive waveform that responds to microphone input levels.

### Structure

```html
<button class="pip-stop-btn">
  <div class="pip-waveform">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <path id="pipWavePath" fill="rgba(255,255,255,0.35)" />
    </svg>
  </div>
  <div class="pip-stop-icon"></div>
  <span>Stop</span>
</button>
```

### Waveform Styling

```css
.pip-stop-btn {
  position: relative;
  overflow: hidden;
  /* ... other stop button styles */
}

.pip-waveform {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
  pointer-events: none;
}

.pip-waveform svg {
  width: 100%;
  height: 100%;
}

/* Ensure icon and text appear above waveform */
.pip-stop-icon, .pip-stop-btn span {
  position: relative;
  z-index: 1;
}
```

### Audio Analysis (from main window)

The audio analysis runs in the **main window** and updates the PIP window's DOM via cross-window access. This avoids MediaStream access issues in the PIP context.

```javascript
// Create audio context and analyser
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
analyser.smoothingTimeConstant = 0.3;
analyser.minDecibels = -90;
analyser.maxDecibels = -10;

// Connect mic stream
const source = audioContext.createMediaStreamSource(micStream);
source.connect(analyser);

const bufferLength = analyser.frequencyBinCount;
const frequencyData = new Uint8Array(bufferLength);
const timeDomainData = new Uint8Array(bufferLength);

function updateWaveform() {
  if (!pipWindow) return;

  const wavePath = pipWindow.document.getElementById("pipWavePath");
  if (!wavePath) {
    requestAnimationFrame(updateWaveform);
    return;
  }

  // Get both time domain (responsive) and frequency data
  analyser.getByteTimeDomainData(timeDomainData);
  analyser.getByteFrequencyData(frequencyData);

  // Calculate volume from time domain
  let maxAmplitude = 0;
  for (let i = 0; i < bufferLength; i++) {
    const amplitude = Math.abs(timeDomainData[i] - 128);
    if (amplitude > maxAmplitude) maxAmplitude = amplitude;
  }

  // Also get frequency-based volume
  let freqSum = 0;
  for (let i = 2; i < 48; i++) {
    freqSum += frequencyData[i];
  }
  const freqAvg = freqSum / 46;

  // Use higher of the two for responsiveness
  const timeVolume = maxAmplitude / 128;
  const freqVolume = freqAvg / 180;
  const volume = Math.min(Math.max(timeVolume, freqVolume) * 1.5, 1);

  // Generate wave path
  // volume=0 → wave at bottom (y=85)
  // volume=1 → wave at top (y=20)
  const baseY = 85 - (volume * 65);
  const time = Date.now() / 1000;

  let d = `M0,100 L0,${baseY}`;
  for (let i = 0; i <= 12; i++) {
    const x = (i / 12) * 100;
    const waveOffset = Math.sin(time * 3 + i * 0.8) * (3 + volume * 15);
    const y = Math.max(20, Math.min(95, baseY + waveOffset));
    // Quadratic curves for smooth wave
    d += ` Q${x},${y} ${x + 4},${y}`;
  }
  d += ` L100,100 Z`;

  wavePath.setAttribute("d", d);
  requestAnimationFrame(updateWaveform);
}

updateWaveform();
```

---

## Audio Stream Handling

When "Screen + voice" is selected, combine microphone audio with any system audio from the screen capture.

```javascript
// Get mic stream first
const micStream = await navigator.mediaDevices.getUserMedia({
  audio: { echoCancellation: true, noiseSuppression: true }
});

// Get screen capture (may include system audio)
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: { frameRate: 30 },
  audio: true
});

// Combine audio streams
const audioContext = new AudioContext();
const dest = audioContext.createMediaStreamDestination();

// Add mic
const micSource = audioContext.createMediaStreamSource(micStream);
micSource.connect(dest);

// Add system audio if present
const screenAudioTracks = screenStream.getAudioTracks();
if (screenAudioTracks.length > 0) {
  const screenAudioStream = new MediaStream([screenAudioTracks[0]]);
  const screenSource = audioContext.createMediaStreamSource(screenAudioStream);
  screenSource.connect(dest);
}

// Combined stream for recording
const recordingStream = new MediaStream([
  ...screenStream.getVideoTracks(),
  ...dest.stream.getAudioTracks()
]);
```

---

## Cleanup

Ensure all resources are properly released on stop or PIP window close.

```javascript
function cleanup() {
  // Stop animation frames
  cancelAnimationFrame(waveformAnimationFrame);

  // Close audio contexts
  audioContext?.close();
  waveformAudioContext?.close();

  // Stop all tracks
  micStream?.getTracks().forEach(t => t.stop());
  screenStream?.getTracks().forEach(t => t.stop());
  recordingStream?.getTracks().forEach(t => t.stop());

  // Close PIP window
  pipWindow?.close();
}
```

---

## Reference

Working prototype: `/Users/chrisrodemeyer/pip/index.html`

Key sections in prototype:
- PIP styles: lines 812-953
- `openDocumentPip()` function: lines 957-1131
- Audio waveform setup: lines 1304-1426
