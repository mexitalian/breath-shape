package com.mexitalian.breathing;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONException;

// The page's side of BreathSessionService: start a session's cues, send updated
// phases, stop, and ask whether the notification's Stop was pressed.
@CapacitorPlugin(name = "BreathSession")
public class BreathSessionPlugin extends Plugin {

    private static final String PREFS = "breath-session";
    private static final String ASKED_NOTIFICATIONS = "asked-notifications";

    @PluginMethod
    public void start(PluginCall call) {
        askForNotificationsOnce();
        play(call, true);
    }

    @PluginMethod
    public void update(PluginCall call) {
        play(call, false);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        BreathSessionService.end();
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject status = new JSObject();
        status.put("running", BreathSessionService.isRunning());
        status.put("stoppedByUser", BreathSessionService.stoppedByUser);
        call.resolve(status);
    }

    private void play(PluginCall call, boolean fresh) {
        SessionPlan plan;
        try {
            plan = SessionPlan.from(call.getData());
        } catch (JSONException e) {
            call.reject("Bad session plan: " + e.getMessage());
            return;
        }
        BreathSessionService.play(getContext(), plan, fresh);
        call.resolve();
    }

    // The Stop button lives on a notification, which Android 13+ shows only with
    // permission. Asked once, at the first session; the cues play either way.
    private void askForNotificationsOnce() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getActivity() == null) return;
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return;
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, 0);
        if (prefs.getBoolean(ASKED_NOTIFICATIONS, false)) return;
        prefs.edit().putBoolean(ASKED_NOTIFICATIONS, true).apply();
        ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 4711);
    }
}
