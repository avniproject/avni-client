package org.samiksha.tanuh

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/** Runs the shared table of combining cases, which the app's Jest suite also runs through `EdgeModelService`. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class CombineTest {
    private val table = JSONObject(java.io.File(System.getProperty("combining.cases")!!).readText()).getJSONArray("cases")

    private fun number(value: Any?): Double = if (value is String) value.toDouble() else (value as Number).toDouble()

    private fun outcome(fold: JSONObject): FoldOutcome =
        if (fold.has("error")) FoldOutcome.Failed(fold.getString("error"))
        else FoldOutcome.Ok(fold.keys().asSequence().associateWith { key ->
            if (key == "label") fold.getString(key) else number(fold.get(key))
        })

    private fun cases() = (0 until table.length()).map { table.getJSONObject(it) }

    @Test
    fun everyCaseInTheTableGivesItsExpectedVerdict() {
        for (case in cases()) {
            val params = case.getJSONObject("params")
            val folds = (case.getJSONArray("folds") as JSONArray).let { arr -> List(arr.length()) { outcome(arr.getJSONObject(it)) } }
            val verdict = combine(folds, params)
            val expect = case.get("expect")
            val name = case.getString("name")
            if (expect == "throws") {
                assertEquals(name, Verdict.Failed("inference_failed"), verdict)
            } else {
                val positiveLabel = params.optJSONArray("labels")?.getString(1) ?: "Positive"
                val wanted = (expect as JSONObject)
                val answer = verdict as Verdict.Answer
                val wantedLabel = if (wanted.getString("label") == positiveLabel) "Suspicious" else "Non-Suspicious"
                assertEquals(name, wantedLabel, answer.label)
                assertEquals(name, wanted.getDouble("confidence"), answer.score, 1e-9)
            }
        }
    }

    @Test
    fun scoreIsTheLowestFoldAndListsEveryFold() {
        val folds = listOf(0.8, 0.6, 0.9).map { FoldOutcome.Ok(mapOf("label" to "Positive", "confidence" to it, "logit" to 1.0)) }
        val answer = combine(folds, JSONObject()) as Verdict.Answer
        assertEquals(0.6, answer.score, 1e-9)
        assertEquals(listOf(0.8, 0.6, 0.9), answer.folds)
    }

    @Test
    fun suspiciousExactlyWhenScoreIsAtLeastHalf() {
        for (case in cases().filter { it.get("expect") != "throws" }) {
            val folds = case.getJSONArray("folds").let { arr -> List(arr.length()) { outcome(arr.getJSONObject(it)) } }
            val answer = combine(folds, case.getJSONObject("params")) as Verdict.Answer
            assertEquals(case.getString("name"), answer.label == "Suspicious", answer.score >= 0.5)
        }
    }

    @Test
    fun tableHasTheCasesTheSpecNames() {
        val names = cases().map { it.getString("name") }
        for (word in listOf("all three", "negative", "failing", "NaN", "mean-prob", "missing", "custom")) {
            assertTrue("no case mentions '$word'", names.any { it.contains(word) })
        }
    }
}
