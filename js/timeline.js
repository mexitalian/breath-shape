import { easing } from './easing.js';

// Open-ended holds have no duration, so the shape settles into the hold over this long.
const SETTLE_MS = 1500;

// Pure phase clock. All times are milliseconds on the caller's clock (performance.now()).
// sequence: { rounds, initialScale, steps: [{ repeat, counter, phases: [phase] }] }
export function createTimeline(sequence, { sessionMs = null } = {}) {
  const { steps, rounds } = sequence;
  let s = null;
  // Multiplier on every timed phase (adjustable pace). Changes wait for the next breath.
  let durScale = 1;
  let pendingScale = null;

  function phaseOf(state) {
    return steps[state.step].phases[state.phase];
  }

  const durMsOf = (ph) => (ph.dur == null ? null : ph.dur * 1000 * durScale);

  function applyPendingScale() {
    if (pendingScale == null) return;
    durScale = pendingScale;
    pendingScale = null;
  }

  function setDurationScale(k, { immediate = false } = {}) {
    if (!(k > 0)) throw new Error('Duration scale must be > 0');
    if (immediate || !s) {
      durScale = k;
      pendingScale = null;
    } else {
      pendingScale = k;
    }
  }

  function start(now) {
    applyPendingScale();
    s = {
      round: 0, step: 0, rep: 0, phase: 0,
      phaseStart: now,
      startedAt: now,
      fromScale: sequence.initialScale,
      serial: 0,
      finished: false,
      finishedAt: null,
      records: [],
    };
  }

  // Move to the next phase at time t. Returns false once the sequence is finished.
  function advanceAt(t) {
    const ph = phaseOf(s);
    if (ph.record) {
      s.records.push({ label: ph.record, round: s.round + 1, ms: t - s.phaseStart });
    }

    let { round, step, rep, phase } = s;
    phase++;
    if (phase >= steps[step].phases.length) {
      phase = 0;
      applyPendingScale();
      if (sessionMs != null && t - s.startedAt >= sessionMs) return finish(t, ph);
      rep++;
      if (rep >= steps[step].repeat) {
        rep = 0;
        step++;
        if (step >= steps.length) {
          step = 0;
          round++;
          if (round >= rounds) return finish(t, ph);
        }
      }
    }

    Object.assign(s, { round, step, rep, phase, phaseStart: t, fromScale: ph.scale, serial: s.serial + 1 });
    return true;
  }

  function finish(t, ph) {
    s.finished = true;
    s.finishedAt = t;
    s.fromScale = ph.scale;
    s.phaseStart = t;
    return false;
  }

  function tick(now) {
    if (!s) throw new Error('Timeline not started');
    while (!s.finished) {
      const durMs = durMsOf(phaseOf(s));
      if (durMs == null) break;
      const end = s.phaseStart + durMs;
      if (now < end) break;
      advanceAt(end);
    }
    return snapshot(now);
  }

  // Ends an open-ended hold (tap to continue). Ignored for timed phases.
  function advance(now) {
    if (!s || s.finished || phaseOf(s).dur != null) return false;
    advanceAt(now);
    return true;
  }

  function snapshot(now) {
    const ph = phaseOf(s);
    const step = steps[s.step];
    const t = s.finished ? s.finishedAt : now;
    const elapsed = Math.max(0, t - s.phaseStart);
    const durMs = durMsOf(ph);
    const progress = s.finished ? 1 : durMs == null ? null : Math.min(1, elapsed / durMs);
    const scaleProgress = progress ?? Math.min(1, elapsed / SETTLE_MS);
    const toScale = ph.scale;
    const scale = s.finished
      ? s.fromScale
      : s.fromScale + (toScale - s.fromScale) * easing(ph.easing)(scaleProgress);

    return {
      phase: ph,
      phaseIndex: s.phase,
      openEnded: durMs == null,
      elapsed,
      remaining: durMs == null ? null : Math.max(0, durMs - elapsed),
      progress,
      scaleProgress,
      fromScale: s.fromScale,
      toScale,
      scale,
      round: s.round + 1,
      rounds,
      rep: s.rep + 1,
      repeat: step.repeat,
      counter: step.counter,
      serial: s.serial,
      sessionElapsed: t - s.startedAt,
      sessionMs,
      finished: s.finished,
      records: s.records.slice(),
    };
  }

  // Session length can be chosen after the timeline is built (e.g. on the start screen).
  function setSessionMs(ms) {
    sessionMs = ms;
  }

  return { start, tick, advance, setDurationScale, setSessionMs };
}
