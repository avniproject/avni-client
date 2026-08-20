package com.openchsclient.camera

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Registers CameraModule with React Native. TANUH-ONLY (src/tanuh) — mirrors the existing
 * TamperCheckPackage pattern (src/common/java/com/openchsclient/TamperCheckPackage.java):
 * MainApplication.getPackages() resolves this class reflectively via Class.forName(), inside a
 * try/catch, so its absence on any other flavour's classpath is silently tolerated at runtime —
 * no compile-time reference to it exists outside this flavour's own source set.
 */
class CameraPackage : ReactPackage {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(CameraModule(reactContext))
}
