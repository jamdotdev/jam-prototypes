# PIP Recording Window

A floating Picture-in-Picture window for screen recording. Users can navigate freely while recording controls stay visible.

**Live prototype**: https://zesty-kitsune-a231bd.netlify.app

## How it works

Uses the [Document Picture-in-Picture API](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/) (Chrome 116+) to open a floating window with:
- Live video preview with rounded corners
- Recording timer badge (centered)
- Mute button (voice mode only)
- Stop button with audio waveform visualization

## Key technical bits

### Opening the PIP window

```javascript
const pipWindow = await documentPictureInPicture.requestWindow({
  width: 400,
  height: 300,
});

// Inject your styles and DOM
pipWindow.document.head.appendChild(styleElement);
pipWindow.document.body.appendChild(container);
```

### Video frame sizing

The frame container needs explicit sizing to maintain rounded corners regardless of aspect ratio. Can't just use `object-fit`.

```javascript
function resizeVideoFrame() {
  const aspectRatio = pipVideo.videoWidth / pipVideo.videoHeight;
  // Calculate frame dimensions based on available space
  // Then set explicit width/height on the frame container
}

pipVideo.addEventListener('loadedmetadata', resizeVideoFrame);
pipWindow.addEventListener('resize', resizeVideoFrame);
setInterval(resizeVideoFrame, 500); // Catch screen resize during recording
```

### Audio waveform visualization

The waveform animation runs in the **main window** and updates the PIP window's DOM via cross-window access. This architecture is necessary because MediaStream audio analysis doesn't work reliably when running inside the PIP document context.

#### Setup: AudioContext and AnalyserNode

```javascript
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256;
analyser.smoothingTimeConstant = 0.3;
analyser.minDecibels = -90;
analyser.maxDecibels = -10;

// Connect microphone stream to analyser
const source = audioContext.createMediaStreamSource(micStream);
source.connect(analyser);

const bufferLength = analyser.frequencyBinCount;
const frequencyData = new Uint8Array(bufferLength);
const timeDomainData = new Uint8Array(bufferLength);
```

#### Dual-source volume calculation

We combine time-domain and frequency data for more responsive audio visualization. Time-domain catches transient sounds better, while frequency data is more stable for sustained speech.

```javascript
// Get both data types
analyser.getByteTimeDomainData(timeDomainData);
analyser.getByteFrequencyData(frequencyData);

// Time domain: find peak amplitude (responsive to any sound)
let maxAmplitude = 0;
for (let i = 0; i < bufferLength; i++) {
  const amplitude = Math.abs(timeDomainData[i] - 128);
  if (amplitude > maxAmplitude) maxAmplitude = amplitude;
}

// Frequency domain: average of voice frequencies (85-1000Hz range)
let freqSum = 0;
const voiceRange = Math.min(bufferLength, 48);
for (let i = 2; i < voiceRange; i++) {
  freqSum += frequencyData[i];
}
const freqAvg = freqSum / (voiceRange - 2);

// Combine both for best responsiveness
const timeVolume = maxAmplitude / 128;  // normalize to 0-1
const freqVolume = freqAvg / 180;       // normalize to 0-1
const volume = Math.min(Math.max(timeVolume, freqVolume) * 1.5, 1);
```

#### Generating the SVG wave path

The waveform is rendered as a filled SVG path. We generate smooth curves using quadratic bezier control points, with vertical displacement based on audio volume.

```javascript
function updateWaveform() {
  const wavePath = pipWindow.document.getElementById("pipWavePath");
  if (!wavePath) return requestAnimationFrame(updateWaveform);

  // Map volume to wave height (higher volume = lower Y = taller wave)
  const minY = 85;  // bottom (silent)
  const maxY = 20;  // top (loud)
  const baseY = minY - (volume * (minY - maxY));

  // Generate wave points with time-based animation
  const time = Date.now() / 1000;
  const points = [];
  const numPoints = 12;

  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * 100;
    const waveOffset = Math.sin(time * 3 + i * 0.8) * (3 + volume * 15);
    const y = Math.max(20, Math.min(95, baseY + waveOffset));
    points.push({ x, y });
  }

  // Build SVG path with quadratic bezier curves
  let d = `M0,100 L0,${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX = (curr.x + next.x) / 2;
    d += ` Q${curr.x},${curr.y} ${cpX},${(curr.y + next.y) / 2}`;
  }
  d += ` L100,${points[points.length - 1].y} L100,100 Z`;

  wavePath.setAttribute("d", d);
  requestAnimationFrame(updateWaveform);
}
```

#### Cross-window DOM updates

The key insight is that we can access and modify DOM elements in the PIP window from the main window, since they share the same origin:

```javascript
// Main window reaching into PIP window's document
const wavePath = pipWindow.document.getElementById("pipWavePath");
wavePath.setAttribute("d", pathData);

// Also works for other elements
const timer = pipWindow.document.getElementById("pipToolbarTimer");
timer.textContent = "1:23";
```

### Combining mic + system audio

```javascript
const audioContext = new AudioContext();
const dest = audioContext.createMediaStreamDestination();

// Mix mic and system audio
micSource.connect(dest);
screenSource.connect(dest);

// Use combined stream for recording
const recordingStream = new MediaStream([
  ...screenStream.getVideoTracks(),
  ...dest.stream.getAudioTracks()
]);
```

## Files

- `index.html` - Complete prototype (start screen, PIP window, review screen)
- `HANDOFF-PIP-Window.md` - Detailed technical handoff doc
