package com.mexitalian.breathing;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.SystemClock;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;

// Plays a session's vibration and hum while it runs, screen on or off. Android pauses
// the app's page when the screen turns off, so the page hands over the phases ahead
// (SessionPlan) and this service times them itself, holding a partial wake lock so the
// phone doesn't sleep through a cue. A notification shows the technique and phase,
// with a Stop button. All work runs on one background thread.
public class BreathSessionService extends Service {

    static final String ACTION_STOP = "com.mexitalian.breathing.STOP_SESSION";
    private static final String CHANNEL = "session";
    private static final int NOTIFICATION_ID = 7;
    // A safety net: the wake lock lets go after this even if nothing stops the service.
    private static final long MAX_SESSION_MS = 3 * 60 * 60 * 1000L;
    // A tap pattern joined later than this is skipped rather than played late.
    private static final long LATE_TAP_MS = 400;

    private static volatile BreathSessionService instance;
    private static volatile SessionPlan pending;
    private static volatile boolean pendingFresh;
    static volatile boolean stoppedByUser;

    private HandlerThread thread;
    private Handler handler;
    private PowerManager.WakeLock wakeLock;
    private Vibrator vibrator;
    private boolean amplitudeControl;
    private HumPlayer hum;
    private SessionPlan plan;
    private long base;
    private int lastPlayed = -1;
    private String shownText;

    // From the plugin. fresh = a new session (its first phase plays again);
    // otherwise an update to the running one.
    static void play(Context context, SessionPlan plan, boolean fresh) {
        if (fresh) stoppedByUser = false;
        else if (stoppedByUser) return;
        BreathSessionService service = instance;
        if (service != null) {
            service.handler.post(() -> service.load(plan, fresh));
            return;
        }
        pending = plan;
        pendingFresh = true;
        ContextCompat.startForegroundService(context, new Intent(context, BreathSessionService.class));
    }

    static void end() {
        pending = null;
        BreathSessionService service = instance;
        if (service != null) service.handler.post(service::shutdown);
    }

    static boolean isRunning() {
        return instance != null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        thread = new HandlerThread("breath-session");
        thread.start();
        handler = new Handler(thread.getLooper());
        vibrator = Vibes.vibrator(this);
        amplitudeControl = Vibes.amplitudeControl(vibrator);
        PowerManager power = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "breathing:session");
        wakeLock.acquire(MAX_SESSION_MS);
        createChannel();
        instance = this;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        instance = this;
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification(""), type);
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stoppedByUser = true;
            handler.post(this::shutdown);
            return START_NOT_STICKY;
        }
        SessionPlan next = pending;
        boolean fresh = pendingFresh;
        pending = null;
        if (next != null) handler.post(() -> load(next, fresh));
        else handler.post(this::shutdown);
        return START_NOT_STICKY;
    }

    // Swiping the app away ends the session.
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        handler.post(this::shutdown);
    }

    @Override
    public void onDestroy() {
        if (instance == this) instance = null;
        handler.removeCallbacksAndMessages(null);
        if (hum != null) hum.release();
        hum = null;
        if (wakeLock.isHeld()) wakeLock.release();
        thread.quitSafely();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // On the session thread from here on.

    private void load(SessionPlan next, boolean fresh) {
        handler.removeCallbacksAndMessages(null);
        if (fresh) lastPlayed = -1;
        if (!next.vibration && plan != null && plan.vibration) vibrator.cancel();
        plan = next;
        base = next.receivedAt;
        if (next.sound) {
            if (hum == null) hum = new HumPlayer(next.tone, next.level);
            else hum.configure(next.tone, next.level);
        } else if (hum != null) {
            hum.release();
            hum = null;
        }
        long now = SystemClock.elapsedRealtime();
        int current = -1;
        for (int i = 0; i < next.phases.length; i++) {
            if (base + next.phases[i].start <= now) current = i;
            else break;
        }
        if (current >= 0) enter(current, now);
        scheduleFrom(current + 1);
    }

    private void scheduleFrom(int index) {
        long now = SystemClock.elapsedRealtime();
        if (index >= plan.phases.length) {
            SessionPlan.Phase last = plan.phases.length > 0 ? plan.phases[plan.phases.length - 1] : null;
            if (plan.ends && last != null && last.duration >= 0) {
                handler.postDelayed(this::finished, Math.max(0, base + last.start + last.duration - now));
            }
            return;
        }
        long at = base + plan.phases[index].start;
        handler.postDelayed(() -> {
            enter(index, SystemClock.elapsedRealtime());
            scheduleFrom(index + 1);
        }, Math.max(0, at - now));
    }

    private void enter(int index, long now) {
        SessionPlan.Phase phase = plan.phases[index];
        long late = now - (base + phase.start);
        if (hum != null) hum.setHumming(phase.hum);
        show(phase.name);
        if (phase.serial <= lastPlayed) return;
        lastPlayed = phase.serial;
        if (phase.duration >= 0 && late >= phase.duration) return;
        if (phase.vibe == SessionPlan.VIBE_UP || phase.vibe == SessionPlan.VIBE_DOWN) {
            if (phase.duration < 0) return;
            Vibes.ramp(phase.duration, phase.vibe == SessionPlan.VIBE_UP, plan.curve, late, amplitudeControl).play(vibrator, plan.usage);
        } else if (phase.vibe >= 0 && phase.vibe < plan.patterns.length && late < LATE_TAP_MS) {
            Vibes.play(vibrator, plan.patterns[phase.vibe], null, plan.usage);
        }
    }

    private void finished() {
        show("Session complete");
        if (hum != null) hum.setHumming(false);
        handler.postDelayed(this::shutdown, 1500);
    }

    private void shutdown() {
        if (instance == this) instance = null;
        handler.removeCallbacksAndMessages(null);
        vibrator.cancel();
        if (hum != null) {
            hum.release();
            hum = null;
        }
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    // Notification

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Breathing session", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("Shown while a session plays with the screen off");
        channel.setShowBadge(false);
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    private Notification notification(String text) {
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openIntent = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Intent stop = new Intent(this, BreathSessionService.class).setAction(ACTION_STOP);
        PendingIntent stopIntent = PendingIntent.getService(this, 1, stop, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_breath)
            .setContentTitle(plan != null ? plan.title : "Breath Shape")
            .setContentText(text)
            .setContentIntent(openIntent)
            .addAction(0, "Stop", stopIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build();
    }

    private void show(String text) {
        if (text.equals(shownText)) return;
        shownText = text;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, notification(text));
    }
}
