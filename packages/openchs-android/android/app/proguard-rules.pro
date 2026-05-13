# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

#https://github.com/realm/realm-js/issues/2391#issuecomment-506573272
-keep class io.realm.react.**
-keep public class com.horcrux.svg.** {*;}
#-keep class com.facebook.hermes.unicode.** { *; }
#-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keepnames public class com.openchsclient.TamperCheckPackage implements com.facebook.react.ReactPackage

# ── Edge-model (PyTorch Mobile) ────────────────────────────────────────────────────
# libpytorch_jni.so resolves Java class + method references by name through JNI.
# If R8 renames any of these, calls into Module.forward / Tensor.fromBlob throw
# NoSuchMethodError / NoClassDefFoundError at inference time. Debug works because
# R8 is disabled there. See ~/.claude/plans/composed-tumbling-bachman.md.
-keep class org.pytorch.** { *; }
-keepclassmembers class org.pytorch.** { *; }
-keep class com.facebook.fbjni.** { *; }
-keepclassmembers class com.facebook.fbjni.** { *; }

# Our own native bridge + plugin registries — looked up by string name in
# Preprocessors.REGISTRY / Decoders.REGISTRY at runtime. Keep classes and members
# so the Kotlin object singletons survive R8 and JNI metadata stays intact.
-keep class com.openchsclient.EdgeModelModule { *; }
-keep class com.openchsclient.ModelContract { *; }
-keep class com.openchsclient.ModelContract$Companion { *; }
-keep class com.openchsclient.engine.** { *; }
-keep class com.openchsclient.preprocessing.** { *; }
-keep class com.openchsclient.decoding.** { *; }
