package com.openchsclient;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.openchsclient.clinicsharing.ClinicHubModule;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ConfigPackage implements ReactPackage {

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new ConfigModule(reactContext));
        modules.add(new BugsnagInitializer(reactContext));
        modules.add(new EdgeModelModule(reactContext));
        modules.add(new ClinicHubWifiModule(reactContext));
        modules.add(new ClinicHubModule(reactContext));
        return modules;
    }
}
