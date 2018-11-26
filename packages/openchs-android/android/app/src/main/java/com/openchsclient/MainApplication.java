package com.openchsclient;

import android.app.Application;
import android.util.Log;

import com.facebook.react.ReactApplication;
import com.brentvatne.react.ReactVideoPackage;
import com.bugsnag.BugsnagReactNative;
import com.github.wuxudong.rncharts.MPAndroidChartPackage;
import com.lugg.ReactNativeConfig.ReactNativeConfigPackage;
import com.airlabsinc.RNAWSCognitoPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.i18n.reactnativei18n.ReactNativeI18n;
import com.openchsclient.module.RestartPackage;
import io.realm.react.RealmReactPackage;
import com.facebook.soloader.SoLoader;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

    private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
            return Arrays.<ReactPackage>asList(
                    new MainReactPackage(),
            new ReactVideoPackage(),
                    BugsnagReactNative.getPackage(),
                    new MPAndroidChartPackage(),
                    new ReactNativeConfigPackage(),
                    new RNAWSCognitoPackage(),
                    new VectorIconsPackage(),
                    new ReactNativeI18n(),
                    new RealmReactPackage(),
                    new RestartPackage()
            );
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        SoLoader.init(this, /* native exopackage */ false);
    }

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }
}
