// Heart rate from the camera (photoplethysmography). A fingertip over the lens and
// flash glows red; each heartbeat pushes blood in and dims it slightly. These pure
// functions turn per-frame colour averages into beats and BPM.

export const MIN_BPM = 40;
export const MAX_BPM = 180;

// A lit fingertip fills the frame with bright, saturated red.
export function fingerPresent({ r, g, b }) {
  return r > 90 && g < r * 0.6 && b < r * 0.6;
}

// Mean of samples within ±half seconds of each sample (sliding window, linear time).
function movingAverage(samples, half) {
  const out = new Array(samples.length);
  let lo = 0;
  let hi = 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = samples[i].t;
    while (hi < samples.length && samples[hi].t <= t + half) sum += samples[hi++].v;
    while (samples[lo].t < t - half) sum -= samples[lo++].v;
    out[i] = sum / (hi - lo);
  }
  return out;
}

// samples: [{ t: seconds, v: red brightness }]. Returns the pulse wave with the slow
// baseline (finger pressure, exposure drift) removed and frame noise smoothed, flipped
// so each beat is a peak.
export function pulseWave(samples) {
  if (samples.length < 3) return [];
  const baseline = movingAverage(samples, 0.6);
  const detrended = samples.map((s, i) => ({ t: s.t, v: baseline[i] - s.v }));
  const smooth = movingAverage(detrended, 0.06);
  return detrended.map((s, i) => ({ t: s.t, v: smooth[i] }));
}

// Peaks at least one shortest beat apart and above a share of the recent amplitude.
export function findBeats(wave) {
  if (wave.length < 3) return [];
  const minGap = 60 / MAX_BPM;
  const amplitude = Math.max(...wave.map(s => Math.abs(s.v)));
  const threshold = amplitude * 0.25;
  const beats = [];
  for (let i = 1; i < wave.length - 1; i++) {
    const s = wave[i];
    if (s.v < threshold || s.v < wave[i - 1].v || s.v < wave[i + 1].v) continue;
    // Keep the higher of two peaks that are too close together.
    const last = beats.at(-1);
    if (last && s.t - last.t < minGap) {
      if (s.v > last.v) beats[beats.length - 1] = s;
      continue;
    }
    beats.push(s);
  }
  return beats.map(b => b.t);
}

const median = (list) => {
  const sorted = [...list].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// BPM from beat times, or null when there are too few beats or they're too irregular
// to trust (movement, pressure changes, a slipping finger).
export function estimateBpm(beatTimes) {
  const intervals = [];
  for (let i = 1; i < beatTimes.length; i++) {
    const gap = beatTimes[i] - beatTimes[i - 1];
    if (gap >= 60 / MAX_BPM && gap <= 60 / MIN_BPM) intervals.push(gap);
  }
  if (intervals.length < 4) return null;
  const mid = median(intervals);
  const steady = intervals.filter(gap => Math.abs(gap - mid) / mid < 0.25);
  if (steady.length < intervals.length * 0.7) return null;
  return Math.round(60 / median(steady));
}
