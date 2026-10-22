import { normalize } from './config.js';
import { createTimeline } from './timeline.js';
import { COMPONENTS } from './components/index.js';
import { buildStage } from './ui/stage.js';
import { showScreen } from './ui/screen.js';
import { formatClock } from './ui/labels.js';
import { safetyPoints, hasAcknowledged, rememberAcknowledged } from './ui/safety.js';
import { createPaceControl } from './ui/pace-control.js';
import { durationScaleFor, loadPace, savePace } from './pace.js';
import { initHueControl } from './controls/hue.js';
import { initVibration } from './controls/vibration.js';
import { initSound } from './controls/sound.js';
import { createKeepAwake } from './controls/keep-awake.js';
import { initAppShell } from './app.js';
import { saveSession, MIN_SESSION_MS } from './history.js';
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

  const holdButton = el('button', 'button button--primary', { type: 'button', hidden: true });
  ui.labels.root.append(holdButton);

  const storage = (() => {
    try { return window.localStorage; } catch { return null; }
  })();

  const sessionMs = cfg.sessionMinutes ? cfg.sessionMinutes * 60_000 : null;
  let timeline = createTimeline(cfg.sequence, { sessionMs });

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

  const sound = cfg.sound ? initSound(ui.actions, ui.notify, cfg.sound) : null;
  const vibration = cfg.vibration ? initVibration(ui.actions, ui.notify) : null;
  const awake = createKeepAwake();

  // Session history: saved while running and again when the session ends.
  let session = null;
  let lastSnap = null;
  let variantLabel = cfg.variants ? cfg.variants[0].label : null;
  let chosenMinutes = cfg.sessionMinutes;

  function saveProgress() {
    if (!session || !lastSnap) return;
    const now = Date.now();
    const durationMs = now - session.startedAt;
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
    });
  }

  const onHide = () => {
    if (running && document.visibilityState === 'hidden') saveProgress();
  };
  const onPageHide = () => {
    if (running) saveProgress();
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
    ui.labels.update(snap);
    ui.setHint((windingDown && cfg.windDown.prompt) || snap.phase.prompt || cfg.hint);
    holdButton.hidden = !snap.openEnded || snap.finished;
    if (!holdButton.hidden && holdButton.textContent !== snap.phase.action) {
      holdButton.textContent = snap.phase.action;
    }
  }

  function frame(now) {
    const snap = timeline.tick(now);
    lastSnap = snap;
    windDown(snap);
    if (snap.serial !== lastSerial) {
      lastSerial = snap.serial;
      vibration?.buzz(snap.phase.vibrate);
    }
    render(snap);
    if (snap.finished) {
      running = false;
      awake.release();
      saveProgress();
      session = null;
      showSummary(snap);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function begin() {
    screen?.close();
    screen = null;
    cancelAnimationFrame(raf);
    if (cfg.pace) {
      windingDown = false;
      paceControl.unlock();
      applyPace(currentBpm, true);
    }
    timeline.start(performance.now());
    lastSerial = -1;
    running = true;
    awake.acquire();
    session = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, startedAt: Date.now() };
    lastSnap = null;
    raf = requestAnimationFrame(frame);
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

  function showSummary(snap) {
    const multiRound = Number.isFinite(snap.rounds) && snap.rounds > 1;
    const list = snap.records.map(r => [
      multiRound ? `Round ${r.round} · ${r.label}` : r.label,
      formatClock(r.ms),
    ]);
    screen = showScreen(mount, {
      eyebrow: cfg.eyebrow,
      title: 'Session complete',
      body: cfg.summaryNote ?? (list.length ? '' : 'Take a moment before you get up.'),
      list,
      actions: [
        { label: 'Go again', primary: true, onClick: begin },
        { label: 'Check heart rate', href: 'heart-rate.html' },
        { label: 'All techniques', href: './' },
      ],
    });
  }

  holdButton.addEventListener('click', advance);

  const hue = initHueControl({ onTap: advance });

  const onKey = (e) => {
    if (e.target.closest?.('button, a')) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      advance();
    }
  };
  document.addEventListener('keydown', onKey);

  if (cfg.safety && !hasAcknowledged(storage, cfg.id)) showSafety();
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
      hue.destroy();
      document.removeEventListener('keydown', onKey);
      vibration?.destroy();
      paceControl?.destroy();
      sound?.destroy();
      awake.destroy();
      screen?.close();
      ui.stage.remove();
    },
  };
}
