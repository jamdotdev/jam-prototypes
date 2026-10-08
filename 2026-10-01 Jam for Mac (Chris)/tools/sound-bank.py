"""Jam sound bank: one key (C major 9), one mallet timbre, one room, three loudness tiers.

Renders every Jam* sound as a WAV in the current folder. Convert for the prototype with:
  python3 tools/sound-bank.py && for f in Jam*.wav; do afconvert -f m4af -d aac -b 192000 "$f" "assets/sounds/${f%.wav}.m4a"; done
Pass names to render only some, e.g. `python3 tools/sound-bank.py JamStart JamStop`.
"""
import math, random, struct, wave, sys

SR = 44100
NOTE = {'C4': 261.63, 'E4': 329.63, 'G4': 392.0, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'G5': 783.99,
        'A5': 880.0, 'B5': 987.77, 'C6': 1046.5, 'D6': 1174.66, 'E6': 1318.51, 'G6': 1567.98,
        'C3': 130.81, 'G3': 196.0, 'B4': 493.88}


def mallet(buf, start, f, level, decay=0.45, bright=1.0, pan=0.0):
    """The bank's one voice: a soft glass mallet with a felt tick on the attack."""
    s0 = int(start * SR); n = len(buf[0])
    gl, gr = math.sqrt(0.5 * (1 - pan)), math.sqrt(0.5 * (1 + pan))
    rnd = random.Random(int(f * 10))
    lp = 0.0
    for i in range(s0, n):
        t = (i - s0) / SR
        if t > decay * 7: break
        a = min(1.0, t / 0.0025)
        v = (math.sin(2 * math.pi * f * t) * math.exp(-t / decay)
             + 0.22 * bright * math.sin(2 * math.pi * f * 2.0 * t) * math.exp(-t / (decay * 0.45))
             + 0.07 * bright * math.sin(2 * math.pi * f * 3.98 * t) * math.exp(-t / (decay * 0.2)))
        if t < 0.006:  # felt tick: lowpassed noise, a few ms
            lp = lp * 0.55 + (rnd.random() * 2 - 1) * 0.45
            v += lp * 0.35 * bright * (1 - t / 0.006)
        v *= a * level
        buf[0][i] += v * gl; buf[1][i] += v * gr


def pad(buf, notes, dur, attack, level, curve=1.8):
    """Sustained version of the same tone family, for the greeting tail."""
    n = len(buf[0]); rnd = random.Random(7)
    voices = [(f * 2 ** (d / 1200), rnd.random() * 6.28, (k % 2 * 2 - 1) * 0.35 + d / 30)
              for k, f in enumerate(notes) for d in (-6, 0, 6)]
    for f, ph, pan in voices:
        gl, gr = math.sqrt(0.5 * (1 - pan)), math.sqrt(0.5 * (1 + pan)); w = 2 * math.pi * f / SR; p = ph
        for i in range(int(dur * SR)):
            t = i / SR
            a = math.sin(min(1, t / attack) * math.pi / 2) ** 2
            x = max(0.0, (t - attack * 0.6) / (dur - attack * 0.6)); e = a * ((1 - x) ** curve if x < 1 else 0)
            p += w * (1 + 0.0012 * math.sin(2 * math.pi * 0.23 * t + ph))
            v = (math.sin(p) + 0.12 * math.sin(2 * p)) * e * level / len(voices)
            buf[0][i] += v * gl; buf[1][i] += v * gr


def room(buf, mix=0.2):
    """The shared room: every sound sits in the same small, soft space."""
    out = []
    for ch, delays in zip(buf, ([1117, 1188, 1277, 1356], [1139, 1211, 1300, 1379])):
        wet = [0.0] * len(ch)
        for dl in delays:
            line = [0.0] * dl; j = 0; lp = 0.0
            for i, x in enumerate(ch):
                y = line[j]; lp = lp * 0.35 + y * 0.65; line[j] = x + lp * 0.74; j = (j + 1) % dl; wet[i] += y / len(delays)
        out.append([a * (1 - mix) + b * mix for a, b in zip(ch, wet)])
    return out


# Loudness tiers by role: touch (switches), state (belt moments), moment (greeting, finished).
TIERS = {'touch': 0.2, 'state': 0.5, 'moment': 0.55}


