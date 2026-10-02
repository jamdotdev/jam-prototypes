const assert = require('node:assert/strict');
const path = require('node:path');
const G = require(path.join(process.env.RECORDING_SOURCE_DIR || path.join(__dirname, '..'), 'recording-selection-geometry.js'));
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} != ${expected}`);
const center = rect => ({x: rect.x + rect.width / 2, y: rect.y + rect.height / 2});
let checks = 0;
function contained(rect, bounds, q = null) {
  for (const value of Object.values(rect)) assert.ok(Number.isFinite(value), 'Geometry is finite');
  assert.ok(rect.width >= 0 && rect.height >= 0, 'Dimensions never invert');
  assert.ok(rect.x >= bounds.x - 1e-7 && rect.y >= bounds.y - 1e-7, 'Top-left remains inside bounds');
  assert.ok(rect.x + rect.width <= bounds.x + bounds.width + 1e-7, 'Right remains inside bounds');
  assert.ok(rect.y + rect.height <= bounds.y + bounds.height + 1e-7, 'Bottom remains inside bounds');
  if (q && rect.height) near(rect.width / rect.height, q, 'Aspect ratio survives bounds and minimum clamping');
  checks++;
}

assert.equal(G.ratio({preset: 'custom', orientation: 'vertical'}), null);
assert.equal(G.label({preset: 'custom'}), 'Custom');
for (const [preset, q] of [['1:1', 1], ['4:3', 4 / 3], ['16:9', 16 / 9], ['16:10', 1.6]]) {
  assert.equal(G.ratio({preset, orientation: 'horizontal'}), q);
  assert.equal(G.ratio({preset, orientation: 'vertical'}), 1 / q);
  assert.equal(G.label({preset, orientation: 'vertical'}), preset.split(':').reverse().join(':'));
  const landscape = G.presets({preset, orientation: 'horizontal'}), portrait = G.presets({preset, orientation: 'vertical'});
  for (const [i, value] of landscape.entries()) {
    near(value.width / value.height, q, 'Preset dimensions match the ratio');
    assert.equal(portrait[i].width, value.height);
    assert.equal(portrait[i].height, value.width);
    assert.equal(value.label, `${value.width} × ${value.height}`);
  }
}
assert.deepEqual(G.presets({preset: 'custom', orientation: 'vertical'}), G.presets({preset: '16:9', orientation: 'horizontal'}), 'Custom uses landscape 16:9 preset sizes in both orientations');
assert.deepEqual(G.presets({preset: '4:3'})[0], {width: 640, height: 480, label: '640 × 480'}, 'The first 4:3 preset has mathematically correct dimensions');
assert.equal(G.presets({preset: '16:10'}).length, 8);

const bounds = {x: 0, y: 28, width: 1000, height: 672};
const original = {x: 200, y: 150, width: 400, height: 300};
const min = {width: 50, height: 50};
const free = G.size(original, {width: 550, height: 250}, bounds, min);
assert.deepEqual(free, {x: 125, y: 175, width: 550, height: 250});
const lockedWidth = G.size(original, {width: 480}, bounds, min, 16 / 9);
assert.deepEqual(lockedWidth, {x: 160, y: 165, width: 480, height: 270});
const lockedHeight = G.size(original, {height: 225}, bounds, min, 16 / 9, 'height');
assert.deepEqual(lockedHeight, {x: 200, y: 187.5, width: 400, height: 225});
assert.deepEqual(G.size(original, {width: NaN, height: Infinity}, bounds, min), original, 'Invalid input cannot corrupt capture geometry');
const fitted = G.fit({x: -20, y: 0, width: 2560, height: 1440}, bounds, min, 16 / 9);
assert.deepEqual(fitted, {x: 0, y: 137.5, width: 1000, height: 562.5});
const tiny = {x: 10, y: 20, width: 30, height: 25};
contained(G.fit(original, tiny, {width: 320, height: 220}, 16 / 9), tiny, 16 / 9);

const plainEast = G.resize(original, 'e', 50, 200, {bounds});
assert.deepEqual(plainEast, {x: 200, y: 150, width: 450, height: 300}, 'A free side resize changes one axis only');
const centerEast = G.resize(original, 'e', 50, 200, {bounds, altKey: true});
assert.deepEqual(centerEast, {x: 150, y: 150, width: 500, height: 300}, 'Option side resize moves the opposite side symmetrically');
const shiftEast = G.resize(original, 'e', 80, 0, {bounds, shiftKey: true});
assert.deepEqual(shiftEast, {x: 200, y: 120, width: 480, height: 360}, 'Shift custom preserves the current ratio and perpendicular center');
const bothEast = G.resize(original, 'e', 40, 0, {bounds, shiftKey: true, altKey: true});
assert.deepEqual(bothEast, {x: 160, y: 120, width: 480, height: 360}, 'Option+Shift resizes around the entire center');
const landscape = G.size(original, {width: 400}, bounds, min, 16 / 9);
assert.deepEqual(G.resize(landscape, 'se', 130, 40, {bounds, ratio: 16 / 9, shiftKey: true}), G.resize(landscape, 'se', 130, 40, {bounds, ratio: 16 / 9}), 'Shift never changes a preset lock');

const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const ratios = [null, 1, 4 / 3, 3 / 4, 16 / 9, 9 / 16, 1.6, .625];
const canvases = [bounds, {x: 12, y: 28, width: 632, height: 432}, {x: 0, y: 0, width: 300, height: 240}, tiny];
for (const b of canvases) for (const minimum of [min, {width: 320, height: 220}]) for (const q of ratios) {
  const baseline = G.fit(original, b, minimum, q);
  contained(baseline, b, q);
  for (const handle of handles) for (const shiftKey of [false, true]) for (const altKey of [false, true]) for (const [dx, dy] of [[0, 0], [5, -8], [-300, -250], [1200, 900], [-900, 500], [400, -700]]) {
    const r = G.resize(baseline, handle, dx, dy, {bounds: b, minimum, ratio: q, shiftKey, altKey});
    const locked = q || (shiftKey ? baseline.width / baseline.height : null);
    contained(r, b, locked);
    const gx = handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0;
    const gy = handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0;
    const oldCenter = center(baseline), newCenter = center(r);
    if (altKey || !gx) near(newCenter.x, oldCenter.x, 'Horizontal center stays anchored');
    else if (gx === 1) near(r.x, baseline.x, 'West edge stays anchored');
    else near(r.x + r.width, baseline.x + baseline.width, 'East edge stays anchored');
    if (altKey || !gy) near(newCenter.y, oldCenter.y, 'Vertical center stays anchored');
    else if (gy === 1) near(r.y, baseline.y, 'North edge stays anchored');
    else near(r.y + r.height, baseline.y + baseline.height, 'South edge stays anchored');
    if (!locked && !gx) near(r.width, baseline.width, 'Free vertical side preserves width');
    if (!locked && !gy) near(r.height, baseline.height, 'Free horizontal side preserves height');
  }
}

for (const b of canvases) for (const q of ratios) for (const shiftKey of [false, true]) for (const altKey of [false, true]) {
  for (const start of [{x: b.x, y: b.y}, {x: b.x + b.width / 2, y: b.y + b.height / 2}, {x: b.x + b.width, y: b.y + b.height}]) {
    for (const point of [start, {x: start.x + 150, y: start.y + 90}, {x: start.x - 900, y: start.y + 700}]) {
      contained(G.draw(start, point, {bounds: b, ratio: q, shiftKey, altKey}), b, q || (shiftKey ? 1 : null));
    }
  }
}

console.log(`PASS: ${checks} bounded geometry cases, exact ratio presets/orientation, centered dimensions, all eight handles, Shift, Option, combined modifiers, minimums, drawing, and small sidebar bounds.`);
