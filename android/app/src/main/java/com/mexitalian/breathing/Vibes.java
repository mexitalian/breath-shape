package com.mexitalian.breathing;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import java.util.ArrayList;
import java.util.List;

// Vibration helpers shared by the BreathVibration plugin and the session service:
// the phone's vibrator, playing a waveform tagged with a usage, and the continuous
// style's ramps.
final class Vibes {

    // About 15% strength: below that most motors can't be felt.
    static final int MIN_AMPLITUDE = 38;
    static final int STEP_MS = 50;
    // A short gap at the end of a ramp so the next phase reads as a new one.
    static final int END_GAP_MS = 80;

    private Vibes() {}

    static Vibrator vibrator(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager.getDefaultVibrator();
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    static boolean amplitudeControl(Vibrator vibrator) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && vibrator.hasAmplitudeControl();
    }

    // Either timings [off, on, off, on, ...] ms with amplitudes null, or timings with a
    // strength each (0-255, 0 = off). Strengths need Android 8; older phones skip them.
    static void play(Vibrator vibrator, long[] timings, int[] amplitudes, String usage) {
        if (timings.length == 0 || !vibrator.hasVibrator()) return;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            if (amplitudes != null) return;
            vibrateLegacy(vibrator, timings);
            return;
        }
        VibrationEffect effect = amplitudes == null
            ? VibrationEffect.createWaveform(timings, -1)
            : VibrationEffect.createWaveform(timings, amplitudes, -1);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            vibrator.vibrate(effect, new VibrationAttributes.Builder().setUsage(vibrationUsage(usage)).build());
        } else {
            vibrator.vibrate(effect, new AudioAttributes.Builder().setUsage(audioUsage(usage)).build());
        }
    }

    @SuppressWarnings("deprecation")
    private static void vibrateLegacy(Vibrator vibrator, long[] timings) {
        vibrator.vibrate(timings, -1);
    }

    // A ramp over durationMs: up = soft to strong (breathing in), down = strong to soft
    // (breathing out). curve "eased" starts slowly and finishes strongly (mirrored for
    // down). skipMs drops the part already past, for a ramp joined late.
    // Without amplitude control the strength is shown as longer or shorter pulses.
    static Waveform ramp(long durationMs, boolean up, String curve, long skipMs, boolean amplitudeControl) {
        Waveform wave = new Waveform();
        appendRamp(wave, durationMs, up, curve, skipMs, amplitudeControl);
        return wave;
    }

    static void appendRamp(Waveform wave, long durationMs, boolean up, String curve, long skipMs, boolean amplitudeControl) {
        long total = durationMs - END_GAP_MS;
        int steps = (int) (total / STEP_MS);
        for (int i = 0; i < steps; i++) {
            if ((long) (i + 1) * STEP_MS <= skipMs) continue;
            double p = (i + 0.5) / steps;
            double level = up ? p : 1 - p;
            if ("eased".equals(curve)) level = level * level;
            if (amplitudeControl) {
                wave.add(STEP_MS, (int) Math.round(MIN_AMPLITUDE + (255 - MIN_AMPLITUDE) * level));
            } else {
                long on = Math.round(STEP_MS * (0.2 + 0.8 * level));
                wave.add(on, 255);
                wave.add(STEP_MS - on, 0);
            }
        }
        wave.add(END_GAP_MS, 0);
    }

    // A waveform being built: timings in ms, each with a strength (0 = off).
    static final class Waveform {
        final List<Long> timings = new ArrayList<>();
        final List<Integer> amplitudes = new ArrayList<>();

        void add(long ms, int amplitude) {
            if (ms <= 0) return;
            // Neighbours of the same strength merge into one entry.
            int last = timings.size() - 1;
            if (last >= 0 && amplitudes.get(last) == amplitude) {
                timings.set(last, timings.get(last) + ms);
                return;
            }
            timings.add(ms);
            amplitudes.add(amplitude);
        }

        void play(Vibrator vibrator, String usage) {
            long[] t = new long[timings.size()];
            int[] a = new int[amplitudes.size()];
            for (int i = 0; i < t.length; i++) {
                t[i] = timings.get(i);
                a[i] = amplitudes.get(i);
            }
            Vibes.play(vibrator, t, a, usage);
        }
    }

    static int vibrationUsage(String usage) {
        switch (usage) {
            case "alarm": return VibrationAttributes.USAGE_ALARM;
            case "notification": return VibrationAttributes.USAGE_NOTIFICATION;
            case "ringtone": return VibrationAttributes.USAGE_RINGTONE;
            case "touch": return VibrationAttributes.USAGE_TOUCH;
            case "media": return VibrationAttributes.USAGE_MEDIA;
            case "accessibility": return VibrationAttributes.USAGE_ACCESSIBILITY;
            default: return VibrationAttributes.USAGE_UNKNOWN;
        }
    }

    static int audioUsage(String usage) {
        switch (usage) {
            case "alarm": return AudioAttributes.USAGE_ALARM;
            case "notification": return AudioAttributes.USAGE_NOTIFICATION;
            case "ringtone": return AudioAttributes.USAGE_NOTIFICATION_RINGTONE;
            case "touch": return AudioAttributes.USAGE_ASSISTANCE_SONIFICATION;
            case "media": return AudioAttributes.USAGE_MEDIA;
            case "accessibility": return AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY;
            default: return AudioAttributes.USAGE_UNKNOWN;
        }
    }
}
