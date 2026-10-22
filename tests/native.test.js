import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pulses, impactStyleFor, isNativeApp, nativePlugin, pluginFromBridge, waveform, vibrationUsage, setVibrationUsage } from '../js/native.js';

test('vibration patterns become timed pulses', () => {
  assert.deepEqual(pulses([120]), [{ at: 0, duration: 120 }]);
  assert.deepEqual(pulses([30, 60, 30]), [{ at: 0, duration: 30 }, { at: 90, duration: 30 }]);
  assert.deepEqual(pulses(200), [{ at: 0, duration: 200 }]);
  assert.equal(pulses(Array.from({ length: 160 }, (_, i) => (i % 2 ? 40 : 60))).length, 80);
});

test('pulse length maps to an iOS tap strength', () => {
  assert.equal(impactStyleFor(25), 'LIGHT');
  assert.equal(impactStyleFor(60), 'MEDIUM');
  assert.equal(impactStyleFor(120), 'HEAVY');
});

test('outside the app there is no native bridge', () => {
  assert.equal(isNativeApp, false);
  assert.equal(nativePlugin('Haptics'), null);
});

// Shaped like Capacitor's real injected bridge: headers + nativePromise, empty Plugins.
function realLikeBridge(calls) {
  return {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
    Plugins: {},
    PluginHeaders: [
      { name: 'Haptics', methods: [{ name: 'impact', rtype: 'promise' }, { name: 'vibrate', rtype: 'promise' }] },
      { name: 'KeepAwake', methods: [{ name: 'keepAwake', rtype: 'promise' }, { name: 'allowSleep', rtype: 'promise' }] },
    ],
    nativePromise: (plugin, method, options) => { calls.push([plugin, method, options]); return Promise.resolve(); },
  };
}

test('plugins are reached through the bridge even when Capacitor.Plugins is empty', async () => {
  const calls = [];
  const bridge = realLikeBridge(calls);
  const haptics = pluginFromBridge(bridge, 'Haptics');
  assert.ok(haptics, 'Haptics found from PluginHeaders');
  await haptics.vibrate({ duration: 120 });
  await pluginFromBridge(bridge, 'KeepAwake').keepAwake();
  assert.deepEqual(calls, [['Haptics', 'vibrate', { duration: 120 }], ['KeepAwake', 'keepAwake', {}]]);
});

test('unknown plugins and the website get null', () => {
  assert.equal(pluginFromBridge(realLikeBridge([]), 'Nope'), null);
  assert.equal(pluginFromBridge(undefined, 'Haptics'), null);
  assert.equal(pluginFromBridge({ isNativePlatform: () => false }, 'Haptics'), null);
});

test('web patterns become Android waveforms', () => {
  assert.deepEqual(waveform([120]), [0, 120]);
  assert.deepEqual(waveform([30, 60, 30]), [0, 30, 60, 30]);
  assert.deepEqual(waveform(200), [0, 200]);
});

test('the vibration usage defaults to alarm and only keeps known values', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.equal(vibrationUsage(storage), 'alarm');
  setVibrationUsage('touch', storage);
  assert.equal(vibrationUsage(storage), 'touch');
  setVibrationUsage('bogus', storage);
  assert.equal(vibrationUsage(storage), 'alarm');
});
