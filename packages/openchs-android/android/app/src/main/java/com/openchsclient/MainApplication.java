package com.openchsclient;

import android.app.Application;

import com.brentvatne.react.ReactVideoPackage;
import com.bugsnag.BugsnagReactNative;
import com.facebook.react.ReactApplication;
import com.ocetnik.timer.BackgroundTimerPackage;
import com.vinzscam.reactnativefileviewer.RNFileViewerPackage;
import com.corbt.keepawake.KCKeepAwakePackage;
import com.rnziparchive.RNZipArchivePackage;
import io.invertase.firebase.analytics.ReactNativeFirebaseAnalyticsPackage;
import io.invertase.firebase.app.ReactNativeFirebaseAppPackage;
import com.github.wumke.RNImmediatePhoneCall.RNImmediatePhoneCallPackage;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.amazonaws.RNAWSCognitoPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.imagepicker.ImagePickerPackage;
import com.rnfs.RNFSPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;

import android.content.Context;
import android.util.Log;

import com.facebook.react.*;
import com.facebook.soloader.SoLoader;

import java.lang.reflect.InvocationTargetException;
import java.util.List;
import java.lang.ClassLoader;

public class MainApplication extends Application implements ReactApplication {

    private final ReactNativeHost mReactNativeHost = new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
            List<ReactPackage> packages = new PackageList(this).getPackages();
            // for some reason, checking for the class in a separate method is throwing ClassNotFoundException,
            // so moved it here
            try {
                Class<?> aClass = Class.forName("com.openchsclient.TamperCheckPackage");
                ReactPackage tamperCheckPackage = (ReactPackage) aClass.newInstance();
                if (tamperCheckPackage != null) packages.add(tamperCheckPackage);
            } catch(Exception e) {
                Log.i("MainApplication", e.toString());
            }
            finally {
                return packages;
            }
        }

        @Override
        protected boolean isNewArchEnabled() {
            return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }

        @Override
        protected Boolean isHermesEnabled() {
            return BuildConfig.IS_HERMES_ENABLED;
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        SoLoader.init(this, /* native exopackage */ false);
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            DefaultNewArchitectureEntryPoint.load();
        }
        ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
    }

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

}
