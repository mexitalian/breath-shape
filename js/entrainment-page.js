import { initAppShell } from './app.js';
import { isNativeApp, nativePlugin, vibrationUsage } from './native.js';
import { el } from './dom.js';
import { PRESETS, clampHz, bandFor } from './entrainment/pulses.js';
import { createWebEntrainment, webEntrainmentAvailable } from './entrainment/web.js';

// Entrainment lab (#143): try isochronic sound and vibration beats, and compare how
// steady the native engine (Android app), the web audio clock and plain web timers are.

initAppShell({ home: false });

const KEY = 'breathing:entrainment-lab';
const native = nativePlugin('BreathEntrainment');
const DEFAULTS = { hz: 6, sound: true, toneHz: 220, volume: 0.5, duty: 0.5, haptic: 'waveform', strength: 1, engine: native ? 'native' : 'clock' };

let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { /* defaults */ }
if (settings.engine === 'native' && !native) settings.engine = 'clock';
settings.hz = clampHz(settings.hz);
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* best-effort */ } };

const $ = (id) => document.getElementById(id);
let running = null;   // { engine, web? }
let statsTimer = 0;

// A row of chips; one pressed.
function chips(container, options, current, onPick) {
  const buttons = options.map(([value, label, disabled]) => {
    const b = el('button', 'chip chip--link', { type: 'button', textContent: label });
    b.setAttribute('aria-pressed', String(value === current));
    b.disabled = !!disabled;
    b.addEventListener('click', () => {
      for (const x of buttons) x.setAttribute('aria-pressed', String(x === b));
      onPick(value);
    });
    return b;
  });
  container.replaceChildren(...buttons);
  return buttons;
}

function slider(id, key, format) {
  const input = $(id);
  const value = $(`${id}-value`);
  input.value = String(settings[key]);
  const show = () => { value.textContent = format(Number(input.value)); };
  input.addEventListener('input', () => {
    settings[key] = Number(input.value);
    show();
    save();
    restartIfRunning();
  });
  show();
  return { set(v) { input.value = String(v); show(); } };
}

const hzLabel = (hz) => `${hz.toFixed(1).replace(/\.0$/, '')} Hz · ${bandFor(hz)}`;
const hz = slider('hz', 'hz', hzLabel);
slider('tone', 'toneHz', v => `${v} Hz`);
slider('volume', 'volume', v => `${Math.round(v * 100)}%`);
slider('duty', 'duty', v => `${Math.round(v * 100)}%`);
slider('strength', 'strength', v => `${Math.round(v * 100)}%`);

let presetButtons = [];
const markPreset = () => { presetButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(PRESETS[i].hz === settings.hz))); };
presetButtons = chips($('presets'), PRESETS.map(p => [p.hz, `${p.label} ${p.hz}`]), settings.hz, (v) => {
  settings.hz = v;
  hz.set(v);
  save();
  restartIfRunning();
});
$('hz').addEventListener('input', markPreset);

chips($('sound'), [[true, 'On'], [false, 'Off']], settings.sound, (v) => { settings.sound = v; save(); restartIfRunning(); });
chips($('haptic'), [['off', 'Off'], ['waveform', 'Waveform'], ['ticks', 'Ticks']], settings.haptic, (v) => { settings.haptic = v; save(); restartIfRunning(); });

const ENGINE_NOTES = {
  native: 'Native: the app makes the sound sample by sample, so the beat is exact to the audio clock, and hands the phone one looping vibration pattern (or composes its click effects 2 seconds at a time). No timer per beat.',
  clock: 'Web, audio clock: Web Audio schedules each pulse ahead on the audio hardware\'s clock, exact however late the page wakes. Vibration is one 2-second pattern per block. Strength can\'t be set from the web.',
  timers: 'Web, timers: a JavaScript timer per beat switches the tone and buzzes. The naive way, here to show the jitter.',
};
chips($('engine'), [['native', 'Native', !native], ['clock', 'Web · audio clock', !webEntrainmentAvailable()], ['timers', 'Web · timers', !webEntrainmentAvailable()]], settings.engine, (v) => {
  settings.engine = v;
  $('engine-note').textContent = ENGINE_NOTES[v];
  save();
  restartIfRunning();
});
$('engine-note').textContent = ENGINE_NOTES[settings.engine] + (native ? '' : ' (Native needs the Android app.)');

const fmt = (v, d = 1) => (v == null || Number.isNaN(v) ? '–' : Number(v).toFixed(d));

