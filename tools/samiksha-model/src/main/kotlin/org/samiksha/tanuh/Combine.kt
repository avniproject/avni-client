package org.samiksha.tanuh

import org.json.JSONObject

/** What one fold gave back for an image: its decoded values, or the message it was rejected with. */
sealed interface FoldOutcome {
    data class Ok(val values: Map<String, Any?>) : FoldOutcome
    data class Failed(val message: String) : FoldOutcome
}

/** The container's answer for an image: a verdict with its score, or the failure code to return. */
sealed interface Verdict {
    data class Answer(val label: String, val score: Double, val folds: List<Double>) : Verdict
    data class Failed(val code: String) : Verdict
}

/**
 * Combines the folds' results as `EdgeModelService.runEnsembleInferenceOnImage` does: the image is positive
 * (`Suspicious`) only when every fold decoded `labels[1]`, and the score is the weakest fold's confidence.
 * `params` is the decoder's `output.params` from the override; `combine` defaults to `unanimous-and` and
 * `labels` to `["Negative", "Positive"]`. A fold that failed, a logit that is not a finite number, or any
 * other `combine` gives `Verdict.Failed("inference_failed")`, as the app throws in those cases.
 */
fun combine(folds: List<FoldOutcome>, params: JSONObject): Verdict {
    if (params.optString("combine", "unanimous-and") != "unanimous-and") return Verdict.Failed("inference_failed")
    val labels = params.optJSONArray("labels")?.let { List(it.length()) { i -> it.getString(i) } } ?: listOf("Negative", "Positive")
    val results = folds.map { (it as? FoldOutcome.Ok)?.values ?: return Verdict.Failed("inference_failed") }
    if (results.any { (it["logit"] as? Number)?.toDouble()?.isFinite() != true }) return Verdict.Failed("inference_failed")
    val positive = results.all { it["label"] == labels[1] }
    val confidences = results.map { (it["confidence"] as Number).toDouble() }
    return Verdict.Answer(if (positive) "Suspicious" else "Non-Suspicious", confidences.min(), confidences)
}
