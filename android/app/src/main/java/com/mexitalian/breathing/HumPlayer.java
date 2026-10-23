package com.mexitalian.breathing;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

// The hum tone for phases marked hum, played natively so it carries on with the
// screen off. Same sound as the website's (js/controls/sound.js): a soft fundamental
// with a quiet octave and twelfth, faded in and out over about a third of a second.
// The track pauses while silent, so it costs nothing between hums.
final class HumPlayer implements Runnable {

    private static final int RATE = 44100;
    private static final int CHUNK = RATE / 50; // 20 ms
    private static final double FADE_S = 0.35;
    private static final double TWO_PI = Math.PI * 2;

    private final AudioTrack track;
    private final Thread thread;
    private final Object lock = new Object();
    private volatile double tone;
    private volatile double level;
    private volatile boolean humming;
    private volatile boolean alive = true;

    HumPlayer(double tone, double level) {
        this.tone = tone;
        this.level = level;
        int min = AudioTrack.getMinBufferSize(RATE, AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT);
        track = new AudioTrack.Builder()
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
            .setTransferMode(AudioTrack.MODE_STREAM)
            .build();
        thread = new Thread(this, "breath-hum");
        thread.start();
    }

    void configure(double tone, double level) {
        this.tone = tone;
        this.level = level;
    }

    void setHumming(boolean on) {
        humming = on;
        if (on) synchronized (lock) { lock.notifyAll(); }
    }

    void release() {
        alive = false;
        synchronized (lock) { lock.notifyAll(); }
        try {
            thread.join(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Override
    public void run() {
        short[] buffer = new short[CHUNK];
        double gain = 0;
        double p1 = 0;
        double p2 = 0;
        double p3 = 0;
        double smoothing = 1 - Math.exp(-1 / (RATE * FADE_S / 3));
        try {
            while (alive) {
                if (!humming && gain < 1e-4) {
                    gain = 0;
                    track.pause();
                    synchronized (lock) {
                        while (alive && !humming) lock.wait();
                    }
                    if (!alive) break;
                }
                if (track.getPlayState() != AudioTrack.PLAYSTATE_PLAYING) track.play();
                double target = humming ? level : 0;
                double step = TWO_PI * tone / RATE;
                for (int i = 0; i < CHUNK; i++) {
                    gain += (target - gain) * smoothing;
                    double sample = Math.sin(p1) + 0.25 * Math.sin(p2) + 0.08 * Math.sin(p3);
                    buffer[i] = (short) Math.max(-32767, Math.min(32767, sample * gain * 32767));
                    p1 = (p1 + step) % TWO_PI;
                    p2 = (p2 + 2 * step) % TWO_PI;
                    p3 = (p3 + 3 * step) % TWO_PI;
                }
                track.write(buffer, 0, CHUNK);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            track.stop();
            track.release();
        }
    }
}
