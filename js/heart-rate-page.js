import { fingerPresent, pulseWave, findBeats, estimateBpm, estimateHrv } from './heart-rate.js';
import { saveSession, HEART_RATE } from './history.js';

const SETTLE_S = 4;        // auto-exposure settles before samples count
const HR_S = 30;           // contact for a heart rate
const HRV_S = 60;          // contact for HRV (and the end of the reading)
const WINDOW_S = 12;       // seconds of signal used for each live estimate
const TRACE_S = 5;         // seconds of pulse wave drawn
const GIVE_UP_S = 90;      // no heart rate by now: stop
const SAMPLE_SIZE = 24;    // frames are averaged from a tiny copy

// Heart rate + HRV page: camera + flash, live pulse trace. A minute of contact gives
// both; if the signal isn't clean enough for HRV (or the finger lifts after the heart
// rate is ready) the result is the heart rate alone. Saved to history.
export function initHeartRate() {
  const video = document.querySelector('.hr__preview');
  const bpmEl = document.getElementById('bpm');
  const hrvEl = document.getElementById('hrv');
  const statusEl = document.getElementById('status');
  const progressEl = document.getElementById('progress');
  const startBtn = document.getElementById('start');
  const doneLink = document.getElementById('done');
  const trace = document.getElementById('trace');
  const sampler = document.createElement('canvas');
  sampler.width = sampler.height = SAMPLE_SIZE;
  const sampleCtx = sampler.getContext('2d', { willReadFrequently: true });

  let stream = null;
  let samples = [];        // { t, v }: the live window
  let all = [];            // { t, v }: every settled sample this attempt, for HRV
  let contactS = 0;        // finger-on time in this attempt
  let lastT = null;
  let startedAt = 0;
  let running = false;
  let readings = [];       // recent estimates, settled into the final result

  const status = (text) => { statusEl.textContent = text; };

  function averageColour() {
    sampleCtx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const data = sampleCtx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    const n = data.length / 4;
    return { r: r / n, g: g / n, b: b / n };
  }

  async function start() {
    startBtn.hidden = true;
    doneLink.hidden = true;
    bpmEl.textContent = '--';
    hrvEl.textContent = '--';
    status('Starting the camera…');
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } },
      });
    } catch (err) {
      fail(err?.name === 'NotAllowedError'
        ? 'Camera access was declined. Allow the camera for this app in your phone settings, then try again.'
        : `The camera couldn't start (${err?.message ?? err}).`);
      return;
    }
    video.srcObject = stream;
    await video.play();
    const track = stream.getVideoTracks()[0];
    const torch = track.getCapabilities?.().torch;
    if (torch) {
      try { await track.applyConstraints({ advanced: [{ torch: true }] }); } catch { /* reading still works in bright light */ }
    }
    samples = []; all = []; readings = []; contactS = 0; lastT = null;
    startedAt = Date.now();
    running = true;
    status(torch ? 'Cover the camera and flash with your fingertip.' : 'The flash isn’t available here. Cover the camera with your fingertip and hold the phone up to a bright lamp.');
    nextFrame();
  }

  function nextFrame() {
    if (!running) return;
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback((_, meta) => onFrame(meta.mediaTime));
    else requestAnimationFrame((now) => onFrame(now / 1000));
  }

  function onFrame(t) {
    if (!running) return;
    const colour = averageColour();
    const dt = lastT == null ? 0 : Math.min(t - lastT, 0.2);
    lastT = t;

    if (!fingerPresent(colour)) {
      // Lifted after the heart rate was ready: keep it, without HRV.
      if (contactS >= HR_S && readings.length >= 30) {
        finish({ lifted: true });
        return;
      }
      if (samples.length) status('Lost contact. Cover the camera and flash again, and keep still.');
      samples = []; all = []; readings = []; contactS = 0;
      bpmEl.textContent = '--';
      progressEl.style.width = '0%';
      drawTrace([]);
      nextFrame();
      return;
    }

    contactS += dt;
    // Red carries the pulse, but the flash often maxes it out; green still moves then.
    const sample = { t, v: colour.r + colour.g };
    samples.push(sample);
    if (contactS > SETTLE_S) all.push(sample);
    while (samples.length && samples[0].t < t - WINDOW_S) samples.shift();
    const wave = pulseWave(samples);
    drawTrace(wave.filter(s => s.t > t - TRACE_S));

    // Give the camera's auto-exposure a few seconds to settle before trusting it.
    if (contactS > SETTLE_S) {
      const bpm = estimateBpm(findBeats(wave.filter(s => s.t > t - WINDOW_S + 0.6)));
      if (bpm) { readings.push(bpm); if (readings.length > 90) readings.shift(); }
      bpmEl.textContent = bpm ?? '--';
      if (!bpm) status('Finding your pulse. Keep still and press lightly.');
      else if (contactS < HR_S) status('Keep still…');
      else status('Heart rate ready. Keep still a little longer for your HRV…');
    } else {
      status('Hold still…');
    }
    progressEl.style.width = `${Math.min(100, (contactS / HRV_S) * 100)}%`;

    if (contactS >= HRV_S && readings.length >= 30) {
      finish({ lifted: false });
      return;
    }
    if (contactS >= GIVE_UP_S) {
      fail('Couldn’t get a steady pulse. Try warming your hand, resting it on a table, and pressing a little lighter.');
      return;
    }
    nextFrame();
  }

  function stopCamera() {
    running = false;
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = null;
    video.srcObject = null;
  }

  function finish({ lifted }) {
    stopCamera();
    // Median of the last ~3 seconds of estimates.
    const recent = readings.slice(-90).sort((a, b) => a - b);
    const bpm = recent[recent.length >> 1];
    const hrv = lifted ? null : estimateHrv(findBeats(pulseWave(all)));
    bpmEl.textContent = bpm;
    hrvEl.textContent = hrv ?? '--';
    progressEl.style.width = '100%';
    if (hrv != null) {
      status(`Heart rate ${bpm} bpm, HRV ${hrv} ms. Saved to Your history.`);
    } else if (lifted) {
      status(`Heart rate ${bpm} bpm, saved. HRV needs a full minute: keep your finger on until the bar fills.`);
    } else {
      status(`Heart rate ${bpm} bpm, saved. The signal wasn't steady enough for HRV: rest your hand on a table, press lightly and breathe normally.`);
    }
    saveSession({
      id: `hr-${startedAt}`,
      kind: HEART_RATE,
      page: 'heart-rate.html',
      title: 'Heart rate',
      startedAt,
      durationMs: Date.now() - startedAt,
      heartRate: bpm,
      hrv,
    });
    startBtn.textContent = 'Measure again';
    startBtn.hidden = false;
    doneLink.hidden = false;
  }

  function fail(message) {
    stopCamera();
    status(message);
    startBtn.textContent = 'Try again';
    startBtn.hidden = false;
    doneLink.hidden = false;
  }

  function drawTrace(wave) {
    const ratio = window.devicePixelRatio || 1;
    const w = trace.clientWidth;
    const h = trace.clientHeight;
    if (trace.width !== Math.round(w * ratio)) { trace.width = Math.round(w * ratio); trace.height = Math.round(h * ratio); }
    const ctx = trace.getContext('2d');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (wave.length < 2) return;
    const t0 = wave.at(-1).t - TRACE_S;
    const peak = Math.max(...wave.map(s => Math.abs(s.v))) || 1;
    ctx.strokeStyle = getComputedStyle(trace).color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    wave.forEach((s, i) => {
      const x = ((s.t - t0) / TRACE_S) * w;
      const y = h / 2 - (s.v / peak) * (h / 2 - 4);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }

  startBtn.addEventListener('click', start);
  window.addEventListener('pagehide', stopCamera);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) fail('Paused while the app was in the background. Tap Try again.');
  });
}
