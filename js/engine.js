import { normalize } from './config.js';
import { createTimeline } from './timeline.js';
import { COMPONENTS } from './components/index.js';
import { buildStage } from './ui/stage.js';
import { showScreen } from './ui/screen.js';
import { formatClock } from './ui/labels.js';
import { safetyPoints, hasAcknowledged, rememberAcknowledged } from './ui/safety.js';
import { createPaceControl } from './ui/pace-control.js';
import { createCycleCounter } from './ui/cycle-counter.js';
import { createPerfOverlay } from './ui/perf-overlay.js';
import { createSessionLayout } from './ui/session-layout.js';
import { durationScaleFor, loadPace, savePace } from './pace.js';
import { initTapControl } from './controls/tap.js';
import { initVibration, canVibrate } from './controls/vibration.js';
import { createSettingsButton } from './ui/settings-panel.js';
import { initSound } from './controls/sound.js';
import { createSessionCues } from './controls/session-cues.js';
import { createKeepAwake } from './controls/keep-awake.js';
import { readSettings, onSettingsChange } from './settings.js';
import { initAppShell } from './app.js';
import { isDesktopApp } from './native.js';
import { saveSession, MIN_SESSION_MS } from './history.js';
import { lengthOptions, loadLength, saveLength, nextLength, applyLength, lengthLabel } from './session-length.js';
import { saveResume, readResume, clearResume } from './resume.js';
import { heartRateLink } from './heart-rate-return.js';
import { el } from './dom.js';

const MOTION_ONLY = new Set(['particles', 'ripple', 'hum']);

