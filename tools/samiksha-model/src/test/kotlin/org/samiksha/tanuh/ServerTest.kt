package org.samiksha.tanuh

import java.io.File
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.util.Base64
import java.util.concurrent.Executors
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** The HTTP service over the real folds on Robolectric, and over stand-in predict functions for the failure answers. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36], shadows = [ShadowArguments::class])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class ServerTest {
    private val staging = File(System.getProperty("dummy.staging")!!)
    private val overrideJson = File(System.getProperty("override.json")!!).readText()
    private val info = mapOf<String, Any>("name" to "tanuh-oral-mvit2", "version" to "0.2.0-test", "folds" to 3)
    private val client = HttpClient.newHttpClient()
    private val servers = mutableListOf<Server>()
    private lateinit var tempDir: File
    private lateinit var predictor: Predictor

    @Before
    fun loadFolds() {
        tempDir = java.nio.file.Files.createTempDirectory("predict").toFile()
        val folds = Folds(newEdgeModule(), staging, overrideJson)
        folds.load()
        predictor = Predictor(folds.module, folds.keys, JSONObject(overrideJson).getJSONObject("output").getJSONObject("params"), tempDir)
    }

    @After
    fun stopServers() = servers.forEach { it.stop() }

    private fun start(predict: (ByteArray) -> Verdict): Server = Server(0, predict, info).also { it.start(); servers.add(it) }

    private fun get(server: Server, path: String): HttpResponse<String> =
        client.send(HttpRequest.newBuilder(URI("http://127.0.0.1:${server.port}$path")).build(), HttpResponse.BodyHandlers.ofString())

    private fun post(server: Server, body: String): HttpResponse<String> =
        client.send(
            HttpRequest.newBuilder(URI("http://127.0.0.1:${server.port}/predict")).POST(HttpRequest.BodyPublishers.ofString(body)).build(),
            HttpResponse.BodyHandlers.ofString(),
        )

    private fun request(id: String, image: String) =
        JSONObject().put("request_id", id).put("image", Base64.getEncoder().encodeToString(File(staging, "images/$image").readBytes())).toString()

    @Test
    fun health200AfterLoad() {
        assertEquals(200, get(start(predictor::predict), "/health").statusCode())
    }

    @Test
    fun infoAnswer() {
        val body = JSONObject(get(start(predictor::predict), "/info").body())
        assertEquals("tanuh-oral-mvit2", body.getString("name"))
        assertEquals("0.2.0-test", body.getString("version"))
        assertEquals(3, body.getInt("folds"))
    }

    @Test
    fun predictAnswerShape() {
        val server = start(predictor::predict)
        for (image in listOf("plain.jpg", "pale.jpg")) {
            val response = post(server, request("r-$image", image))
            assertEquals(200, response.statusCode())
            val body = JSONObject(response.body())
            assertEquals("r-$image", body.getString("request_id"))
            val folds = body.getJSONArray("folds").let { a -> List(a.length()) { a.getDouble(it) } }
            assertEquals(3, folds.size)
            assertEquals(folds.min(), body.getDouble("score"), 1e-12)
            assertEquals(body.getDouble("score") >= 0.5, body.getString("label") == "Suspicious")
            assertTrue(body.getString("label") in listOf("Suspicious", "Non-Suspicious"))
        }
        assertEquals("Suspicious", JSONObject(post(server, request("a", "pale.jpg")).body()).getString("label"))
        assertEquals("Non-Suspicious", JSONObject(post(server, request("b", "plain.jpg")).body()).getString("label"))
    }

    @Test
    fun garbageIs422UnreadableImage() {
        val response = post(start(predictor::predict), request("g1", "garbage.jpg"))
        assertEquals(422, response.statusCode())
        val body = JSONObject(response.body())
        assertEquals("g1", body.getString("request_id"))
        assertEquals("unreadable_image", body.getString("error"))
    }

    @Test
    fun nanFoldIs422InferenceFailed() {
        val nanFold = FoldOutcome.Ok(mapOf("label" to "Negative", "confidence" to Double.NaN, "logit" to Double.NaN))
        val ok = FoldOutcome.Ok(mapOf("label" to "Positive", "confidence" to 0.9, "logit" to 2.0))
        val server = start { combine(listOf(ok, nanFold, ok), JSONObject()) }
        val response = post(server, request("n1", "plain.jpg"))
        assertEquals(422, response.statusCode())
        assertEquals("inference_failed", JSONObject(response.body()).getString("error"))
    }

    @Test
    fun errorInPredictIs422InferenceFailed() {
        val response = post(start { throw OutOfMemoryError("test") }, request("e1", "plain.jpg"))
        assertEquals(422, response.statusCode())
        val body = JSONObject(response.body())
        assertEquals("e1", body.getString("request_id"))
        assertEquals("inference_failed", body.getString("error"))
    }

    @Test
    fun twoRequestsAtOnceBothAnswered() {
        val server = start(predictor::predict)
        val pool = Executors.newFixedThreadPool(2)
        val answers = listOf("pale.jpg", "plain.jpg").map { image -> pool.submit<HttpResponse<String>> { post(server, request(image, image)) } }.map { it.get() }
        pool.shutdown()
        assertEquals(listOf(200, 200), answers.map { it.statusCode() })
        assertEquals(listOf("pale.jpg", "plain.jpg"), answers.map { JSONObject(it.body()).getString("request_id") })
    }

    @Test
    fun tempFileDeletedAfterRequest() {
        val server = start(predictor::predict)
        post(server, request("t1", "plain.jpg"))
        post(server, request("t2", "garbage.jpg"))
        assertEquals(emptyList<String>(), tempDir.list()!!.toList())
    }

    @Test
    fun badJsonIs400() {
        val server = start(predictor::predict)
        assertEquals(400, post(server, "not json").statusCode())
        assertEquals(400, post(server, """{"request_id": "x"}""").statusCode())
        assertEquals(400, post(server, """{"request_id": "x", "image": "!!not base64!!"}""").statusCode())
    }
}
