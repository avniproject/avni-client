package org.samiksha.tanuh

import com.openchsclient.EdgeModelModule
import com.facebook.react.bridge.BridgeReactContext
import java.io.File
import org.json.JSONObject
import org.robolectric.RuntimeEnvironment

/** The app's `EdgeModelModule`, built on Robolectric's application context. Call it inside a Robolectric test. */
fun newEdgeModule(): EdgeModelModule = EdgeModelModule(BridgeReactContext(RuntimeEnvironment.getApplication()))

/**
 * The three folds in a staging folder made by `tools/edge-model/encrypt-model.js`, loaded into
 * the app's module as the app loads them.
 *
 * `stagingDir` holds the encrypted blobs, `manifest.json` and `keys.json`. The folds are ordered by
 * name, `mvit2_fold1_6`, `mvit2_fold1_8`, `mvit2_fold2_8` (`model6`, `model8`, `model8-2`).
 */
class Folds(val module: EdgeModelModule, private val stagingDir: File, private val overrideJson: String) {
    private class Item(val name: String, val sha256: String, val blob: String)

    private val items: List<Item>
    private val keyBySha: JSONObject

    init {
        val manifest = JSONObject(File(stagingDir, "manifest.json").readText()).getJSONArray("items")
        val all = List(manifest.length()) { i ->
            val item = manifest.getJSONObject(i)
            Item(item.getString("name"), item.getString("sha256"), item.getString("blob"))
        }
        items = FOLD_NAMES.map { wanted ->
            all.singleOrNull { it.name == wanted } ?: throw IllegalStateException("manifest.json has no single item named $wanted")
        }
        keyBySha = JSONObject(File(stagingDir, "keys.json").readText())
    }

    /** The folds' `sha256` values in fold order; the app's module knows each fold by it. */
    val keys: List<String> = items.map { it.sha256 }

    /** Loads each fold; throws `PromiseRejected` for the first the module refuses. */
    fun load() {
        for (item in items) {
            val promise = RecordingPromise()
            module.loadEncryptedModelFromFile(
                item.sha256,
                File(stagingDir, item.blob).absolutePath,
                keyBySha.getString(item.sha256),
                item.sha256,
                overrideJson,
                promise,
            )
            promise.await()
        }
    }

    companion object {
        val FOLD_NAMES = listOf("mvit2_fold1_6", "mvit2_fold1_8", "mvit2_fold2_8")
    }
}
