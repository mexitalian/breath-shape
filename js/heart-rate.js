// Heart rate and HRV from the camera (photoplethysmography). A fingertip over the lens
// and flash glows red; each heartbeat pushes blood in and dims it slightly. These pure
// functions turn per-frame colour averages into beats, BPM and RMSSD.

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

// Vertex of the parabola through three samples: a beat's time to well under a frame.
function peakTime(a, b, c) {
  const denom = (a.t - b.t) * (a.t - c.t) * (b.t - c.t);
  if (!denom) return b.t;
  const A = (c.t * (b.v - a.v) + b.t * (a.v - c.v) + a.t * (c.v - b.v)) / denom;
  const B = (c.t * c.t * (a.v - b.v) + b.t * b.t * (c.v - a.v) + a.t * a.t * (b.v - c.v)) / denom;
  if (A >= 0) return b.t;
  return Math.min(c.t, Math.max(a.t, -B / (2 * A)));
}

// Largest |v| within ±half seconds of each sample, so one movement spike only
// raises the bar near itself, not across the whole reading.
function localAmplitude(wave, half) {
  return wave.map((s, i) => {
    let max = 0;
    for (let j = i; j >= 0 && wave[j].t >= s.t - half; j--) max = Math.max(max, Math.abs(wave[j].v));
    for (let j = i + 1; j < wave.length && wave[j].t <= s.t + half; j++) max = Math.max(max, Math.abs(wave[j].v));
    return max;
  });
}

// Beat times: peaks at least one shortest beat apart and above a share of the
// amplitude around them, each timed between frames.
export function findBeats(wave) {
  if (wave.length < 3) return [];
  const minGap = 60 / MAX_BPM;
  const amplitude = localAmplitude(wave, 1.5);
  const peaks = [];
  for (let i = 1; i < wave.length - 1; i++) {
    const s = wave[i];
    if (s.v < amplitude[i] * 0.25 || s.v < wave[i - 1].v || s.v < wave[i + 1].v) continue;
    // Keep the higher of two peaks that are too close together.
    const last = peaks.at(-1);
    if (last && s.t - wave[last].t < minGap) {
      if (s.v > wave[last].v) peaks[peaks.length - 1] = i;
      continue;
    }
    peaks.push(i);
  }
  return peaks.map(i => peakTime(wave[i - 1], wave[i], wave[i + 1]));
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

// HRV as RMSSD (ms): the root mean square of differences between successive beat
// intervals. Intervals far from their neighbours (movement, a missed or extra beat)
// are dropped, and a difference only counts between two clean, adjacent intervals.
// Returns null when too little of the reading is clean to trust.
export const HRV_MIN_PAIRS = 30;
export function estimateHrv(beatTimes) {
  const intervals = [];
  for (let i = 1; i < beatTimes.length; i++) intervals.push((beatTimes[i] - beatTimes[i - 1]) * 1000);
  const plausible = (ms) => ms >= 60000 / MAX_BPM && ms <= 60000 / MIN_BPM;
  const clean = intervals.map((ms, i) => {
    if (!plausible(ms)) return false;
    const around = intervals.slice(Math.max(0, i - 3), i + 4).filter(plausible);
    const mid = median(around);
    return Math.abs(ms - mid) / mid < 0.2;
  });
  const diffs = [];
  for (let i = 1; i < intervals.length; i++) {
    if (clean[i] && clean[i - 1]) diffs.push(intervals[i] - intervals[i - 1]);
  }
  const share = clean.filter(Boolean).length / Math.max(1, intervals.length);
  if (diffs.length < HRV_MIN_PAIRS || share < 0.8) return null;
  const rmssd = Math.sqrt(diffs.reduce((sum, d) => sum + d * d, 0) / diffs.length);
  // Beyond this, a camera reading is almost always noise rather than the heart.
  if (rmssd > 200) return null;
  return Math.round(rmssd);
}