async function start() {
  await stop();
  const options = { ...settings, usage: native ? vibrationUsage() : undefined };
  if (settings.engine === 'native' && native) {
    await native.start(options);
    running = { engine: 'native' };
  } else {
    const web = createWebEntrainment(settings.engine === 'timers' ? 'timers' : 'clock');
    web.start(options);
    running = { engine: settings.engine, web };
  }
  $('start').textContent = 'Stop';
  statsTimer = setInterval(showStats, 500);
  showStats();
}

async function stop() {
  clearInterval(statsTimer);
  statsTimer = 0;
  if (!running) return;
  if (running.web) running.web.stop();
  else await native?.stop();
  running = null;
  $('start').textContent = 'Start';
  $('stats').textContent = 'Not running.';
}

let restartTimer = 0;
function restartIfRunning() {
  if (!running) return;
  clearTimeout(restartTimer);
  restartTimer = setTimeout(start, 250);
}

async function showStats() {
  if (!running) return;
  const lines = [`Engine: ${running.engine} · ${hzLabel(settings.hz)} · beat every ${fmt(1000 / settings.hz)} ms`];
  if (running.web) {
    const s = running.web.stats();
    if (!s) return;
    lines.push(`Running ${fmt(s.seconds, 0)} s`, `Sound reaches you ${fmt(s.outputLatencyMs)} ms after it's scheduled`);
    if (s.engine === 'clock') {
      lines.push('Beat error: 0 ms (scheduled on the audio clock)', `Page timer woke up to ${fmt(s.schedulerLateMaxMs)} ms late (doesn't affect the beat)`);
    } else {
      lines.push(`Beats: ${s.beats ?? 0}`, `Beat error: average ${fmt(s.beatErrorMs)} ms, worst ${fmt(s.beatErrorMaxMs)} ms`);
    }
    if (settings.haptic !== 'off') lines.push(`Vibration: ${'vibrate' in navigator ? 'browser pattern' : 'not available in this browser'}`);
  } else {
    try {
      const s = await native.stats();
      lines.push(
        `Sound: ${settings.sound ? `${fmt(s.latencyMs)} ms buffered ahead · audio clock drift ${fmt(s.driftPpm, 1)} ppm` : 'off'}`,
        'Beat error: 0 ms (exact to the sample)',
      );
      if (settings.haptic !== 'off') {
        lines.push(`Vibration: ${s.haptic}${s.haptic === 'ticks' && !s.ticksSupported ? ' (not supported here: short waveform pulses instead)' : ''}`);
        if (s.hapticStartOffsetMs != null) lines.push(`Vibration started ${fmt(s.hapticStartOffsetMs, 0)} ms after its beat${settings.sound ? ' on the sound' : ''}`);
        if (s.blocks) lines.push(`Click blocks: ${s.blocks}, handed over ${fmt(s.blockLateAvgMs)} ms late on average, worst ${fmt(s.blockLateMaxMs)} ms`);
        else if (s.haptic === 'waveform') lines.push('Looping pattern: timed by the phone itself, no app timer');
      }
    } catch (err) {
      lines.push(`Stats failed: ${err?.message ?? err}`);
    }
  }
  $('stats').textContent = lines.join('\n');
}

$('start').addEventListener('click', () => (running ? stop() : start()));
window.addEventListener('pagehide', () => { stop(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') stop(); });

// The motor.
if (native) {
  native.info().then((m) => {
    $('motor').textContent = [
      `Android SDK ${m.sdk}`,
      `Vibration motor: ${m.hasVibrator ? 'yes' : 'no'}`,
      `Strength control: ${m.amplitudeControl ? 'yes' : 'no'}`,
      `Natural (resonant) frequency: ${m.resonantHz != null ? `${fmt(m.resonantHz, 0)} Hz` : 'not reported'}`,
      `Q factor: ${m.qFactor != null ? fmt(m.qFactor, 1) : 'not reported'}`,
      `Click effects (Ticks): ${m.ticks ? 'supported' : 'not supported'}`,
      m.primitiveMs ? `Click ${m.primitiveMs.click} ms · tick ${m.primitiveMs.tick} ms · low tick ${m.primitiveMs.lowTick} ms` : '',
    ].filter(Boolean).join('\n');
  }, (err) => { $('motor').textContent = `Couldn't read the motor: ${err?.message ?? err}`; });
} else {
  $('motor').textContent = isNativeApp
    ? 'The app has no entrainment engine yet (update the app).'
    : `Website: ${'vibrate' in navigator ? 'the browser can vibrate, without strength control' : 'this browser can\'t vibrate'}. Open the Android app to see the motor's details and use the Native engine.`;
}

