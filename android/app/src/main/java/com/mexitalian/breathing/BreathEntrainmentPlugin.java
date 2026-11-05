package com.mexitalian.breathing;

import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;

// Entrainment lab (#143), native engine. Sound comes from EntrainmentPlayer (exact to
// the audio clock). Vibration never waits on a timer per beat:
//   waveform  one 2-second pattern (the same block as hapticPattern in
//             js/entrainment/pulses.js) handed to the vibration hardware to loop for ever
//   ticks     Android's crisp click effects (Android 11+), composed 2 seconds at a
//             time; each block is handed over at its exact start, and how late that
//             was is measured
// With sound on, vibration starts on a beat of the sound, using the audio timestamp.
@CapacitorPlugin(name = "BreathEntrainment")
public class BreathEntrainmentPlugin extends Plugin {

    static final long BLOCK_MS = 2000;
    private static final long FALLBACK_TICK_MS = 12;

    private HandlerThread thread;
    private Handler handler;
    private Vibrator vibrator;
    private EntrainmentPlayer player;

    private double hz;
    private double duty;
    private String haptic = "off";
    private int strength = 255;
    private String usage = "alarm";
    private int generation;          // stops stale scheduled work after a restart
    private long hapticTarget = -1;  // uptime the vibration was meant to start
    private long hapticStarted = -1; // uptime it really started
    private int blocks;
    private double lateSum;
    private double lateMax;
    private boolean ticksSupported;

    @Override
    public void load() {
        thread = new HandlerThread("breath-entrainment");
        thread.start();
        handler = new Handler(thread.getLooper());
        vibrator = Vibes.vibrator(getContext());
        ticksSupported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
            && vibrator.areAllPrimitivesSupported(VibrationEffect.Composition.PRIMITIVE_CLICK);
    }

    @Override
    protected void handleOnDestroy() {
        if (handler != null) handler.post(this::stopNow);
    }