def write(name, buf, tier):
    buf = room(buf)
    n = len(buf[0]); fade = int(0.08 * SR)
    for i in range(n - fade, n):
        g = (n - i) / fade; buf[0][i] *= g; buf[1][i] *= g
    # Normalize by loudness (RMS over the loud part), so roles stay consistent whatever their length.
    m = [abs(a) + abs(b) for a, b in zip(*buf)]; blk = int(0.1 * SR)
    # Loudness of the loudest 300ms, so a slow swell and a short tap are judged the same way.
    blocks = sorted((sum(x * x for x in m[i:i + blk]) / blk for i in range(0, len(m) - blk + 1, blk // 2)), reverse=True)[:6]
    rms = math.sqrt(sum(blocks) / len(blocks)) / 2
    g = TIERS[tier] * 0.35 / rms
    peak = max(m) / 2 * g
    if peak > 0.95: g *= 0.95 / peak
    with wave.open(f'{name}.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b''.join(struct.pack('<hh', int(max(-1, min(1, a * g)) * 32767), int(max(-1, min(1, b * g)) * 32767)) for a, b in zip(*buf)))


def blank(seconds): return [[0.0] * int(seconds * SR), [0.0] * int(seconds * SR)]


N = NOTE
SOUNDS = {
    # Greeting: the motif (C E G B D rising) over the home chord, fading slowly.
    'JamGreeting': ('moment', 6.5, lambda b: (pad(b, [N['C3'], N['G3'], N['E4'], N['B4'], N['D5']], 6.5, 1.0, 1.0),
                                              [mallet(b, 0.25 + k * 0.17, N[x], 0.32, 0.9, 0.7, -0.4 + k * 0.2)
                                               for k, x in enumerate(['C5', 'E5', 'G5', 'B5', 'D6'])])),
    # Switch on: one quiet high tap, the motif's top note.
    'JamSwitch': ('touch', 0.5, lambda b: mallet(b, 0.0, N['G5'], 1.0, 0.09, 0.8)),
    # Start: rising fifth, the motif's opening gesture.
    'JamStart': ('state', 1.0, lambda b: (mallet(b, 0.0, N['C5'], 0.8, 0.35), mallet(b, 0.09, N['G5'], 1.0, 0.45))),
    # Pause and resume: the same third, falling then rising.
    'JamPause': ('state', 0.9, lambda b: (mallet(b, 0.0, N['G5'], 0.9, 0.25), mallet(b, 0.08, N['E5'], 0.8, 0.35))),
    'JamResume': ('state', 0.9, lambda b: (mallet(b, 0.0, N['E5'], 0.8, 0.25), mallet(b, 0.08, N['G5'], 0.9, 0.35))),
    # Restart: the start gesture twice, quick, like a rewind into a new take.
    'JamRestart': ('state', 1.0, lambda b: (mallet(b, 0.0, N['G5'], 0.6, 0.12), mallet(b, 0.07, N['C5'], 0.7, 0.15),
                                            mallet(b, 0.16, N['C5'], 0.8, 0.3), mallet(b, 0.25, N['G5'], 1.0, 0.4))),
    # Final seconds: a muted, dry two-note tick. Same voice, tension from the unresolved second.
    'JamLimit': ('state', 0.8, lambda b: (mallet(b, 0.0, N['D6'], 0.75, 0.06, 0.5), mallet(b, 0.22, N['C6'], 0.65, 0.06, 0.5))),
    # Ends: the motif resolving up to the octave, with a short tail of the greeting's chord.
    'JamStop': ('moment', 2.4, lambda b: (pad(b, [N['C4'], N['G4'], N['E5']], 2.4, 0.15, 0.55, 2.4),
                                          mallet(b, 0.0, N['C5'], 0.7, 0.4), mallet(b, 0.08, N['E5'], 0.75, 0.45),
                                          mallet(b, 0.16, N['G5'], 0.8, 0.5), mallet(b, 0.26, N['C6'], 1.0, 0.8))),
}

if __name__ == '__main__':
    for name in sys.argv[1:] or SOUNDS:
        tier, dur, build = SOUNDS[name]
        b = blank(dur); build(b); write(name, b, tier); print(name)
