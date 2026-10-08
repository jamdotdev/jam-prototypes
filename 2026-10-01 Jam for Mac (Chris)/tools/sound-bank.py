"""Jam sound banks: one key (D major 9), one room, three loudness tiers, two voices.

Each bank renders the same eight gestures with a different instrument:
  glass  a deep glass mallet (Glass*)
  pluck  a plucked string with a wooden body (Pluck*)

Renders WAVs into the current folder. Convert for the prototype with:
  python3 tools/sound-bank.py glass pluck && for f in Glass*.wav Pluck*.wav; do afconvert -f m4af -d aac -b 192000 "$f" "assets/sounds/${f%.wav}.m4a"; done
Pass `bank:Gesture` to render one sound, e.g. `python3 tools/sound-bank.py pluck:Start`.
The earlier, higher Jam* bank is in this file's git history.
"""
import math, random, struct, wave, sys

SR = 44100


def hz(name):
    """Note name to frequency, e.g. 'F#4'."""
    steps = {'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2}
    return 440.0 * 2 ** ((steps[name[:-1]] + 12 * (int(name[-1]) - 4)) / 12)


def blank(seconds): return [[0.0] * int(seconds * SR), [0.0] * int(seconds * SR)]


def add(buf, start, samples, pan=0.0):
    gl, gr = math.sqrt(0.5 * (1 - pan)), math.sqrt(0.5 * (1 + pan)); s0 = int(start * SR); n = len(buf[0])
    for k, v in enumerate(samples):
        if s0 + k >= n: break
        buf[0][s0 + k] += v * gl; buf[1][s0 + k] += v * gr


def glass(f, level, decay):
    """Deep glass mallet: a full fundamental, a warm octave, a faint glassy partial, and a soft felt thump."""
    rnd = random.Random(int(f)); out = []; lp = 0.0
    for i in range(int(min(decay * 6, 3) * SR)):
        t = i / SR
        a = min(1.0, t / 0.003)
        v = (math.sin(2 * math.pi * f * t) * math.exp(-t / decay)
             + 0.45 * math.sin(2 * math.pi * f * 2 * t + 0.4) * math.exp(-t / (decay * 0.5))
             + 0.12 * math.sin(2 * math.pi * f * 3 * t) * math.exp(-t / (decay * 0.3))
             + 0.05 * math.sin(2 * math.pi * f * 5.43 * t) * math.exp(-t / (decay * 0.15)))
        if t < 0.012:  # felt thump: heavily lowpassed noise
            lp = lp * 0.85 + (rnd.random() * 2 - 1) * 0.15
            v += lp * 1.6 * (1 - t / 0.012)
        out.append(math.tanh(v * a * 1.3) / 1.3 * level)  # gentle saturation thickens the body
    return out


def pluck(f, level, decay):
    """Plucked string (Karplus-Strong) through a small wooden body resonance."""
    rnd = random.Random(int(f * 3)); period = SR / f; size = int(period); frac = period - size
    line = [rnd.random() * 2 - 1 for _ in range(size + 2)]
    # Pluck nearer the bridge's middle for a round tone: smooth the initial noise.
    for _ in range(3): line = [(line[i - 1] + line[i] + line[(i + 1) % len(line)]) / 3 for i in range(len(line))]
    # Loss per period chosen so the string fades by ~60dB over `decay * 4` seconds.
    loss = 10 ** (-3 / (decay * 4 * f)); out = []; j = 0; prev = 0.0
    y1 = y2 = 0.0; w = 2 * math.pi * 190 / SR; r = 0.97  # body resonance near 190Hz
    for i in range(int(min(decay * 5, 3) * SR)):
        a = line[j]; b = line[(j + 1) % len(line)]
        v = (a * (1 - frac) + b * frac)
        new = loss * 0.5 * (v + prev); prev = v; line[j] = new; j = (j + 1) % len(line)
        body = new + 2 * r * math.cos(w) * y1 - r * r * y2; y2, y1 = y1, body
        out.append((v + body * 0.04) * level)
    return out


def pad(buf, notes, dur, attack, level, curve=1.8):
    """Sustained tone for the greeting's bed, warm and slow."""
    rnd = random.Random(7)
    voices = [(hz(n) * 2 ** (d / 1200), rnd.random() * 6.28, (k % 2 * 2 - 1) * 0.35 + d / 30)
              for k, n in enumerate(notes) for d in (-6, 0, 6)]
    for f, ph, pan in voices:
        w = 2 * math.pi * f / SR; p = ph; out = []
        for i in range(int(dur * SR)):
            t = i / SR
            a = math.sin(min(1, t / attack) * math.pi / 2) ** 2
            x = max(0.0, (t - attack * 0.6) / (dur - attack * 0.6)); e = a * ((1 - x) ** curve if x < 1 else 0)
            p += w * (1 + 0.0012 * math.sin(2 * math.pi * 0.23 * t + ph))
            out.append((math.sin(p) + 0.18 * math.sin(2 * p)) * e * level / len(voices))
        add(buf, 0, out, pan)


def room(buf, mix=0.16):
    """The shared room: every sound sits in the same small, soft space."""
    out = []
    for ch, delays in zip(buf, ([1117, 1188, 1277, 1356], [1139, 1211, 1300, 1379])):
        wet = [0.0] * len(ch)
        for dl in delays:
            line = [0.0] * dl; j = 0; lp = 0.0
            for i, x in enumerate(ch):
                y = line[j]; lp = lp * 0.4 + y * 0.6; line[j] = x + lp * 0.7; j = (j + 1) % dl; wet[i] += y / len(delays)
        out.append([a * (1 - mix) + b * mix for a, b in zip(ch, wet)])
    return out


# Loudness tiers by role: touch (switches), state (belt moments), moment (greeting).
TIERS = {'touch': 0.22, 'state': 0.5, 'moment': 0.55}


def write(name, buf, tier):
    buf = room(buf)
    n = len(buf[0]); fade = int(0.05 * SR)
    for i in range(n - fade, n):
        g = (n - i) / fade; buf[0][i] *= g; buf[1][i] *= g
    m = [abs(a) + abs(b) for a, b in zip(*buf)]; blk = int(0.05 * SR)
    # Loudness of the loudest 150ms, so a slow swell and a short tap are judged the same way.
    blocks = sorted((sum(x * x for x in m[i:i + blk]) / blk for i in range(0, len(m) - blk + 1, blk // 2)), reverse=True)[:3]
    g = TIERS[tier] * 0.35 / (math.sqrt(sum(blocks) / len(blocks)) / 2)
    peak = max(m) / 2 * g
    if peak > 0.95: g *= 0.95 / peak
    with wave.open(f'{name}.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<hh', int(max(-1, min(1, a * g)) * 32767), int(max(-1, min(1, b * g)) * 32767)) for a, b in zip(*buf)))


# D major 9 (D F# A C# E) for joy, voiced low for weight. The pluck bank sits an octave below the glass.
BANKS = {
    'glass': {'voice': glass, 'octave': 0, 'ring': 1.0},
    'pluck': {'voice': pluck, 'octave': -1, 'ring': 1.4},
}


def gestures(bank):
    voice, ring = bank['voice'], bank['ring']
    o = lambda n: n[:-1] + str(int(n[-1]) + bank['octave'])

    def note(b, at, n, level, decay, pan=0.0): add(b, at, voice(hz(o(n)), level, decay * ring), pan)
    return {
        # Greeting: the motif (D F# A C# E rising) over the home chord, fading slowly.
        'Greeting': ('moment', 6.5, lambda b: (pad(b, ['D3', 'A3', 'F#4', 'C#5', 'E5'], 6.5, 1.0, 0.8),
                                               [note(b, 0.25 + k * 0.16, x, 0.42, 0.9, -0.4 + k * 0.2)
                                                for k, x in enumerate(['D4', 'F#4', 'A4', 'C#5', 'E5'])])),
        # Switch on: one short, quiet note, the chord's fifth.
        'Switch': ('touch', 0.35, lambda b: note(b, 0.0, 'A4', 1.0, 0.07)),
        # Start: a quick rising fifth, D to A, punctate.
        'Start': ('state', 0.45, lambda b: (note(b, 0.0, 'D4', 0.8, 0.12), note(b, 0.055, 'A4', 1.0, 0.16))),
        # Pause and resume: the same third, falling then rising.
        'Pause': ('state', 0.4, lambda b: (note(b, 0.0, 'A4', 0.9, 0.1), note(b, 0.05, 'F#4', 0.8, 0.12))),
        'Resume': ('state', 0.45, lambda b: (note(b, 0.0, 'F#4', 0.8, 0.12), note(b, 0.055, 'A4', 0.9, 0.16))),
        # Restart: a quick rewind (A, D) into the start fifth.
        'Restart': ('state', 0.6, lambda b: (note(b, 0.0, 'A4', 0.6, 0.06), note(b, 0.06, 'D4', 0.7, 0.07),
                                             note(b, 0.14, 'D4', 0.8, 0.1), note(b, 0.195, 'A4', 1.0, 0.16))),
        # Final seconds: a dry two-note tick on the unresolved second (E, D).
        'Limit': ('state', 0.55, lambda b: (note(b, 0.0, 'E5', 0.8, 0.05), note(b, 0.22, 'D5', 0.7, 0.05))),
        # Ends: a fast roll up the triad landing on the octave, short and resolved.
        'Stop': ('state', 0.6, lambda b: (note(b, 0.0, 'D4', 0.6, 0.1), note(b, 0.04, 'F#4', 0.65, 0.1),
                                          note(b, 0.08, 'A4', 0.7, 0.12), note(b, 0.12, 'D5', 1.0, 0.2))),
    }


if __name__ == '__main__':
    for arg in sys.argv[1:] or BANKS:
        name, _, only = arg.partition(':')
        for gesture, (tier, dur, build) in gestures(BANKS[name]).items():
            if only and gesture != only: continue
            b = blank(dur); build(b); write(name.capitalize() + gesture, b, tier); print(name.capitalize() + gesture)
