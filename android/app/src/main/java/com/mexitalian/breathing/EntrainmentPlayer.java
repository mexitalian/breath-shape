package com.mexitalian.breathing;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTimestamp;
import android.media.AudioTrack;
import android.os.Build;

// Entrainment lab (#143): an isochronic beat, made sample by sample. A sine tone is
// switched on and off at the beat rate with short raised-cosine fades (the same
// envelope as isochronicGain in js/entrainment/pulses.js). Because each pulse starts at
// an exact sample, the beat is as steady as the audio hardware's clock: no timer is
// involved. The audio timestamp tells us when frame 0 really played, which the plugin
// uses to line vibration up with the sound.
final class EntrainmentPlayer implements Runnable {

    static final int RATE = 48000;
    private static final int CHUNK = RATE / 100; // 10 ms per write
    private static final double TWO_PI = Math.PI * 2;
    private static final double EDGE_S = 0.008;  // fade in and out per pulse

    private final AudioTrack track;
    private final Thread thread;
    private volatile boolean alive = true;
    private volatile double beatHz;
    private volatile double toneHz;
    private volatile double volume;
    private volatile double duty;
    private volatile long written;   // frames handed to the track
    private double tonePhase;
    private long firstFrameAtStart = -1;
    private long checkedAt;

    EntrainmentPlayer(double beatHz, double toneHz, double volume, double duty) {
        this.beatHz = beatHz;
        this.toneHz = toneHz;
        this.volume = volume;
        this.duty = duty;
        int min = AudioTrack.getMinBufferSize(RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);
        AudioTrack.Builder builder = new AudioTrack.Builder()
            .setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build())
            .setAudioFormat(new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build())
            .setBufferSizeInBytes(Math.max(min, CHUNK * 2 * 4))
            .setTransferMode(AudioTrack.MODE_STREAM);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) builder.setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY);
        track = builder.build();
        thread = new Thread(this, "breath-entrainment-audio");
    }

    void start() {
        track.play();
        thread.start();
    }

    void stop() {
        alive = false;
        try {
            thread.join(300);
        } catch (InterruptedException ignored) {
            Thread.currentThread().interrupt();
        }
        try {
            track.pause();
            track.flush();
        } catch (IllegalStateException ignored) {
            // already released
        }
        track.release();
    }

    // Pure: the pulse's loudness at a point in the beat (0-1). Mirrors
    // isochronicGain in js/entrainment/pulses.js.
    static double gain(double phase, double duty, double edge) {
        double p = phase - Math.floor(phase);
        if (p >= duty) return 0;
        double e = Math.min(edge, duty / 2);
        if (e <= 0) return 1;
        if (p < e) return 0.5 - 0.5 * Math.cos(Math.PI * p / e);
        if (p > duty - e) return 0.5 - 0.5 * Math.cos(Math.PI * (duty - p) / e);
        return 1;
    }

    @Override
    public void run() {
        android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_AUDIO);
        short[] buffer = new short[CHUNK];
        while (alive) {
            double beat = beatHz;
            double tone = toneHz;
            double level = volume * 0.8;
            double d = duty;
            double edge = EDGE_S * beat;
            long start = written;
            for (int i = 0; i < CHUNK; i++) {
                double phase = (double) (start + i) * beat / RATE;
                double g = gain(phase, d, edge);
                tonePhase += TWO_PI * tone / RATE;
                if (tonePhase > TWO_PI) tonePhase -= TWO_PI;
                buffer[i] = (short) (Math.sin(tonePhase) * g * level * Short.MAX_VALUE);
            }
            int done = track.write(buffer, 0, CHUNK);
            if (done < 0) break;
            written += done;
        }
    }

    // When frame 0 played, as System.nanoTime(), or -1 until the hardware reports.
    long firstFrameNanos() {
        AudioTimestamp ts = new AudioTimestamp();
        if (!track.getTimestamp(ts) || ts.framePosition <= 0) return -1;
        return ts.nanoTime - ts.framePosition * 1_000_000_000L / RATE;
    }

    // Sound written but not yet heard, in ms: how far ahead the audio runs.
    double latencyMs() {
        AudioTimestamp ts = new AudioTimestamp();
        if (!track.getTimestamp(ts)) return -1;
        double playedNow = ts.framePosition + (System.nanoTime() - ts.nanoTime) * (double) RATE / 1e9;
        return (written - playedNow) * 1000.0 / RATE;
    }

    // How fast the audio clock runs against the phone's clock, in parts per million
    // since the first reading. The beat is exact on the audio clock; this shows how
    // far that clock wanders from real time (normally a few ppm).
    double driftPpm() {
        long first = firstFrameNanos();
        if (first < 0) return 0;
        long now = System.nanoTime();
        if (firstFrameAtStart < 0) {
            firstFrameAtStart = first;
            checkedAt = now;
            return 0;
        }
        double elapsed = now - checkedAt;
        return elapsed > 0 ? (first - firstFrameAtStart) / elapsed * 1e6 : 0;
    }
}
