"""Fit supplied sounds to the bank system: retune into D major and match loudness by role.

For each sound it estimates the strongest pitches, picks the shift of up to two semitones that best lands
them on D major 9 chord tones (D F# A C# E), corrects any cents offset from A440, and resamples by that ratio. Like a tape speed change this
keeps the character but also changes length slightly (about 6% per semitone). Sounds without a clear pitch,
such as clicks and shutters, keep their pitch and only get loudness matched.

  python3 tools/tune-sounds.py assets/sounds/PositiveStart.m4a:state assets/sounds/CoolClick.m4a:touch
Add a shift in semitones to override the guess, e.g. GreetingPad.m4a:moment:+2 for a pad known to be in C.
Writes assets/sounds/Tuned<Name>.m4a next to each input and prints what it did. Roles: touch, state, moment.
Needs macOS afconvert for decoding and encoding.
"""
import math, os, struct, subprocess, sys, tempfile, wave

SR = 44100
TIERS = {'touch': 0.22, 'state': 0.5, 'moment': 0.55}  # matches tools/sound-bank.py
CHORD = {2: 1.0, 6: 1.0, 9: 1.0, 1: 0.8, 4: 0.8}         # D F# A C# E (pitch classes, C = 0)
SCALE = {7: 0.35, 11: 0.35}                              # G and B fit the key but not the chord


def decode(path):
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, 'x.wav')
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', f'LEI16@{SR}', '-c', '2', path, out], check=True)
        raw = open(out, 'rb').read(); i = 12; ch = 2; d = b''
        while i < len(raw) - 8:  # afconvert writes WAVE_FORMAT_EXTENSIBLE, which the wave module can't read
            kind, size = raw[i:i + 4], struct.unpack('<I', raw[i + 4:i + 8])[0]
            if kind == b'fmt ': ch = struct.unpack('<H', raw[i + 10:i + 12])[0]
            if kind == b'data': d = raw[i + 8:i + 8 + size]
            i += 8 + size + (size & 1)
        s = struct.unpack(f'<{len(d) // 2}h', d)
        return [[x / 32768 for x in s[c::ch]] for c in range(ch)] if ch == 2 else [[x / 32768 for x in s]] * 2


def goertzel(x, f):
    w = 2 * math.pi * f / SR; c = 2 * math.cos(w); s1 = s2 = 0.0
    for v in x: s1, s2 = v + c * s1 - s2, s1
    return s1 * s1 + s2 * s2 - c * s1 * s2


def chroma(mono):
    """Energy per pitch class (with cents offset of the strongest note), from the loudest frames."""
    size = 2048; hann = [0.5 - 0.5 * math.cos(2 * math.pi * i / size) for i in range(size)]
    frames = sorted(range(0, max(1, len(mono) - size), size // 2), key=lambda i: -sum(v * v for v in mono[i:i + size]))[:4]
    notes = range(45, 101)  # A2 to E7
    energy = {n: 0.0 for n in notes}
    for i in frames:
        x = [a * b for a, b in zip(mono[i:i + size], hann)]
        if len(x) < size: x += [0.0] * (size - len(x))
        for n in notes:
            f = 440 * 2 ** ((n - 69) / 12)
            energy[n] += goertzel(x, f) + 0.5 * goertzel(x, 2 * f) * (2 * f < SR / 2)
    top = max(energy, key=energy.get)
    # Fine-tune the strongest note to the nearest 10 cents, so a sound recorded off A440 lands in tune.
    x = [a * b for a, b in zip(mono[frames[0]:frames[0] + size], hann)]
    x += [0.0] * (size - len(x))
    cents = max(range(-50, 51, 10), key=lambda c: goertzel(x, 440 * 2 ** ((top - 69 + c / 100) / 12)))
    pcs = [0.0] * 12
    for n, e in energy.items(): pcs[n % 12] += e
    total = sum(pcs) or 1
    return [p / total for p in pcs], cents


def best_shift(pcs):
    fit = lambda k: sum(pcs[(pc - k) % 12] * w for pc, w in {**SCALE, **CHORD}.items())
    # Two semitones reaches a chord tone from any note; larger shifts change a sound's character too much.
    shifts = sorted(range(-2, 3), key=lambda k: (-round(fit(k), 2), abs(k)))
    return shifts[0], fit(shifts[0]), fit(0)


def resample(ch, ratio):
    n = int(len(ch) / ratio); out = []
    for i in range(n):
        p = i * ratio; j = int(p); t = p - j
        a = ch[j - 1] if j > 0 else ch[0]; b = ch[j]; c = ch[min(j + 1, len(ch) - 1)]; d = ch[min(j + 2, len(ch) - 1)]
        out.append(b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a))))  # Catmull-Rom
    return out


def loudness(buf):
    m = [abs(a) + abs(b) for a, b in zip(*buf)]; blk = int(0.05 * SR)
    blocks = sorted((sum(x * x for x in m[i:i + blk]) / blk for i in range(0, max(1, len(m) - blk + 1), blk // 2)), reverse=True)[:3]
    return math.sqrt(sum(blocks) / len(blocks)) / 2, max(m) / 2


def process(path, role, forced=None):
    buf = decode(path)
    mono = [(a + b) / 2 for a, b in zip(*buf)]
    pcs, cents = chroma(mono)
    clarity = max(pcs)  # a clear tone puts most energy in a few pitch classes; noise spreads it
    shift, after, before = best_shift(pcs)
    tonal = clarity >= 0.3 or forced is not None
    if forced is not None: shift = forced
    elif after < before + 0.1: shift = 0  # not worth moving; still corrected for cents below
    semis = (shift - cents / 100) if tonal else 0.0
    if abs(semis) > 0.04:
        ratio = 2 ** (semis / 12); buf = [resample(ch, ratio) for ch in buf]
    rms, peak = loudness(buf)
    g = TIERS[role] * 0.35 / rms
    if peak * g > 0.95: g = 0.95 / peak
    name = 'Tuned' + os.path.splitext(os.path.basename(path))[0]
    with tempfile.TemporaryDirectory() as tmp:
        tmpwav = os.path.join(tmp, name + '.wav')
        with wave.open(tmpwav, 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes(b''.join(struct.pack('<hh', int(max(-1, min(1, a * g)) * 32767), int(max(-1, min(1, b * g)) * 32767)) for a, b in zip(*buf)))
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '192000', tmpwav, os.path.join(os.path.dirname(path), name + '.m4a')], check=True)
    names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    strongest = sorted(range(12), key=lambda k: -pcs[k])[:3]
    print(f"{name}: {'+' if semis >= 0 else ''}{semis:.1f} semitones" if tonal and abs(semis) > 0.04
          else f"{name}: {'already in key' if tonal else 'no clear pitch'}, pitch kept",
          f"(strongest {'/'.join(names[k] for k in strongest)}), gain {20 * math.log10(g):+.1f} dB")


if __name__ == '__main__':
    for arg in sys.argv[1:]:
        path, role, *forced = arg.split(':')
        process(path, role, float(forced[0]) if forced else None)
