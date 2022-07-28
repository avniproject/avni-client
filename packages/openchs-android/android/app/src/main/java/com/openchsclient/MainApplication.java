package com.openchsclient;

import com.facebook.react.PackageList;
import android.app.Application;
import com.brentvatne.react.ReactVideoPackage;
import com.bugsnag.BugsnagReactNative;
import com.facebook.react.ReactApplication;
import com.ocetnik.timer.BackgroundTimerPackage;
import com.vinzscam.reactnativefileviewer.RNFileViewerPackage;
import com.corbt.keepawake.KCKeepAwakePackage;
import com.dooboolab.audiorecorderplayer.RNAudioRecorderPlayerPackage;
import com.reactnativedocumentpicker.DocumentPickerPackage;
import com.rnziparchive.RNZipArchivePackage;
import com.pilloxa.backgroundjob.BackgroundJobPackage;
import io.invertase.firebase.analytics.ReactNativeFirebaseAnalyticsPackage;
import io.invertase.firebase.app.ReactNativeFirebaseAppPackage;
import com.github.wumke.RNImmediatePhoneCall.RNImmediatePhoneCallPackage;
//import com.microsoft.codepush.react.CodePush;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.amazonaws.RNAWSCognitoPackage;
import com.RNFetchBlob.RNFetchBlobPackage;
import com.imagepicker.ImagePickerPackage;
import com.rnfs.RNFSPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.github.wuxudong.rncharts.MPAndroidChartPackage;
//import com.AlexanderZaytsev.RNI18n.RNI18nPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.openchsclient.module.RestartPackage;
//import com.openchsclient.module.DeviceInfoPackage;
import com.agontuk.RNFusedLocation.RNFusedLocationPackage;
import com.reactnativecommunity.webview.RNCWebViewPackage;

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
            List<ReactPackage> packages = new PackageList(this).getPackages();
//            packages.add(new ReactNativeFirebaseAnalyticsPackage());
//            packages.add(new ReactNativeFirebaseAppPackage());
            return packages;
//            return Arrays.<ReactPackage>asList(
//                    new MainReactPackage(),
//            new BackgroundTimerPackage(),
//            new RNFileViewerPackage(),
//            new KCKeepAwakePackage(),
//            new RNAudioRecorderPlayerPackage(),
//            new DocumentPickerPackage(),
//            new RNZipArchivePackage(),
//            new BackgroundJobPackage(),
//            new ReactNativeFirebaseAppPackage(),
//            new RNImmediatePhoneCallPackage(),
//            new CodePush(getResources().getString(R.string.reactNativeCodePush_androidDeploymentKey), getApplicationContext(), BuildConfig.DEBUG),
//            new RNDeviceInfo(),
//                    new RNFetchBlobPackage(),
//                    new ImagePickerPackage(),
//                    new RNFSPackage(),
//                    new ReactVideoPackage(),
//                    BugsnagReactNative.getPackage(),
//                    new MPAndroidChartPackage(),
//                    new RNAWSCognitoPackage(),
//                    new VectorIconsPackage(),
////                    new RNI18nPackage(),
//                    new RestartPackage(),
//                    new RNFusedLocationPackage(),
//                    new RNCWebViewPackage()
////                    new DeviceInfoPackage()
//            );
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
