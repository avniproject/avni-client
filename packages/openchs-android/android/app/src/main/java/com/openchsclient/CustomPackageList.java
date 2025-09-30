package com.openchsclient;

import android.app.Application;
import android.content.Context;
import android.content.res.Resources;

import com.facebook.react.ReactPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.shell.MainPackageConfig;
import com.facebook.react.shell.MainReactPackage;
import java.util.Arrays;
import java.util.ArrayList;

// High-confidence packages - officially supported with RN 0.81.4 + Android 15
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import com.reactnativecommunity.clipboard.ClipboardPackage;
import com.reactcommunity.rndatetimepicker.RNDateTimePickerPackage;
import com.reactnativecommunity.netinfo.NetInfoPackage;
import io.invertase.firebase.analytics.ReactNativeFirebaseAnalyticsPackage;
import io.invertase.firebase.app.ReactNativeFirebaseAppPackage;
import com.bugsnag.BugsnagReactNative;
import com.learnium.RNDeviceInfo.RNDeviceInfo;
import com.reactnativedocumentpicker.RNDocumentPickerPackage;
import com.rnfs.RNFSPackage;
import com.agontuk.RNFusedLocation.RNFusedLocationPackage;
import com.imagepicker.ImagePickerPackage;
import com.corbt.keepawake.KCKeepAwakePackage;
import com.oblador.keychain.KeychainPackage;
import com.th3rdwave.safeareacontext.SafeAreaContextPackage;
import com.horcrux.svg.SvgPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import io.realm.react.RealmReactPackage;

@SuppressWarnings("deprecation")
public class CustomPackageList {
    private Application application;
    private ReactNativeHost reactNativeHost;
    private MainPackageConfig mConfig;

    public CustomPackageList(ReactNativeHost reactNativeHost) {
        this(reactNativeHost, null);
    }

    public CustomPackageList(Application application) {
        this(application, null);
    }

    public CustomPackageList(ReactNativeHost reactNativeHost, MainPackageConfig config) {
        this.reactNativeHost = reactNativeHost;
        mConfig = config;
    }

    public CustomPackageList(Application application, MainPackageConfig config) {
        this.reactNativeHost = null;
        this.application = application;
        mConfig = config;
    }

    // Simplified - remove methods that cause access issues

    public ArrayList<ReactPackage> getPackages() {
        return new ArrayList<>(Arrays.<ReactPackage>asList(
            new MainReactPackage(mConfig),
            
            // Phase 1: High-confidence packages (officially supported)
            new AsyncStoragePackage(),                           // ✅ Essential data storage
            new ClipboardPackage(),                             // ✅ Clipboard functionality  
            new RNDateTimePickerPackage(),                      // ✅ Date/time picker
            new NetInfoPackage(),                               // ✅ Network status
            new ReactNativeFirebaseAnalyticsPackage(),         // ✅ Firebase analytics
            new ReactNativeFirebaseAppPackage(),               // ✅ Firebase core
            BugsnagReactNative.getPackage(),                    // ✅ Error reporting
            new RNDeviceInfo(),                                 // ✅ Device information
            new RNDocumentPickerPackage(),                      // ✅ Document picker
            new RNFSPackage(),                                  // ✅ File system
            new RNFusedLocationPackage(),                       // ✅ Location services
            new ImagePickerPackage(),                           // ✅ Image picker
            new KCKeepAwakePackage(),                           // ✅ Keep screen awake
            new KeychainPackage(),                              // ✅ Secure storage
            new SafeAreaContextPackage(),                       // ✅ Safe area (Android 15 essential)
            new SvgPackage(),                                   // ✅ SVG support
            new VectorIconsPackage(),                           // ✅ Icon fonts
            new RNCWebViewPackage(),                            // ✅ WebView component
            new RealmReactPackage()                             // ✅ Database
            
            // Phase 2: Will add "verify compatibility" packages incrementally
        ));
    }
}
