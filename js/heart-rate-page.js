import { fingerPresent, pulseWave, findBeats, estimateBpm, estimateHrv } from './heart-rate.js';
import { saveSession, HEART_RATE } from './history.js';
import { createMembrane } from './fluid/membrane.js';

const SETTLE_S = 4;        // auto-exposure settles before samples count
const HR_S = 30;           // contact for a heart rate
const HRV_S = 60;          // contact for HRV (and the end of the reading)
const WINDOW_S = 12;       // seconds of signal used for each live estimate
const TRACE_S = 5;         // seconds of pulse wave drawn
const GIVE_UP_S = 90;      // no heart rate by now: stop
const SAMPLE_SIZE = 24;    // frames are averaged from a tiny copy
const IDLE_SCALE = 0.8;    // the membrane's size before and between readings
const CONTACT_SCALE = [0.72, 0.94]; // and as a reading fills, from first contact to done

// Heart rate + HRV page: camera + flash, live pulse trace. A minute of contact gives
// both; if the signal isn't clean enough for HRV (or the finger lifts after the heart
// rate is ready) the result is the heart rate alone. Saved to history.
// Tap the circle to start (and to stop, or measure again). A Membrane fluid (#103)
// fills the circle: it idles between readings, grows as a reading fills, swells on
// every beat it finds and ripples unevenly while the signal isn't clear.
export function initHeartRate() {
  const video = document.querySelector('.hr__preview');
  const dial = document.getElementById('dial');
  const hint = document.getElementById('hint');
  const membraneEl = document.querySelector('.hr__membrane');
  const bpmEl = document.getElementById('bpm');
  const hrvEl = document.getElementById('hrv');
  const statusEl = document.getElementById('status');
  const progressEl = document.getElementById('progress');
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
  let lastBeat = 0;        // time of the last beat the membrane swelled for
  let clear = false;       // a steady pulse is being found

  const status = (text) => { statusEl.textContent = text; };
  const setHint = (text) => {
    hint.textContent = text;
    dial.setAttribute('aria-label', text);
  };
  setHint('Tap to start');

  // The membrane, unless the phone asks for less motion.
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const membrane = reduceMotion ? null : createMembrane({ core: membraneEl, cfg: { shape: 'circle', minScale: 0, maxScale: 1 } });
  function animate(now) {
    let scale = IDLE_SCALE;
    if (running) {
      const [from, to] = CONTACT_SCALE;
      scale = contactS > 0 ? from + (to - from) * Math.min(1, contactS / HRV_S) : from;
    } else if (!reduceMotion) {
      scale += 0.03 * Math.sin((now / 4000) * 2 * Math.PI); // a slow breath while waiting
    }
    membraneEl.style.setProperty('--hr-scale', scale.toFixed(4));
    membrane?.update({ scale }, now);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);

  function averageColour() {
    sampleCtx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const data = sampleCtx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    const n = data.length / 4;
    return { r: r / n, g: g / n, b: b / n };
  }

  async function start() {
    doneLink.hidden = true;
    dial.dataset.state = 'running';
    setHint('Tap to stop');
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
    if (dial.dataset.state !== 'running') { stopCamera(); return; } // stopped while the camera started
    video.srcObject = stream;
    video.hidden = false;
    await video.play();
    const track = stream.getVideoTracks()[0];
    const torch = track.getCapabilities?.().torch;
    if (torch) {
      try { await track.applyConstraints({ advanced: [{ torch: true }] }); } catch { /* reading still works in bright light */ }
    }
    samples = []; all = []; readings = []; contactS = 0; lastT = null; lastBeat = 0;
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
      showClear(false);
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
      const beats = findBeats(wave.filter(s => s.t > t - WINDOW_S + 0.6));
      const bpm = estimateBpm(beats);
      if (bpm) { readings.push(bpm); if (readings.length > 90) readings.shift(); }
      showClear(!!bpm);
      // Every new beat swells the membrane; a strong one when the pulse is steady.
      const beat = beats.at(-1);
      if (beat != null && beat > lastBeat + 0.25) {
        lastBeat = beat;
        membrane?.pulse(bpm ? 1 : 0.4);
      }
      // No steady pulse yet: an uneven ripple, as unsettled as the signal.
      if (!bpm && Math.random() < 0.2) membrane?.ripple(0.5);
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

  // The pulse wave and the dial show whether the signal is clear.
  function showClear(on) {
    if (on === clear) return;
    clear = on;
    trace.classList.toggle('hr__trace--clear', on);
    dial.classList.toggle('hr__dial--clear', on);
  }

  function stopCamera() {
    running = false;
    for (const track of stream?.getTracks() ?? []) track.stop();
    stream = null;
    video.srcObject = null;
    video.hidden = true;
    showClear(false);
    delete dial.dataset.state;
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
    setHint('Tap to measure again');
    doneLink.hidden = false;
  }

  function fail(message) {
    stopCamera();
    status(message);
    setHint('Tap to try again');
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

  dial.addEventListener('click', () => {
    if (dial.dataset.state !== 'running') { start(); return; }
    stopCamera();
    bpmEl.textContent = '--';
    progressEl.style.width = '0%';
    drawTrace([]);
    status('Stopped. Tap the circle to start again.');
    setHint('Tap to start');
  });
  window.addEventListener('pagehide', stopCamera);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) fail('Paused while the app was in the background. Tap the circle to try again.');
  });
}
