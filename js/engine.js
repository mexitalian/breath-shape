import { normalize } from './config.js';
import { createTimeline } from './timeline.js';
import { COMPONENTS } from './components/index.js';
import { buildStage } from './ui/stage.js';
import { showScreen } from './ui/screen.js';
import { formatClock } from './ui/labels.js';
import { safetyPoints, hasAcknowledged, rememberAcknowledged } from './ui/safety.js';
import { createPaceControl } from './ui/pace-control.js';
import { durationScaleFor, formatBpm, loadPace, savePace } from './pace.js';
import { initHueControl } from './controls/hue.js';
import { initVibration } from './controls/vibration.js';
import { initSound } from './controls/sound.js';
import { el } from './dom.js';

const MOTION_ONLY = new Set(['particles', 'ripple', 'hum']);

// Runs one technique. Returns { stop, advance, restart }.
export function start(rawConfig, { mount = document.body } = {}) {
  const cfg = normalize(rawConfig);
  document.title = cfg.title;
  document.documentElement.style.setProperty('--hue', cfg.hue);

  const ui = buildStage(cfg, mount);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const names = reduceMotion ? cfg.components.filter(n => !MOTION_ONLY.has(n)) : cfg.components;
  const parts = names.map((name) => {
    const create = COMPONENTS[name];
    if (!create) throw new Error(`Unknown component "${name}"`);
    return create({ field: ui.field, cfg });
  });

  const holdButton = el('button', 'button button--primary', { type: 'button', hidden: true });
  ui.labels.root.append(holdButton);

  const storage = (() => {
    try { return window.localStorage; } catch { return null; }
  })();

  const timeline = createTimeline(cfg.sequence, {
    sessionMs: cfg.sessionMinutes ? cfg.sessionMinutes * 60_000 : null,
  });

  let paceControl = null;
  if (cfg.pace) {
    const applyPace = (bpm, immediate) => {
      timeline.setDurationScale(durationScaleFor(cfg.pace, bpm), { immediate });
      ui.setRate(`${formatBpm(bpm)} breaths/min`);
    };
    const initial = loadPace(storage, cfg.id, cfg.pace);
    applyPace(initial, true);
    paceControl = createPaceControl(ui.controls, cfg.pace, initial, (bpm) => {
      applyPace(bpm, false);
      savePace(storage, cfg.id, bpm);
    });
  }

  const sound = cfg.sound ? initSound(ui.controls, cfg.sound) : null;
  const vibration = cfg.vibration ? initVibration(ui.controls) : null;

  let raf = 0;
  let running = false;
  let lastSerial = -1;
  let screen = null;

  const glowFor = (scale) => {
    const span = cfg.maxScale - cfg.minScale;
    const t = span ? (scale - cfg.minScale) / span : 1;
    return cfg.opacity.min + t * (cfg.opacity.max - cfg.opacity.min);
  };

  function render(snap) {
    ui.field.style.setProperty('--breath-scale', snap.scale.toFixed(4));
    ui.field.style.setProperty('--breath-glow', glowFor(snap.scale).toFixed(4));
    for (const part of parts) part.update?.(snap);
    sound?.update(snap);
    ui.labels.update(snap);
    ui.setHint(snap.phase.prompt ?? cfg.hint);
    holdButton.hidden = !snap.openEnded || snap.finished;
    if (!holdButton.hidden && holdButton.textContent !== snap.phase.action) {
      holdButton.textContent = snap.phase.action;
    }
  }

  function frame(now) {
    const snap = timeline.tick(now);
    if (snap.serial !== lastSerial) {
      lastSerial = snap.serial;
      vibration?.buzz(snap.phase.vibrate);
    }
    render(snap);
    if (snap.finished) {
      running = false;
      showSummary(snap);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  function begin() {
    screen?.close();
    screen = null;
    cancelAnimationFrame(raf);
    timeline.start(performance.now());
    lastSerial = -1;
    running = true;
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
    const session = cfg.sessionMinutes ? `${cfg.sessionMinutes} minute session.` : '';
    screen = showScreen(mount, {
      eyebrow: cfg.rate || cfg.eyebrow,
      title: cfg.title,
      body: [cfg.hint, session].filter(Boolean).join(' '),
      actions: [{ label: 'Start', primary: true, onClick: begin }],
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
      body: list.length ? '' : 'Take a moment before you get up.',
      list,
      actions: [
        { label: 'Go again', primary: true, onClick: begin },
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
      running = false;
      cancelAnimationFrame(raf);
      hue.destroy();
      document.removeEventListener('keydown', onKey);
      vibration?.destroy();
      paceControl?.destroy();
      sound?.destroy();
      screen?.close();
      ui.stage.remove();
    },
  };
}
