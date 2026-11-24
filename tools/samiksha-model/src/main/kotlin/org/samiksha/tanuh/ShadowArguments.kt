package org.samiksha.tanuh

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements

/**
 * Makes React Native's `Arguments` build plain-Java maps and arrays.
 *
 * Its own `createMap` and `createArray` need React Native's native library, which a plain JVM does
 * not have. `JavaOnlyMap` and `JavaOnlyArray` hold the same data in Java.
 */
@Implements(Arguments::class)
class ShadowArguments {
    companion object {
        @JvmStatic
        @Implementation
        fun createMap(): WritableMap = JavaOnlyMap()

        @JvmStatic
        @Implementation
        fun createArray(): WritableArray = JavaOnlyArray()
    }
}
