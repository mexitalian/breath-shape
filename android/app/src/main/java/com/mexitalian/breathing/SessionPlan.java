package com.mexitalian.breathing;

import android.os.SystemClock;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

// What a session plays, as sent by the page (js/cues.js cuePlan): each phase's start,
// length, name, vibration and hum. Times are relative to when the plan arrived.
final class SessionPlan {

    static final int VIBE_NONE = -1;
    static final int VIBE_UP = -2;
    static final int VIBE_DOWN = -3;

    static final class Phase {
        int serial;
        long start;
        long duration; // -1: until tapped
        String name;
        int vibe;
        boolean hum;
    }

    final long receivedAt = SystemClock.elapsedRealtime();
    String title;
    String usage;
    String curve;
    boolean vibration;
    boolean sound;
    double tone;
    double level;
    boolean ends;
    long[][] patterns;
    Phase[] phases;

    static SessionPlan from(JSONObject data) throws JSONException {
        SessionPlan plan = new SessionPlan();
        plan.title = data.optString("title", "Breathing");
        plan.usage = data.optString("usage", "alarm");
        plan.curve = data.optString("curve", "even");
        plan.vibration = data.optBoolean("vibration", true);
        plan.ends = data.optBoolean("ends", false);
        JSONObject sound = data.optJSONObject("sound");
        plan.sound = sound != null;
        if (sound != null) {
            plan.tone = sound.optDouble("tone", 130);
            plan.level = sound.optDouble("level", 0);
        }
        JSONArray names = data.getJSONArray("names");
        JSONArray patterns = data.getJSONArray("patterns");
        plan.patterns = new long[patterns.length()][];
        for (int i = 0; i < patterns.length(); i++) {
            JSONArray p = patterns.getJSONArray(i);
            plan.patterns[i] = new long[p.length()];
            for (int j = 0; j < p.length(); j++) plan.patterns[i][j] = p.getLong(j);
        }
        JSONArray phases = data.getJSONArray("phases");
        plan.phases = new Phase[phases.length()];
        for (int i = 0; i < phases.length(); i++) {
            JSONArray row = phases.getJSONArray(i);
            Phase phase = new Phase();
            phase.serial = row.getInt(0);
            phase.start = row.getLong(1);
            phase.duration = row.getLong(2);
            phase.name = names.getString(row.getInt(3));
            phase.vibe = row.getInt(4);
            phase.hum = row.getInt(5) == 1;
            plan.phases[i] = phase;
        }
        return plan;
    }
}
