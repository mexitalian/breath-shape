import { nativePlugin, platform, vibrationUsage, rampCurve } from '../native.js';
import { readSettings, onSettingsChange } from '../settings.js';
import { cuePlan } from '../cues.js';

const STATUS_MS = 2000;

// Android app: a session's vibration and hum are played by the app's BreathSession
// service, so they carry on with the phone locked or the screen off (Android pauses
// the page then). The page sends the phases ahead whenever they change; the service
// shows a notification with a Stop button while it runs.
// Returns null where there's no such service (website, iPhone, Mac).
export function createSessionCues({ cfg, getTimeline, onStoppedFromNotification }) {
  const service = platform === 'android' ? nativePlugin('BreathSession') : null;
  if (!service) return null;
  let active = false;
  let statusTimer = 0;

  function plan(now) {
    const settings = readSettings();
    return cuePlan({
      title: cfg.title,
      forecast: getTimeline().forecast(now),
      vibration: cfg.vibration && settings.vibration,
      style: settings.vibrationStyle,
      curve: rampCurve(),
      usage: vibrationUsage(),
      sound: cfg.sound && settings.sound ? { tone: cfg.sound.tone ?? 130, volume: settings.volume } : null,
    });
  }

  const wanted = (p) => p.vibration || p.sound;
  const quietly = (promise) => Promise.resolve(promise).catch(() => {});

  // Stop on the notification: the page hears about it on its next check.
  async function checkStatus() {
    if (!active) return;
    let status;
    try { status = await service.status(); } catch { return; }
    if (active && status?.stoppedByUser) {
      active = false;
      clearInterval(statusTimer);
      onStoppedFromNotification();
    }
  }

  function send(method, now) {
    const p = plan(now);
    if (!wanted(p)) {
      quietly(service.stop());
      return;
    }
    quietly(service[method](p));
  }

  const stopListening = onSettingsChange(() => {
    if (active) send('update', performance.now());
  });

  function stop() {
    if (!active) return;
    active = false;
    clearInterval(statusTimer);
    quietly(service.stop());
  }

  return {
    // A new session (or Go again): the service starts over.
    start(now) {
      active = true;
      clearInterval(statusTimer);
      statusTimer = setInterval(checkStatus, STATUS_MS);
      send('start', now);
    },
    // The phases ahead changed (new phase, a hold ended, pace changed).
    sync(now) {
      if (active) send('update', now);
    },
    stop,
    destroy() {
      stop();
      stopListening();
    },
  };
}
