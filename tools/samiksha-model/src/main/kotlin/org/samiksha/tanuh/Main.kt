package org.samiksha.tanuh

import java.io.File
import java.util.concurrent.CountDownLatch
import org.json.JSONObject
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * The container's entry point. Robolectric runs inside a JUnit runner, so the container starts this class
 * with JUnit (`bin/samiksha-model org.samiksha.tanuh.Main`): the one test loads the folds, starts the
 * server and waits until the process is stopped.
 *
 * Settings come from the environment: `FOLDS_DIR` (default `/folds`), `OVERRIDE_JSON` (default
 * `/app/override.json`), `PORT` (default `8080`) and `MODEL_VERSION` (default `unknown`).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36], shadows = [ShadowArguments::class])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class Main {
    @Test
    fun serve() {
        val foldsDir = File(System.getenv("FOLDS_DIR") ?: "/folds")
        val overrideJson = File(System.getenv("OVERRIDE_JSON") ?: "/app/override.json").readText()
        val started = System.nanoTime()
        val folds = Folds(newEdgeModule(), foldsDir, overrideJson)
        folds.load()
        val params = JSONObject(overrideJson).getJSONObject("output").getJSONObject("params")
        val tempDir = java.nio.file.Files.createTempDirectory("predict").toFile()
        val predictor = Predictor(folds.module, folds.keys, params, tempDir)
        val info = mapOf<String, Any>("name" to "tanuh-oral-mvit2", "version" to (System.getenv("MODEL_VERSION") ?: "unknown"), "folds" to folds.keys.size)
        val server = Server((System.getenv("PORT") ?: "8080").toInt(), predictor::predict, info)
        server.start()
        println("samiksha-model: ${folds.keys.size} folds loaded in ${(System.nanoTime() - started) / 1_000_000} ms; serving on port ${server.port}")
        CountDownLatch(1).await()
    }
}