// Runs one technique. Returns { stop, advance, restart }.
export function start(rawConfig, { mount = document.body } = {}) {
  const cfg = normalize(rawConfig);
  initAppShell({ home: false });
  document.title = cfg.title;
  document.documentElement.style.setProperty('--hue', cfg.hue);

  const ui = buildStage(cfg, mount);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const names = reduceMotion ? cfg.components.filter(n => !MOTION_ONLY.has(n)) : cfg.components;
  // One set of components per field (two in the split layout).
  const fields = ui.sides.map(({ side, half, field }) => ({
    side,
    half,
    field,
    parts: names.map((name) => {
      const create = COMPONENTS[name];
      if (!create) throw new Error(`Unknown component "${name}"`);
      return create({ field, cfg });
    }),
  }));

  const cycles = createCycleCounter(ui.cycles, cfg);
  const layout = createSessionLayout({ stage: ui.stage, visual: ui.visual, cfg });
  const perf = createPerfOverlay();

  const holdButton = el('button', 'button button--primary', { type: 'button', hidden: true });
  ui.labels.root.append(holdButton);

  const storage = (() => {
    try { return window.localStorage; } catch { return null; }
  })();

  const sessionMs = cfg.sessionMinutes ? cfg.sessionMinutes * 60_000 : null;
  let timeline = createTimeline(cfg.sequence, { sessionMs });

  // Session length (#116): techniques that would otherwise run until you leave get a
  // chip under the cycle counter. Tapping it steps through the lengths while the
  // session runs; the choice is remembered for next time.
  const lengths = lengthOptions(cfg.lengths);
  let length = lengths ? loadLength(storage, cfg.id, lengths) : null;
  let lengthChip = null;
  let lengthText = '';
  if (lengths) {
    lengthChip = el('button', 'chip chip--link cycles__length', { type: 'button' });
    cycles.root.append(lengthChip);
    lengthChip.addEventListener('click', () => {
      length = nextLength(lengths, length);
      saveLength(storage, cfg.id, length);
      applyLength(timeline, length);
      cues?.sync(performance.now());
      showLength(lastSnap);
    });
  }
  function showLength(snap) {
    if (!lengthChip) return;
    const text = lengthLabel(length, snap);
    if (text === lengthText) return;
    lengthText = text;
    lengthChip.textContent = text;
    lengthChip.setAttribute('aria-label', `Session length: ${text}. Tap to change.`);
  }

  let paceControl = null;
  let currentBpm = null;
  const applyPace = (bpm, immediate) => {
    timeline.setDurationScale(durationScaleFor(cfg.pace, bpm), { immediate });
  };
  if (cfg.pace) {
    currentBpm = loadPace(storage, cfg.id, cfg.pace);
    applyPace(currentBpm, true);
    paceControl = createPaceControl(ui.controls, cfg.pace, currentBpm, (bpm) => {
      currentBpm = bpm;
      applyPace(bpm, false);
      savePace(storage, cfg.id, bpm);
      cues?.sync(performance.now());
    });
  }

  // Final minutes of a timed session: ease the pace down towards a resting rhythm.
  let windingDown = false;
  function windDown(snap) {
    const wd = cfg.windDown;
    if (!wd || !cfg.pace || snap.sessionMs == null || snap.finished) return;
    const span = wd.minutes * 60_000;
    const remaining = snap.sessionMs - snap.sessionElapsed;
    if (remaining > span) return;
    windingDown = true;
    const k = Math.min(1, 1 - remaining / span);
    const bpm = currentBpm + (wd.bpm - currentBpm) * k;
    timeline.setDurationScale(durationScaleFor(cfg.pace, bpm));
    paceControl.lock(bpm);
  }

  // In the Android app the phone plays vibration and hum (so they carry on with the
  // screen off); elsewhere the page does.
  const cues = createSessionCues({ cfg, getTimeline: () => timeline, onStoppedFromNotification: stoppedFromNotification });
  const sound = cfg.sound ? initSound(ui.actions, ui.notify, { ...cfg.sound, silent: !!cues }) : null;
  const vibration = !cues && cfg.vibration && canVibrate() ? initVibration(ui.notify) : null;
  ui.actions.append(createSettingsButton({ cfg }));
  const awake = createKeepAwake();
  // Keep screen on (Settings): follows the setting live while a session runs.
  const stopAwakeSetting = onSettingsChange((settings) => {
    if (!running) return;
    if (settings.keepAwake) awake.acquire();
    else awake.release();
  });

  // Session history: saved while running and again when the session ends.
  let session = null;
  let lastSnap = null;
  let endedSessionStart = null;   // for the summary's "Check heart rate" (#118)
  let variantLabel = cfg.variants ? cfg.variants[0].label : null;
  let chosenMinutes = cfg.sessionMinutes;

  function saveProgress() {
    if (!session || !lastSnap) return;
    const now = Date.now();
    // Time away between leaving and jumping back in (#117) doesn't count.
    const durationMs = now - session.startedAt - (session.awayMs ?? 0);
    if (!lastSnap.finished && durationMs < MIN_SESSION_MS) return;
    saveSession({
      id: session.id,
      page: location.pathname.split('/').pop() || 'index.html',
      techniqueId: cfg.id,
      title: cfg.title,
      hue: cfg.hue,
      shape: cfg.shape,
      layout: cfg.layout,
      startedAt: session.startedAt,
      endedAt: now,
      durationMs,
      completed: !!lastSnap.finished,
      rounds: Number.isFinite(lastSnap.rounds) && lastSnap.rounds > 1 ? lastSnap.rounds : null,
      round: lastSnap.round,
      records: lastSnap.records,
      bpm: cfg.pace ? currentBpm : null,
      variant: variantLabel,
      sessionMinutes: chosenMinutes,
      length: length?.key ?? null,
    });
  }

  const onHide = () => {
    if (running && document.visibilityState === 'hidden') saveProgress();
  };
  // Leaving a running session (back, Android back, a link) stays instant; Home then
  // offers one tap back into it (#117).
  const page = location.pathname.split('/').pop() || 'index.html';
  let cycleStart = { round: 0, elapsedMs: 0 };
  function noteResume() {
    if (!running || !session || !lastSnap || lastSnap.finished) return;
    const activeMs = Date.now() - session.startedAt - (session.awayMs ?? 0);
    if (activeMs < 10_000) return;
    saveResume({
      page, techniqueId: cfg.id, title: cfg.title, hue: cfg.hue, shape: cfg.shape,
      sessionId: session.id, startedAt: session.startedAt, awayMs: session.awayMs ?? 0, savedAt: Date.now(),
      round: cycleStart.round, elapsedMs: cycleStart.elapsedMs, records: lastSnap.records,
      cycles: lastSnap.round - 1, activeMs,
      length: length?.key ?? null, variant: variantLabel,
    });
  }
  const onPageHide = () => {
    if (running) { saveProgress(); noteResume(); }
    cues?.stop();
  };
  document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', onPageHide);

  let raf = 0;
  let running = false;
  let lastSerial = -1;
  let screen = null;

  const glowFor = (scale) => {
    const span = cfg.maxScale - cfg.minScale;
    const t = span ? (scale - cfg.minScale) / span : 1;
    return cfg.opacity.min + t * (cfg.opacity.max - cfg.opacity.min);
  };

  // In the split layout only the half named by the phase's side is active; the
  // other dims and shows no particles or effects. Both stay on the shared breath scale.
  const quiet = (snap) => ({
    ...snap,
    quiet: true,
    phase: { ...snap.phase, particles: null, ripple: false, hum: false, heat: false },
  });

  function render(snap) {
    for (const f of fields) {
      const active = f.side == null || snap.phase.side == null || snap.phase.side === 'both' || snap.phase.side === f.side;
      if (f.half) f.half.toggleAttribute('data-active', active);
      const view = active ? snap : quiet(snap);
      f.field.style.setProperty('--breath-scale', snap.scale.toFixed(4));
      f.field.style.setProperty('--breath-glow', glowFor(snap.scale).toFixed(4));
      for (const part of f.parts) part.update?.(view);
    }
    sound?.update(snap);
    layout.update(snap);
    cycles.update(snap);
    showLength(snap);
    // The length chip shows the time left, so the status line doesn't repeat it.
    ui.labels.update(lengths ? { ...snap, sessionMs: null } : snap);
    ui.setHint((windingDown && cfg.windDown.prompt) || snap.phase.prompt || cfg.hint);
    holdButton.hidden = !snap.openEnded || snap.finished;
    if (!holdButton.hidden && holdButton.textContent !== snap.phase.action) {
      holdButton.textContent = snap.phase.action;
    }
  }

  function frame(now) {
    const workStart = performance.now();
    const snap = timeline.tick(now);
    lastSnap = snap;
    // Where the cycle under way began, so jumping back in restarts it from its first breath.
    if (snap.round - 1 !== cycleStart.round) cycleStart = { round: snap.round - 1, elapsedMs: snap.sessionElapsed - snap.elapsed };
    windDown(snap);
    if (snap.serial !== lastSerial) {
      lastSerial = snap.serial;
      vibration?.buzz(snap.phase.vibrate);
      if (!snap.finished) cues?.sync(now);
    }
    render(snap);
    perf?.frame(performance.now() - workStart);
    if (snap.finished) {
      running = false;
      cues?.stop();
      awake.release();
      saveProgress();
      clearResume();
      endedSessionStart = session.startedAt;
      session = null;
      showSummary(snap);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  // resume: a record from Home's "Jump back in" card (#117), to carry on that session.
  function begin({ resume = null } = {}) {
    screen?.close();
    screen = null;
    cancelAnimationFrame(raf);
    if (cfg.pace) {
      windingDown = false;
      paceControl.unlock();
      applyPace(currentBpm, true);
    }
    if (length) applyLength(timeline, length);
    timeline.start(performance.now(), resume && { round: resume.round, elapsedMs: resume.elapsedMs, records: resume.records });
    cycleStart = resume ? { round: resume.round, elapsedMs: resume.elapsedMs } : { round: 0, elapsedMs: 0 };
    cycles.reset();
    lastSerial = -1;
    running = true;
    if (readSettings().keepAwake) awake.acquire();
    session = resume
      ? { id: resume.sessionId, startedAt: resume.startedAt, awayMs: resume.awayMs + Math.max(0, Date.now() - resume.savedAt) }
      : { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, startedAt: Date.now() };
    // Starting a session (or carrying one on) replaces any offer to jump back in.
    clearResume();
    lastSnap = null;
    cues?.start(performance.now());
    raf = requestAnimationFrame(frame);
  }

  // Stop on the session notification (Android app): the session ends where it is.
  function stoppedFromNotification() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
    awake.release();
    lastSnap = timeline.tick(performance.now());
    saveProgress();
    clearResume();
    endedSessionStart = session?.startedAt ?? Date.now();
    session = null;
    showSummary(lastSnap, { stopped: true });
  }

  function advance() {
    if (running) timeline.advance(performance.now());
  }

  // Shows the first frame, still, behind a screen.
  function preview() {
    const now = performance.now();
    timeline.start(now);
    render(timeline.tick(now));
  }

  function showSafety() {
    preview();
    screen = showScreen(mount, {
      eyebrow: cfg.title,
      title: 'Before you start',
      body: 'This technique changes your breathing a lot and can make you light-headed.',
      points: safetyPoints(cfg.safety),
      checkbox: { label: "Don't show this again for this technique" },
      actions: [
        {
          label: 'I understand, continue',
          primary: true,
          onClick: ({ checked }) => {
            if (checked) rememberAcknowledged(storage, cfg.id);
            screen.close();
            screen = null;
            afterSafety();
          },
        },
        { label: 'All techniques', href: './' },
      ],
    });
  }

  function afterSafety() {
    if (cfg.startScreen) showStart();
    else begin();
  }

  function showStart() {
    preview();
    const choices = cfg.sessionChoices;
    const sessionText = choices
      ? 'Choose how long to breathe.'
      : cfg.sessionMinutes ? `${cfg.sessionMinutes} minute session.` : '';
    const variants = cfg.variants;
    const actions = variants
      ? variants.map((variant, i) => ({
          label: variant.label,
          primary: i === 0,
          onClick: () => {
            variantLabel = variant.label;
            timeline = createTimeline(variant.sequence, { sessionMs });
            begin();
          },
        }))
      : choices
      ? choices.map(minutes => ({
          label: `${minutes} min`,
          primary: minutes === cfg.sessionMinutes,
          onClick: () => {
            chosenMinutes = minutes;
            timeline.setSessionMs(minutes * 60_000);
            begin();
          },
        }))
      : [{ label: 'Start', primary: true, onClick: begin }];
    screen = showScreen(mount, {
      eyebrow: cfg.rate || cfg.eyebrow,
      title: cfg.title,
      body: [cfg.hint, sessionText].filter(Boolean).join(' '),
      actions,
    });
  }

  function showSummary(snap, { stopped = false } = {}) {
    const multiRound = Number.isFinite(snap.rounds) && snap.rounds > 1;
    const list = snap.records.map(r => [
      multiRound ? `Round ${r.round} · ${r.label}` : r.label,
      formatClock(r.ms),
    ]);
    // Techniques with a length chip have no records of their own: show time and cycles.
    if (lengths && !list.length) {
      const done = snap.finished ? snap.round : snap.round - 1;
      list.push(['Time', formatClock(snap.sessionElapsed)], ['Cycles', String(done)]);
    }
    screen = showScreen(mount, {
      eyebrow: cfg.eyebrow,
      title: stopped ? 'Session stopped' : 'Session complete',
      body: cfg.summaryNote ?? (list.length ? '' : 'Take a moment before you get up.'),
      list,
      actions: [
        { label: 'Go again', primary: true, onClick: begin },
        ...(isDesktopApp ? [] : [{ label: 'Check heart rate', href: heartRateLink({ page, title: cfg.title, startedAt: endedSessionStart ?? Date.now() }) }]),
        { label: 'All techniques', href: './' },
      ],
    });
  }

  holdButton.addEventListener('click', advance);

  // Tap anywhere continues a hold. With Fluid shapes on, touch moves the liquid and
  // holds end with their button.
  const taps = initTapControl({ onTap: advance, paused: () => readSettings().fluid !== 'off' });

  const onKey = (e) => {
    if (e.target.closest?.('button, a')) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      advance();
    }
  };
  document.addEventListener('keydown', onKey);

  const resumeRecord = new URLSearchParams(location.search).has('resume') ? readResume() : null;
  if (resumeRecord?.page === page) {
    history.replaceState(null, '', location.pathname);
    const variant = cfg.variants?.find(v => v.label === resumeRecord.variant);
    if (variant) {
      variantLabel = variant.label;
      timeline = createTimeline(variant.sequence, { sessionMs });
    }
    length = lengths?.find(o => o.key === resumeRecord.length) ?? length;
    begin({ resume: resumeRecord });
  } else if (cfg.safety && !hasAcknowledged(storage, cfg.id)) showSafety();
  else afterSafety();

  return {
    advance,
    restart: begin,
    stop() {
      if (running) saveProgress();
      running = false;
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      cancelAnimationFrame(raf);
      taps.destroy();
      document.removeEventListener('keydown', onKey);
      vibration?.destroy();
      cues?.destroy();
      paceControl?.destroy();
      sound?.destroy();
      perf?.destroy();
      layout.destroy();
      stopAwakeSetting();
      awake.destroy();
      screen?.close();
      ui.stage.remove();
    },
  };
}
