package com.openchsclient

import org.json.JSONObject

/**
 * Resolved per-model contract (~/.claude/plans/composed-tumbling-bachman.md).
 *
 * Why this class exists
 * ─────────────────────
 * The bridge (`EdgeModelModule`) is engine-agnostic and model-agnostic. Per-model semantics —
 * which inference engine to use, how to preprocess the image, how to decode the output — live
 * in the registry's `override` block as a small declarative DSL. This class parses that DSL.
 *
 * Schema (`assets/models/registry.json` → models.<key>.override):
 *
 *   {
 *     "engine": "pytorch",
 *     "input":  { "preprocessor": "<name>", "params": { ... } },
 *     "output": { "decoder":      "<name>", "params": { ... } }
 *   }
 *
 * Plugin names resolve against `Preprocessors.REGISTRY` and `Decoders.REGISTRY` at runtime; the
 * params blocks are passed verbatim to the plugin so each plugin owns its own parameter shape.
 *
 * The DSL is **pure data** — no executable code. Adding a new model with novel preprocessing
 * means dropping a new Kotlin class into the relevant registry, never editing the bridge.
 */
data class ModelContract(
    val engine: String,
    val preprocessorName: String,
    val preprocessorParams: JSONObject,
    val decoderName: String,
    val decoderParams: JSONObject
) {
    companion object {
        /**
         * Parse the override JSON. The override is **mandatory** in this iteration —
         * unlike the previous TFLite-metadata-with-fallback path, every model must declare
         * its engine + preprocessor + decoder explicitly so behaviour is auditable from JSON alone.
         */
        fun parse(overrideJson: String?): ModelContract {
            if (overrideJson.isNullOrBlank()) {
                throw IllegalStateException(
                    "registry.json must include an 'override' block describing engine, preprocessor, and decoder. " +
                    "See tools/edge-model/sample-override.json."
                )
            }
            val root = JSONObject(overrideJson)
            val engine = root.optString("engine", "").ifBlank {
                throw IllegalStateException("override is missing 'engine' (e.g., \"pytorch\")")
            }
            val input = root.optJSONObject("input")
                ?: throw IllegalStateException("override is missing 'input' block")
            val output = root.optJSONObject("output")
                ?: throw IllegalStateException("override is missing 'output' block")

            val preprocessorName = input.optString("preprocessor", "").ifBlank {
                throw IllegalStateException("override.input is missing 'preprocessor' name")
            }
            val decoderName = output.optString("decoder", "").ifBlank {
                throw IllegalStateException("override.output is missing 'decoder' name")
            }

            return ModelContract(
                engine = engine,
                preprocessorName = preprocessorName,
                preprocessorParams = input.optJSONObject("params") ?: JSONObject(),
                decoderName = decoderName,
                decoderParams = output.optJSONObject("params") ?: JSONObject()
            )
        }
    }
}