    // What the phone says about its motor.
    @PluginMethod
    public void info(PluginCall call) {
        JSObject out = new JSObject();
        out.put("sdk", Build.VERSION.SDK_INT);
        out.put("hasVibrator", vibrator.hasVibrator());
        out.put("amplitudeControl", Vibes.amplitudeControl(vibrator));
        out.put("ticks", ticksSupported);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            float resonant = vibrator.getResonantFrequency();
            float q = vibrator.getQFactor();
            if (!Float.isNaN(resonant)) out.put("resonantHz", resonant);
            if (!Float.isNaN(q)) out.put("qFactor", q);
            int[] durations = vibrator.getPrimitiveDurations(
                VibrationEffect.Composition.PRIMITIVE_CLICK,
                VibrationEffect.Composition.PRIMITIVE_TICK,
                VibrationEffect.Composition.PRIMITIVE_LOW_TICK);
            JSObject prim = new JSObject();
            prim.put("click", durations[0]);
            prim.put("tick", durations[1]);
            prim.put("lowTick", durations[2]);
            out.put("primitiveMs", prim);
        }
        call.resolve(out);
    }

    // options: hz, sound, toneHz, volume (0-1), duty (0-1), haptic ('off' | 'waveform'
    // | 'ticks'), strength (0-1), usage (vibration usage, as BreathVibration)
    @PluginMethod
    public void start(PluginCall call) {
        final double beat = clamp(call.getDouble("hz", 6.0), 0.5, 40);
        final boolean sound = Boolean.TRUE.equals(call.getBoolean("sound", true));
        final double tone = clamp(call.getDouble("toneHz", 220.0), 60, 2000);
        final double volume = clamp(call.getDouble("volume", 0.5), 0, 1);
        final double pulse = clamp(call.getDouble("duty", 0.5), 0.05, 0.95);
        final String mode = call.getString("haptic", "off");
        final double power = clamp(call.getDouble("strength", 1.0), 0.05, 1);
        final String use = call.getString("usage", "alarm");
        handler.post(() -> {
            stopNow();
            int gen = ++generation;
            hz = Math.round(beat * 2) / 2.0;
            duty = pulse;
            haptic = mode;
            strength = (int) Math.round(power * 255);
            usage = use;
            if (sound) {
                player = new EntrainmentPlayer(hz, tone, volume, duty);
                player.start();
            }
            if (!"off".equals(haptic)) {
                if (player != null) waitForSound(gen, SystemClock.uptimeMillis() + 600);
                else startHaptics(gen, SystemClock.uptimeMillis() + 30);
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        handler.post(this::stopNow);
        call.resolve();
    }

    // How the timing is doing: audio latency and clock drift; when vibration started
    // against its target; for ticks, how late each block was handed over.
    @PluginMethod
    public void stats(PluginCall call) {
        handler.post(() -> {
            JSObject out = new JSObject();
            out.put("running", player != null || hapticStarted >= 0);
            out.put("hz", hz);
            out.put("haptic", haptic);
            out.put("ticksSupported", ticksSupported);
            if (player != null) {
                out.put("latencyMs", player.latencyMs());
                out.put("driftPpm", player.driftPpm());
            }
            if (hapticStarted >= 0 && hapticTarget >= 0) out.put("hapticStartOffsetMs", hapticStarted - hapticTarget);
            out.put("blocks", blocks);
            if (blocks > 0) {
                out.put("blockLateAvgMs", lateSum / blocks);
                out.put("blockLateMaxMs", lateMax);
            }
            call.resolve(out);
        });
    }

    private void stopNow() {
        generation++;
        handler.removeCallbacksAndMessages(null);
        if (player != null) {
            player.stop();
            player = null;
        }
        vibrator.cancel();
        hapticTarget = hapticStarted = -1;
        blocks = 0;
        lateSum = lateMax = 0;
    }

    // Start vibration on a beat of the sound once the audio hardware reports when its
    // first frame played; give up waiting at `deadline` and start anyway.
    private void waitForSound(int gen, long deadline) {
        if (gen != generation || player == null) return;
        long first = player.firstFrameNanos();
        long now = SystemClock.uptimeMillis();
        if (first < 0 && now < deadline) {
            handler.postDelayed(() -> waitForSound(gen, deadline), 5);
            return;
        }
        long at = now + 30;
        if (first >= 0) {
            // The first beat at least 30 ms from now, on the sound's own beat grid.
            double periodNs = 1e9 / hz;
            long nowNs = System.nanoTime();
            double beats = Math.ceil((nowNs + 30_000_000L - first) / periodNs);
            long beatNs = first + (long) (beats * periodNs);
            at = now + (beatNs - nowNs) / 1_000_000L;
        }
        startHaptics(gen, at);
    }

    private void startHaptics(int gen, long at) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return; // waveforms need Android 8
        hapticTarget = at;
        if ("ticks".equals(haptic) && ticksSupported) {
            handler.postAtTime(() -> playTickBlock(gen, at), at);
        } else {
            handler.postAtTime(() -> {
                if (gen != generation) return;
                hapticStarted = SystemClock.uptimeMillis();
                boolean ticks = "ticks".equals(haptic); // ticks asked for but not supported
                Pattern p = pattern(hz, ticks ? 0 : duty, ticks ? FALLBACK_TICK_MS : 12, strength);
                Vibes.playEffect(vibrator, waveform(p, true), usage);
            }, at);
        }
    }

    // One 2-second block of clicks, then the next one scheduled at its exact start.
    private void playTickBlock(int gen, long blockStart) {
        if (gen != generation || Build.VERSION.SDK_INT < Build.VERSION_CODES.R) return;
        long now = SystemClock.uptimeMillis();
        if (hapticStarted < 0) hapticStarted = now;
        double late = now - blockStart;
        blocks++;
        lateSum += late;
        lateMax = Math.max(lateMax, late);
        int beats = (int) Math.round(hz * BLOCK_MS / 1000.0);
        int clickMs = 12;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            int d = vibrator.getPrimitiveDurations(VibrationEffect.Composition.PRIMITIVE_CLICK)[0];
            if (d > 0) clickMs = d;
        }
        VibrationEffect.Composition c = VibrationEffect.startComposition();
        long prevEnd = 0;
        float scale = strength / 255f;
        for (int i = 0; i < beats; i++) {
            long startMs = Math.round(i * (double) BLOCK_MS / beats);
            int delay = (int) Math.max(0, startMs - prevEnd);
            c.addPrimitive(VibrationEffect.Composition.PRIMITIVE_CLICK, scale, delay);
            prevEnd = Math.max(prevEnd, startMs) + clickMs;
        }
        Vibes.playEffect(vibrator, c.compose(), usage);
        long next = blockStart + BLOCK_MS;
        handler.postAtTime(() -> playTickBlock(gen, next), next);
    }

    // A block of [on, off, ...] ms and strengths; mirrors hapticPattern in
    // js/entrainment/pulses.js.
    static final class Pattern {
        final long[] durations;
        final int[] amplitudes;

        Pattern(long[] durations, int[] amplitudes) {
            this.durations = durations;
            this.amplitudes = amplitudes;
        }
    }

    static Pattern pattern(double hz, double duty, long minOnMs, int strength) {
        int beats = (int) Math.round(hz * BLOCK_MS / 1000.0);
        List<Long> d = new ArrayList<>();
        List<Integer> a = new ArrayList<>();
        for (int i = 0; i < beats; i++) {
            long start = Math.round(i * (double) BLOCK_MS / beats);
            long next = Math.round((i + 1) * (double) BLOCK_MS / beats);
            long span = next - start;
            long on = Math.min(span, Math.max(minOnMs, Math.round(span * duty)));
            add(d, a, on, strength);
            add(d, a, span - on, 0);
        }
        long[] durations = new long[d.size()];
        int[] amplitudes = new int[a.size()];
        for (int i = 0; i < durations.length; i++) {
            durations[i] = d.get(i);
            amplitudes[i] = a.get(i);
        }
        return new Pattern(durations, amplitudes);
    }

    private static void add(List<Long> d, List<Integer> a, long ms, int amp) {
        if (ms <= 0) return;
        int last = a.size() - 1;
        if (last >= 0 && a.get(last) == amp) d.set(last, d.get(last) + ms);
        else {
            d.add(ms);
            a.add(amp);
        }
    }

    // The block, looping until cancelled. Phones without strength control get plain
    // on/off timings, which Android reads as [off, on, off, ...], so they lead with 0.
    private VibrationEffect waveform(Pattern p, boolean repeat) {
        int loop = repeat ? 0 : -1;
        if (Vibes.amplitudeControl(vibrator)) return VibrationEffect.createWaveform(p.durations, p.amplitudes, loop);
        long[] timings = new long[p.durations.length + 1];
        System.arraycopy(p.durations, 0, timings, 1, p.durations.length);
        return VibrationEffect.createWaveform(timings, loop);
    }

    private static double clamp(Double v, double lo, double hi) {
        double n = v == null || v.isNaN() ? lo : v;
        return Math.min(hi, Math.max(lo, n));
    }
}
