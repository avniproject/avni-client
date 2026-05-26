package com.openchsclient.decoding

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.exp

/**
 * Named registry of output decoders (~/.claude/plans/composed-tumbling-bachman.md).
 *
 * Lookup is by string identifier in the registry override JSON:
 *
 *   "output": { "decoder": "<name>", "params": { ... } }
 *
 * Three implementations ship initially:
 *
 *   • `argmax-labels`  — softmax-style classification (argmax over logits + label lookup).
 *   • `sigmoid-binary` — single-logit binary classification (PoC's path).
 *   • `raw-floats`     — pass-through; caller post-processes in JS.
 *
 * Adding a new decoder = write a new class implementing `OutputDecoder`, add it to `REGISTRY`.
 */
object Decoders {
    val REGISTRY: Map<String, OutputDecoder> = mapOf(
        "argmax-labels"  to ArgmaxLabelsDecoder,
        "sigmoid-binary" to SigmoidBinaryDecoder,
        "raw-floats"     to RawFloatsDecoder
    )

    fun resolve(name: String): OutputDecoder =
        REGISTRY[name] ?: throw IllegalArgumentException(
            "Unknown decoder '$name'. Known: ${REGISTRY.keys}. " +
            "Add a new OutputDecoder and register it in Decoders.REGISTRY."
        )
}

private fun JSONObject.optStringList(key: String): List<String>? {
    val arr: JSONArray = optJSONArray(key) ?: return null
    return List(arr.length()) { i -> arr.getString(i) }
}

private fun FloatArray.toWritableArray(): WritableArray {
    val out = Arguments.createArray()
    for (v in this) out.pushDouble(v.toDouble())
    return out
}

/* ── argmax-labels ────────────────────────────────────────────────────────────────── */

/**
 * Multi-class classification. Picks the class with the highest score and returns its label.
 * Confidence is the softmax probability of the picked class. Params:
 *
 *   { "labels": ["cat", "dog", ...] }   // length must match output[0..N-1]
 */
object ArgmaxLabelsDecoder : OutputDecoder {
    override fun decode(output: FloatArray, shape: LongArray, params: JSONObject): WritableMap {
        val labels = params.optStringList("labels")
        var maxIdx = 0
        var maxVal = output[0]
        for (i in 1 until output.size) if (output[i] > maxVal) { maxVal = output[i]; maxIdx = i }

        // Numerically stable softmax.
        var sum = 0.0
        for (v in output) sum += exp((v - maxVal).toDouble())
        val confidence = (1.0 / sum).toFloat()

        val map = Arguments.createMap()
        map.putString("label", labels?.getOrNull(maxIdx) ?: maxIdx.toString())
        map.putDouble("confidence", confidence.toDouble())
        map.putInt("classIndex", maxIdx)
        map.putArray("raw", output.toWritableArray())
        return map
    }
}

/* ── sigmoid-binary ───────────────────────────────────────────────────────────────── */

/**
 * Single-logit binary classification — exactly the PoC's path:
 *
 *   probability = 1 / (1 + exp(-logit))
 *   label = labels[1] if probability > threshold else labels[0]
 *
 * Params:
 *
 *   {
 *     "threshold": 0.5,
 *     "labels": ["Negative", "Positive"]   // [negative, positive]
 *   }
 */
object SigmoidBinaryDecoder : OutputDecoder {
    override fun decode(output: FloatArray, shape: LongArray, params: JSONObject): WritableMap {
        if (output.isEmpty()) throw IllegalStateException("sigmoid-binary decoder received empty output")
        val logit = output[0]
        val probability = (1.0 / (1.0 + exp(-logit.toDouble()))).toFloat()
        val threshold = params.optDouble("threshold", 0.5).toFloat()
        val labels = params.optStringList("labels") ?: listOf("Negative", "Positive")

        val map = Arguments.createMap()
        map.putString("label", if (probability > threshold) labels.getOrElse(1) { "Positive" } else labels.getOrElse(0) { "Negative" })
        map.putDouble("confidence", probability.toDouble())
        map.putDouble("logit", logit.toDouble())
        map.putDouble("threshold", threshold.toDouble())
        map.putArray("raw", output.toWritableArray())
        return map
    }
}

/* ── raw-floats ───────────────────────────────────────────────────────────────────── */

/**
 * Pass-through. Returns the raw output as `raw: number[]`; caller does any post-processing.
 * Use this for regression heads, multi-label outputs, or any model whose output semantics
 * don't fit a named decoder.
 */
object RawFloatsDecoder : OutputDecoder {
    override fun decode(output: FloatArray, shape: LongArray, params: JSONObject): WritableMap {
        val map = Arguments.createMap()
        map.putArray("raw", output.toWritableArray())
        val shapeArr = Arguments.createArray()
        for (d in shape) shapeArr.pushInt(d.toInt())
        map.putArray("shape", shapeArr)
        return map
    }
}
