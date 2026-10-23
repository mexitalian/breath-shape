import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSettings, saveSettings, DEFAULTS, SETTINGS_KEY } from '../js/settings.js';

function memoryStorage() {
  const store = new Map();
  return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
}

test('settings start at system theme, particles, sound, screen-on and vibration on', () => {
  assert.deepEqual(readSettings(memoryStorage()), DEFAULTS);
  assert.deepEqual(readSettings(null), DEFAULTS);
});

test('a change is kept and merged with the rest', () => {
  const storage = memoryStorage();
  saveSettings({ theme: 'light' }, storage);
  saveSettings({ vibration: false }, storage);
  assert.deepEqual(readSettings(storage), { ...DEFAULTS, theme: 'light', vibration: false });
});

test('unknown or broken values fall back to the defaults', () => {
  const storage = memoryStorage();
  storage.setItem(SETTINGS_KEY, JSON.stringify({ theme: 'sepia', particles: 7, vibration: 'yes', sound: 1, volume: 'loud', keepAwake: null }));
  assert.deepEqual(readSettings(storage), DEFAULTS);
  storage.setItem(SETTINGS_KEY, '{oops');
  assert.deepEqual(readSettings(storage), DEFAULTS);
});

test('the boot script reads the same key', () => {
  assert.ok(readFileSync(new URL('../js/settings-boot.js', import.meta.url), 'utf8').includes(`'${SETTINGS_KEY}'`));
});

test('battery drain per hour waits for a real drop and ignores charging', async () => {
  const { drainPerHour } = await import('../js/ui/perf-overlay.js');
  assert.equal(drainPerHour({ startLevel: 0.80, level: 0.80, minutes: 5, charging: false }), null);
  assert.equal(drainPerHour({ startLevel: 0.80, level: 0.78, minutes: 10, charging: true }), null);
  assert.equal(Math.round(drainPerHour({ startLevel: 0.80, level: 0.78, minutes: 10, charging: false })), 12);
});

test('volume is kept between 0 and 1', () => {
  const storage = memoryStorage();
  saveSettings({ volume: 0.25, sound: false, keepAwake: false }, storage);
  assert.deepEqual(readSettings(storage), { ...DEFAULTS, volume: 0.25, sound: false, keepAwake: false });
  storage.setItem(SETTINGS_KEY, JSON.stringify({ volume: 3 }));
  assert.equal(readSettings(storage).volume, 1);
  storage.setItem(SETTINGS_KEY, JSON.stringify({ volume: -1 }));
  assert.equal(readSettings(storage).volume, 0);
});
