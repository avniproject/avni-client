package com.openchsclient.ai;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * AIPackage - React Native package that registers all AI-related native modules.
 * Must be added to the getPackages() list in MainApplication.java.
 */
public class AIPackage implements ReactPackage {

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new TFLiteInferenceModule(reactContext));
        modules.add(new ImageAnalysisModule(reactContext));
        modules.add(new AudioAnalysisModule(reactContext));
        return modules;
    }
}
