package com.openchsclient;

import android.app.Application;
import android.content.Context;
import com.facebook.react.*;
import com.facebook.soloader.SoLoader;

import java.lang.reflect.InvocationTargetException;
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
        initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
    }

    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    private static void initializeFlipper(
            Context context, ReactInstanceManager reactInstanceManager) {
        if (BuildConfig.DEBUG) {
            try {
        /*
         We use reflection here to pick up the class that initializes
         Flipper, since Flipper library is not available in release mode
        */
                Class<?> aClass = Class.forName("com.openchsclient.tools.ReactNativeFlipper");
                aClass
                        .getMethod("initializeFlipper", Context.class, ReactInstanceManager.class)
                        .invoke(null, context, reactInstanceManager);
            } catch (ClassNotFoundException e) {
                e.printStackTrace();
            } catch (NoSuchMethodException e) {
                e.printStackTrace();
            } catch (IllegalAccessException e) {
                e.printStackTrace();
            } catch (InvocationTargetException e) {
                e.printStackTrace();
            }
        }
    }
}
