package com.mexitalian.breathing;

import android.content.ContentResolver;
import android.content.Context;
import android.media.AudioManager;
import android.os.Build;
import android.os.Vibrator;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

// Vibration with an explicit usage. Android applies a separate on/off and strength
// setting per usage (ring, notification, alarm, touch, media...). Vibrations sent
// without one (Capacitor Haptics, navigator.vibrate) count as "unknown", which some
// phones silence, so the app picks the usage the phone actually honours.
@CapacitorPlugin(name = "BreathVibration")
public class BreathVibrationPlugin extends Plugin {

    private Vibrator vibrator() {
        return Vibes.vibrator(getContext());
    }

    @PluginMethod
    public void vibrate(PluginCall call) {
        long duration = call.getInt("duration", 300);
        play(call, new long[] { 0, duration });
    }

    // timings: [off, on, off, on, ...] in ms, like Android's waveform format.
    @PluginMethod
    public void pattern(PluginCall call) {
        JSArray list = call.getArray("timings");
        if (list == null || list.length() == 0) {
            call.reject("timings is required");
            return;
        }
        long[] timings = new long[list.length()];
        try {
            for (int i = 0; i < timings.length; i++) timings[i] = list.getLong(i);
        } catch (JSONException e) {
            call.reject("timings must be numbers");
            return;
        }
        play(call, timings);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        vibrator().cancel();
        call.resolve();
    }

    private void play(PluginCall call, long[] timings) {
        Vibrator vibrator = vibrator();
        if (!vibrator.hasVibrator()) {
            call.reject("This phone has no vibration motor");
            return;
        }
        String usage = call.getString("usage", "alarm");
        Vibes.play(vibrator, timings, null, usage);
        JSObject result = new JSObject();
        result.put("usage", usage);
        call.resolve(result);
    }

    // Diagnostics: a continuous-style ramp up then down, durationMs each way.
    @PluginMethod
    public void ramp(PluginCall call) {
        Vibrator vibrator = vibrator();
        if (!vibrator.hasVibrator()) {
            call.reject("This phone has no vibration motor");
            return;
        }
        long duration = call.getInt("duration", 4000);
        String curve = call.getString("curve", "even");
        boolean amplitude = Vibes.amplitudeControl(vibrator);
        Vibes.Waveform wave = new Vibes.Waveform();
        Vibes.appendRamp(wave, duration, true, curve, 0, amplitude);
        Vibes.appendRamp(wave, duration, false, curve, 0, amplitude);
        wave.play(vibrator, call.getString("usage", "alarm"));
        JSObject result = new JSObject();
        result.put("amplitudeControl", amplitude);
        call.resolve(result);
    }

    // What the phone reports about vibration, for the Diagnostics page.
    @PluginMethod
    public void info(PluginCall call) {
        Vibrator vibrator = vibrator();
        AudioManager audio = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        JSObject info = new JSObject();
        info.put("sdk", Build.VERSION.SDK_INT);
        info.put("hasVibrator", vibrator.hasVibrator());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) info.put("amplitudeControl", vibrator.hasAmplitudeControl());
        int mode = audio.getRingerMode();
        info.put("ringerMode", mode == AudioManager.RINGER_MODE_SILENT ? "silent" : mode == AudioManager.RINGER_MODE_VIBRATE ? "vibrate" : "sound");
        ContentResolver resolver = getContext().getContentResolver();
        JSObject settings = new JSObject();
        for (String name : new String[] {
            "vibrate_on",
            "haptic_feedback_enabled",
            "haptic_feedback_intensity",
            "media_vibration_intensity",
            "alarm_vibration_intensity",
            "notification_vibration_intensity",
            "ring_vibration_intensity",
        }) {
            settings.put(name, readSetting(resolver, name));
        }
        info.put("settings", settings);
        call.resolve(info);
    }

    private String readSetting(ContentResolver resolver, String name) {
        try {
            String value = Settings.System.getString(resolver, name);
            return value == null ? "unset" : value;
        } catch (SecurityException e) {
            return "hidden";
        }
    }
}
