import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readSettings, saveSettings, DEFAULTS, SETTINGS_KEY } from '../js/settings.js';

function memoryStorage() {
  const store = new Map();
  return { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
}

test('settings start at system theme, particles on, vibration on', () => {
  assert.deepEqual(readSettings(memoryStorage()), DEFAULTS);
  assert.deepEqual(readSettings(null), DEFAULTS);
});

test('a change is kept and merged with the rest', () => {
  const storage = memoryStorage();
  saveSettings({ theme: 'light' }, storage);
  saveSettings({ vibration: false }, storage);
  assert.deepEqual(readSettings(storage), { theme: 'light', particles: 'on', vibration: false });
});

test('unknown or broken values fall back to the defaults', () => {
  const storage = memoryStorage();
  storage.setItem(SETTINGS_KEY, JSON.stringify({ theme: 'sepia', particles: 7, vibration: 'yes' }));
  assert.deepEqual(readSettings(storage), DEFAULTS);
  storage.setItem(SETTINGS_KEY, '{oops');
  assert.deepEqual(readSettings(storage), DEFAULTS);
});

test('the boot script reads the same key', () => {
  assert.ok(readFileSync(new URL('../js/settings-boot.js', import.meta.url), 'utf8').includes(`'${SETTINGS_KEY}'`));
});
