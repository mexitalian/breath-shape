import { clampHz, hapticPattern, timingStats, BLOCK_MS } from './pulses.js';

// Entrainment lab (#143), web engines. Two ways to keep the beat in the page:
//   'clock'   the accurate way: every pulse's fade in and out is scheduled ahead on the
//             audio hardware's clock (Web Audio), so the beat is exact to the sample
//             however late the page's own timer wakes. Vibration is one 2-second
//             pattern handed over at each block, lined up with the audio clock.
//   'timers'  the naive way, for comparison: a JavaScript timer per beat switches the
//             tone and buzzes the phone. Shows the jitter browsers add.
// settings: { hz, sound, toneHz, volume, duty, haptic: 'off'|'waveform'|'ticks', strength }

const LOOKAHEAD_S = 0.25;   // schedule this far ahead on the audio clock
const WAKE_MS = 25;         // how often the scheduler wakes
const EDGE_S = 0.008;       // fade in/out per pulse, so the tone doesn't click
const KEEP = 120;           // timing samples kept for the stats

export function webEntrainmentAvailable() {
  return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext);
}

export function createWebEntrainment(engine = 'clock') {
  let ctx = null;
  let osc = null;
  let gate = null;
  let master = null;
  let timer = 0;
  let settings = null;
  let nextBeat = 0;        // clock: audio time of the next beat to schedule
  let nextBlock = 0;       // clock: audio time of the next vibration block
  let wakes = [];          // clock: when the scheduler woke (ms), to show it doesn't matter
  let beats = [];          // timers: when each beat really fired (ms)
  let startedAt = 0;

  const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  function buildAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    osc = ctx.createOscillator();
    osc.type = 'sine';
    gate = ctx.createGain();
    master = ctx.createGain();
    gate.gain.value = 0;
    osc.connect(gate).connect(master).connect(ctx.destination);
    osc.start();
  }

  function applyLevels() {
    if (!ctx) return;
    osc.frequency.setValueAtTime(settings.toneHz, ctx.currentTime);
    master.gain.setValueAtTime(settings.sound ? settings.volume : 0, ctx.currentTime);
  }

  // clock: one beat's fade in, hold and fade out, at audio time t.
  function schedulePulse(t, period) {
    const on = Math.max(EDGE_S * 2, period * settings.duty);
    const g = gate.gain;
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(1, t + EDGE_S);
    g.setValueAtTime(1, t + on - EDGE_S);
    g.linearRampToValueAtTime(0, t + on);
  }

  function vibrateBlock() {
    if (!canVibrate() || settings.haptic === 'off') return;
    const p = hapticPattern(settings.hz, { duty: settings.haptic === 'ticks' ? 0 : settings.duty, minOnMs: settings.haptic === 'ticks' ? 15 : 12 });
    // The web can't set strength; amplitudes are dropped.
    navigator.vibrate(p.durations);
  }

  function clockTick() {
    const now = performance.now();
    wakes.push(now);
    if (wakes.length > KEEP) wakes.shift();
    const period = 1 / settings.hz;
    while (nextBeat < ctx.currentTime + LOOKAHEAD_S) {
      schedulePulse(nextBeat, period);
      nextBeat += period;
    }
    // Vibration blocks: handed over as close as we can to their audio-clock start.
    if (ctx.currentTime >= nextBlock - WAKE_MS / 1000) {
      vibrateBlock();
      nextBlock += BLOCK_MS / 1000;
    }
  }

  function timersBeat() {
    const now = performance.now();
    beats.push(now);
    if (beats.length > KEEP) beats.shift();
    const on = (1000 / settings.hz) * settings.duty;
    if (ctx && settings.sound) {
      const t = ctx.currentTime;
      gate.gain.cancelScheduledValues(t);
      gate.gain.setValueAtTime(1, t);
      gate.gain.setValueAtTime(0, t + on / 1000);
    }
    if (canVibrate() && settings.haptic !== 'off') navigator.vibrate(Math.max(12, Math.round(settings.haptic === 'ticks' ? 15 : on)));
  }

  return {
    engine,
    start(next) {
      this.stop();
      settings = { ...next, hz: clampHz(next.hz) };
      buildAudio();
      applyLevels();
      startedAt = performance.now();
      wakes = [];
      beats = [];
      if (engine === 'clock') {
        nextBeat = ctx.currentTime + 0.1;
        nextBlock = nextBeat;
        clockTick();
        timer = setInterval(clockTick, WAKE_MS);
      } else {
        timer = setInterval(timersBeat, 1000 / settings.hz);
      }
    },
    stop() {
      clearInterval(timer);
      timer = 0;
      if (canVibrate()) navigator.vibrate(0);
      if (ctx) {
        try { osc.stop(); } catch { /* already stopped */ }
        ctx.close();
      }
      ctx = osc = gate = master = null;
    },
    get running() { return !!ctx; },
    // What the timing looks like right now, for the lab's readout.
    stats() {
      if (!ctx) return null;
      const out = { engine, seconds: (performance.now() - startedAt) / 1000 };
      out.outputLatencyMs = ((ctx.outputLatency || 0) + (ctx.baseLatency || 0)) * 1000;
      if (engine === 'clock') {
        const wake = timingStats(wakes, WAKE_MS);
        out.beatErrorMs = 0; // scheduled on the audio clock: exact to the sample
        out.schedulerLateMaxMs = wake.maxErrorMs;
      } else {
        const s = timingStats(beats, 1000 / settings.hz);
        out.beatErrorMs = s.avgErrorMs;
        out.beatErrorMaxMs = s.maxErrorMs;
        out.beats = s.count + 1;
      }
      return out;
    },
  };
}
