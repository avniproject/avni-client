package com.openchsclient.module;
//Credits: https://www.qed42.com/insights/coe/javascript/react-native-endless-background-process
import android.content.Intent;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import javax.annotation.Nonnull;

public class BackgroundJobModule extends ReactContextBaseJavaModule {

    private static ReactApplicationContext reactContext;

    public BackgroundJobModule(@Nonnull ReactApplicationContext reactContext) {
        super(reactContext);
        BackgroundJobModule.reactContext = reactContext;
    }

    @Nonnull
    @Override
    public String getName() {
        return "AvniBackgroundJob";
    }

    @ReactMethod
    public void startService() {
        reactContext.startService(new Intent(reactContext, BackgroundJobService.class));
    }

    @ReactMethod
    public void stopService() {
        reactContext.stopService(new Intent(reactContext, BackgroundJobService.class));
    }

}
