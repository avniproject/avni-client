package com.openchsclient;

import android.app.Application;
import android.util.Log;

import com.facebook.react.ReactPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.shell.MainPackageConfig;
import com.facebook.react.shell.MainReactPackage;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

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
        ArrayList<ReactPackage> packages = new ArrayList<>();

        try {
            packages.add(new MainReactPackage(mConfig));

            // Phase 1: High-confidence packages (officially supported)
            packages.add(new AsyncStoragePackage());                           // ✅ Essential data storage
            packages.add(new ClipboardPackage());                             // ✅ Clipboard functionality
            packages.add(new RNDateTimePickerPackage());                      // ✅ Date/time picker
            packages.add(new NetInfoPackage());                               // ✅ Network status
            packages.add(new ReactNativeFirebaseAnalyticsPackage());         // ✅ Firebase analytics
            packages.add(new ReactNativeFirebaseAppPackage());               // ✅ Firebase core
            packages.add(BugsnagReactNative.getPackage());                    // ✅ Error reporting
            packages.add(new RNDeviceInfo());                                 // ✅ Device information
            packages.add(new RNFSPackage());                                  // ✅ File system
            packages.add(new RNFusedLocationPackage());                       // ✅ Location services
            packages.add(new ImagePickerPackage());                           // ✅ Image picker
            packages.add(new KCKeepAwakePackage());                           // ✅ Keep screen awake
            packages.add(new KeychainPackage());                              // ✅ Secure storage
            packages.add(new SafeAreaContextPackage());                       // ✅ Safe area (Android 15 essential)
            packages.add(new SvgPackage());                                   // ✅ SVG support
            packages.add(new VectorIconsPackage());                           // ✅ Icon fonts
            packages.add(new RNCWebViewPackage());                             // ✅ WebView component
            packages.add(new RNDocumentPickerPackage());                             // ✅ WebView component

            /* ============================================
             * TEMPORARILY DISABLED PACKAGES
             * ============================================
             *
             * 1. REALM (realm@20.2.0)
             *    Status: Requires NDK 27.1.12297006
             *    Reason: Prebuilt C++ libraries compiled with NDK 27
             *    Re-enable steps:
             *      - Install NDK 27 via Android Studio SDK Manager
             *      - Uncomment in settings.gradle (line ~61-63)
             *      - Uncomment in app/build.gradle (line ~228)
             *      - Uncomment below: new RealmReactPackage()
             *
             */
            // new RealmReactPackage()        // DISABLED - See above
            Log.i("CustomPackageList", "Successfully loaded " + packages.size() + " packages");
        } catch (Exception e) {
            Log.e("CustomPackageList", "Error loading packages", e);
            throw e;
        }
        return packages;
    }
}
