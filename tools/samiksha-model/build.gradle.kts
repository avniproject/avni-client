import java.util.zip.ZipFile

plugins {
    kotlin("jvm") version "2.0.21"   // the app's Kotlin version
    application
}

val reactNativeVersion = "0.77.3"    // the app's React Native version
val onnxRuntimeVersion = "1.22.0"    // the app's ONNX Runtime version
val robolectricVersion = "4.18-beta-1"   // TODO: move to 4.18 once released (4.17 has no linux/aarch64 native runtime)
val nativeRuntimeVersion = "1.0.20"  // 4.18 asks for 1.0.20; 4.17 asked for 1.0.19, which has no linux/aarch64 library
val androidAllVersion = "16-robolectric-13921718-2-i7"   // Android 16, API 36

val appDir = file("../../packages/openchs-android/android/app/src/main/java/com/openchsclient")
val appFiles = listOf(
    "EdgeModelModule.kt",
    "ImageDecoding.kt",
    "ModelContract.kt",
    "preprocessing/ImagePreprocessor.kt",
    "preprocessing/Preprocessors.kt",
    "preprocessing/PixelOps.kt",
    "engine/InferenceEngine.kt",
    "engine/OnnxEngine.kt",
    "decoding/OutputDecoder.kt",
    "decoding/Decoders.kt",
)

repositories {
    mavenCentral()
    google()
}

kotlin { jvmToolchain(21) }   // Robolectric needs Java 21 for Android 16

sourceSets.main {
    kotlin {
        srcDir(appDir)
        // The app folder holds more files than the container runs; only the listed ones are compiled.
        include("org/samiksha/**", "com/openchsclient/BuildConfig.kt")
        appFiles.forEach { include(it) }
    }
}

val androidArchives by configurations.creating { isTransitive = false }

dependencies {
    androidArchives("com.facebook.react:react-android:$reactNativeVersion:release@aar")
    androidArchives("androidx.test:monitor:1.8.0@aar")                    // Robolectric's own, published as an archive
    androidArchives("androidx.test.espresso:espresso-idling-resource:3.7.0@aar")
    compileOnly("org.robolectric:android-all:16-robolectric-13921718")
    testCompileOnly("org.robolectric:android-all:16-robolectric-13921718")
    runtimeOnly("com.google.android:android:4.1.1.4")   // lets JUnit read Robolectric annotations outside the sandbox
    implementation(fileTree(layout.buildDirectory.dir("android-archives")) { include("*.jar"); builtBy("extractAndroidArchives") })
    implementation("com.microsoft.onnxruntime:onnxruntime:$onnxRuntimeVersion")
    implementation("androidx.annotation:annotation:1.9.1")
    implementation("com.facebook.infer.annotation:infer-annotation:0.18.0")   // the libraries React Native's classes load
    implementation("com.facebook.yoga:proguard-annotations:1.19.0")
    implementation("javax.inject:javax.inject:1")
    implementation("com.google.code.findbugs:jsr305:3.0.2")
    implementation("org.robolectric:robolectric:$robolectricVersion")
    implementation("org.robolectric:nativeruntime-dist-compat:$nativeRuntimeVersion")
    implementation("junit:junit:4.13.2")
    testImplementation(kotlin("test"))
}

// React Native and two of Robolectric's libraries ship as Android archives; their Java classes are in
// `classes.jar` inside each.
val extractAndroidArchives by tasks.registering {
    val archives = androidArchives
    val out = layout.buildDirectory.dir("android-archives")
    inputs.files(archives)
    outputs.dir(out)
    doLast {
        out.get().asFile.mkdirs()
        archives.files.forEach { aar ->
            ZipFile(aar).use { zip ->
                zip.getInputStream(zip.getEntry("classes.jar")).use { input ->
                    out.get().file(aar.nameWithoutExtension + ".jar").asFile.outputStream().use { input.copyTo(it) }
                }
            }
        }
    }
}
tasks.named("compileKotlin") { dependsOn(extractAndroidArchives) }

// Robolectric's Android framework jar for API 36, copied to a folder the container reads offline.
val robolectricDeps by configurations.creating { isTransitive = false }
dependencies {
    robolectricDeps("org.robolectric:android-all-instrumented:$androidAllVersion")
}
val copyRobolectricDeps by tasks.registering(Sync::class) {
    from(robolectricDeps)
    into(layout.buildDirectory.dir("robolectric"))
}

// Robolectric reads parts of the JDK that Java 21 closes unless they are opened.
val robolectricJvmArgs = listOf(
    "--add-exports=java.base/jdk.internal.access=ALL-UNNAMED",
) + listOf(
    "java.lang", "java.lang.reflect", "java.io", "java.net", "java.nio", "java.security", "java.text", "java.time",
    "java.util", "java.util.concurrent", "java.util.concurrent.atomic", "java.util.regex", "java.util.jar",
    "sun.nio.ch", "sun.security.util",
).map { "--add-opens=java.base/$it=ALL-UNNAMED" }

val stagingDir = layout.buildDirectory.dir("dummy-staging")
val stageDummyFolds by tasks.registering(Exec::class) {
    description = "Writes the dummy folds, encrypts them with the app's encrypt-model.js and writes test images."
    val script = file("stage-dummy-folds.sh")
    inputs.files(script, "make_dummy_folds.py", "tests/images.py", "tests/write_test_images.py", "../edge-model/encrypt-model.js", "../edge-model/tanuh-ensemble-override.json")
    outputs.dir(stagingDir)
    commandLine("bash", script.absolutePath, stagingDir.get().asFile.absolutePath)
}

tasks.test {
    dependsOn(stageDummyFolds, copyRobolectricDeps)
    systemProperty("dummy.staging", stagingDir.get().asFile.absolutePath)
    systemProperty("robolectric.offline", "true")
    systemProperty("robolectric.dependency.dir", layout.buildDirectory.dir("robolectric").get().asFile.absolutePath)
    systemProperty("override.json", file("../edge-model/tanuh-ensemble-override.json").absolutePath)
    systemProperty("combining.cases", file("combining-cases.json").absolutePath)
    maxHeapSize = "2g"
    jvmArgs(robolectricJvmArgs)
    testLogging { events("failed", "passed"); exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL; showStandardStreams = false }
}

// The start script runs `Main` through JUnit, as Robolectric is built to run inside a JUnit runner:
// `bin/samiksha-model org.samiksha.tanuh.Main`.
application {
    mainClass.set("org.junit.runner.JUnitCore")
    applicationDefaultJvmArgs = robolectricJvmArgs
}
