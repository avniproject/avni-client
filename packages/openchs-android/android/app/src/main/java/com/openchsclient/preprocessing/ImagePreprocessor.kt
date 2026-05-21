package com.openchsclient.preprocessing

import android.graphics.Bitmap
import org.json.JSONObject

/**
 * Engine-agnostic image preprocessing plugin (~/.claude/plans/composed-tumbling-bachman.md).
 *
 * Each implementation captures one *family* of preprocessing pipelines (e.g. ImageNet-style
 * mean/std normalisation, or a custom domain pipeline like the PoC's mean-128 / BGR / round-1dp).
 * The exact behaviour for a given model is dialled in by the `params` JSON object in the
 * registry override — the preprocessor itself is reusable across models that share the family.
 *
 * Adding a new pipeline = drop a new class implementing this interface and register it in
 * `Preprocessors.REGISTRY` by name. **No edits to `EdgeModelModule.kt`.**
 */
interface ImagePreprocessor {
    /** A flat, channel-first or channel-last `FloatArray` plus the tensor shape (e.g. [1,3,256,256]). */
    data class Result(val data: FloatArray, val shape: LongArray)

    fun preprocess(bitmap: Bitmap, params: JSONObject): Result
}
