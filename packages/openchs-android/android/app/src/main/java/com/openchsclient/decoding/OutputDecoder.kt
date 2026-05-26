package com.openchsclient.decoding

import com.facebook.react.bridge.WritableMap
import org.json.JSONObject

/**
 * Engine-agnostic output-tensor decoder plugin (~/.claude/plans/composed-tumbling-bachman.md).
 *
 * Each implementation captures one *family* of post-processing — argmax classification,
 * sigmoid binary, regression pass-through, etc. The exact behaviour for a given model is
 * dialled in by the `params` JSON object in the registry override.
 *
 * The decoder is the only piece of native code that decides what JS sees in the result map.
 * Adding a new post-processing variant = drop a new class implementing this interface and
 * register it in `Decoders.REGISTRY` by name. **No edits to `EdgeModelModule.kt`.**
 */
interface OutputDecoder {
    fun decode(output: FloatArray, shape: LongArray, params: JSONObject): WritableMap
}
