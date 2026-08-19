import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const launcher = fs.readFileSync(path.join(root, 'dist/launcher.html'), 'utf8');
const server = fs.readFileSync(path.join(root, 'mame-server.js'), 'utf8');

function padKey(pad) { return `index:${Number.isFinite(Number(pad.index)) ? Number(pad.index) : 'na'}`; }
function joyIndexFor(profile, player) {
  const mapped = profile.joycodeMap?.[String(player)];
  const match = String(mapped || '').match(/^JOYCODE_(\d+)$/);
  if (match) return Number(match[1]);
  const selected = profile.padMap?.[String(player)];
  if (selected && Number.isFinite(Number(selected.index))) return Number(selected.index) + 1;
  return Math.max(1, Number(player) || 1);
}
function padForPlayer(profile, pads, player) {
  const selected = profile.padMap?.[String(player)];
  if (selected) {
    const exact = pads.find(p => padKey(p) === String(selected.key || ''));
    if (exact) return exact;
    const byIndex = pads.find(p => String(p.index) === String(selected.index));
    if (byIndex) return byIndex;
  }
  return pads[player - 1] || pads[0];
}
function sanitizeSeq(value) {
  const valid = /^(?:KEYCODE_[A-Z0-9_]+|JOYCODE_\d+_(?:BUTTON\d+|HAT\d(?:UP|DOWN|LEFT|RIGHT)|(?:R?[XYZ]AXIS|SLIDER\d)(?:_(?:UP|DOWN|LEFT|RIGHT|NEG|POS))?(?:_SWITCH)?))$/;
  const seen = new Set();
  return String(value || '').toUpperCase().split(/\s+OR\s+/).map(x => x.trim().split(/\s+/).filter(Boolean).join(' ')).filter(Boolean).filter(x => x.split(' ').every(t => valid.test(t))).filter(x => seen.has(x) ? false : (seen.add(x), true)).join(' OR ');
}

const identical = [
  { index: 0, id: 'DragonRise Inc. Generic USB Joystick', buttons: Array(12).fill({ pressed: false }) },
  { index: 1, id: 'DragonRise Inc. Generic USB Joystick', buttons: Array(12).fill({ pressed: false }) },
];
const profile = { padMap: {
  '1': { key: 'index:0', index: 0, id: identical[0].id },
  '2': { key: 'index:1', index: 1, id: identical[1].id },
}, joycodeMap: {} };
assert.notEqual(padKey(identical[0]), padKey(identical[1]));
assert.equal(padForPlayer(profile, identical, 1).index, 0);
assert.equal(padForPlayer(profile, identical, 2).index, 1);
assert.equal(joyIndexFor(profile, 1), 1);
assert.equal(joyIndexFor(profile, 2), 2);
assert.equal('JOYCODE_' + joyIndexFor(profile, 2) + '_BUTTON3', 'JOYCODE_2_BUTTON3');

const sharedProfile = { padMap: { '1': { key: 'index:0', index: 0 }, '2': { key: 'index:0', index: 0 } }, joycodeMap: {} };
assert.equal(padForPlayer(sharedProfile, [identical[0]], 2).index, 0);
assert.equal(joyIndexFor(sharedProfile, 2), 1);

assert.equal(sanitizeSeq(' OR JOYCODE_2_BUTTON3 OR JOYCODE_2_BUTTON3 '), 'JOYCODE_2_BUTTON3');
assert.equal(sanitizeSeq('JOYCODE_1_HATUP'), '');
assert.equal(sanitizeSeq('JOYCODE_1_HAT1UP'), 'JOYCODE_1_HAT1UP');

assert.match(launcher, /function padKey\(g\)/);
assert.match(launcher, /function joyIndexFor\(player\)/);
assert.match(launcher, /controlCaptureGeneration/);
assert.match(launcher, /function autoAssignPads\(\)/);
assert.match(launcher, /controlsProfile\.padMap/);
assert.match(server, /mapdevice device=/);
assert.match(server, /Object\.values\(profile\.deviceMap/);

console.log('PASS control-mapping: identical pads, shared encoder, P2_BUTTON3, HAT validation, generation guard and CFG mapdevice');
