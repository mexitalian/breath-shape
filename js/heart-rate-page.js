import { fingerPresent, pulseWave, findBeats, estimateBpm } from './heart-rate.js';
import { saveSession, HEART_RATE } from './history.js';

const MEASURE_S = 30;      // seconds of steady finger contact for a result
const WINDOW_S = 12;       // seconds of signal used for each estimate
const TRACE_S = 5;         // seconds of pulse wave drawn
const GIVE_UP_S = 75;      // stop trying after this much finger contact
const SAMPLE_SIZE = 24;    // frames are averaged from a tiny copy

// Heart rate check page: camera + flash, live pulse trace, result saved to history.
export function initHeartRate() {
  const video = document.querySelector('.hr__preview');
  const bpmEl = document.getElementById('bpm');
  const statusEl = document.getElementById('status');
  const progressEl = document.getElementById('progress');
  const startBtn = document.getElementById('start');
  const doneLink = document.getElementById('done');
  const trace = document.getElementById('trace');
  const sampler = document.createElement('canvas');
  sampler.width = sampler.height = SAMPLE_SIZE;
  const sampleCtx = sampler.getContext('2d', { willReadFrequently: true });

  let stream = null;
  let samples = [];        // { t, v } while the finger is on the lens
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
    samples = []; readings = []; contactS = 0; lastT = null;
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
      if (samples.length) status('Lost contact. Cover the camera and flash again, and keep still.');
      samples = []; readings = []; contactS = 0;
      bpmEl.textContent = '--';
      progressEl.style.width = '0%';
      drawTrace([]);
      nextFrame();
      return;
    }

    contactS += dt;
    // Red carries the pulse, but the flash often maxes it out; green still moves then.
    samples.push({ t, v: colour.r + colour.g });
    while (samples.length && samples[0].t < t - WINDOW_S) samples.shift();
    const wave = pulseWave(samples);
    drawTrace(wave.filter(s => s.t > t - TRACE_S));

    // Give the camera's auto-exposure a few seconds to settle before trusting it.
    if (contactS > 4) {
      const bpm = estimateBpm(findBeats(wave.filter(s => s.t > t - WINDOW_S + 0.6)));
      if (bpm) { readings.push(bpm); if (readings.length > 90) readings.shift(); }
      bpmEl.textContent = bpm ?? '--';
      status(bpm ? 'Keep still…' : 'Finding your pulse. Keep still and press lightly.');
    } else {
      status('Hold still…');
    }
    progressEl.style.width = `${Math.min(100, (contactS / MEASURE_S) * 100)}%`;

    if (contactS >= MEASURE_S && readings.length >= 30) {
      finish();
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

  function finish() {
    stopCamera();
    // Median of the last ~3 seconds of estimates.
    const recent = readings.slice(-90).sort((a, b) => a - b);
    const bpm = recent[recent.length >> 1];
    bpmEl.textContent = bpm;
    progressEl.style.width = '100%';
    status(`Your heart rate is ${bpm} beats per minute. Saved to Your history.`);
    saveSession({
      id: `hr-${startedAt}`,
      kind: HEART_RATE,
      page: 'heart-rate.html',
      title: 'Heart rate',
      startedAt,
      durationMs: Date.now() - startedAt,
      heartRate: bpm,
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
