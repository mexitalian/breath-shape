package com.mexitalian.breathing;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BreathVibrationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
