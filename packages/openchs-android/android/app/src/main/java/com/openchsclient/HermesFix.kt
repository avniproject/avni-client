package com.openchsclient

import com.facebook.soloader.SoLoader

object HermesFix {
    init {
        // Force load merged React Native library first
        try {
            SoLoader.loadLibrary("reactnative")
        } catch (e: UnsatisfiedLinkError) {
            // Already loaded
        }
    }
}
