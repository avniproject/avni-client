package com.openchsclient;

import android.app.Application;
import com.brentvatne.react.ReactVideoPackage;
import com.bugsnag.BugsnagReactNative;
import com.facebook.react.ReactApplication;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.amazonaws.RNAWSCognitoPackage;
import com.jamesisaac.rnbackgroundtask.BackgroundTaskPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.imagepicker.ImagePickerPackage;
import com.rnfs.RNFSPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.github.wuxudong.rncharts.MPAndroidChartPackage;
import com.i18n.reactnativei18n.ReactNativeI18n;
import com.oblador.vectoricons.VectorIconsPackage;
import com.openchsclient.module.RestartPackage;
//import com.openchsclient.module.DeviceInfoPackage;
import io.realm.react.RealmReactPackage;
import com.agontuk.RNFusedLocation.RNFusedLocationPackage;

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
            new RNDeviceInfo(),
                    new BackgroundTaskPackage(),
                    new RNFetchBlobPackage(),
                    new ImagePickerPackage(),
                    new RNFSPackage(),
                    new ReactVideoPackage(),
                    BugsnagReactNative.getPackage(),
                    new MPAndroidChartPackage(),
                    new RNAWSCognitoPackage(),
                    new VectorIconsPackage(),
                    new ReactNativeI18n(),
                    new RealmReactPackage(),
                    new RestartPackage(),
                    new RNFusedLocationPackage()
//                    new DeviceInfoPackage()
            );
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        SoLoader.init(this, /* native exopackage */ false);
        BackgroundTaskPackage.useContext(this);
    }

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }
}
