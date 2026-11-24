package org.samiksha.tanuh

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import java.util.Base64
import java.util.concurrent.Executors
import org.json.JSONException
import org.json.JSONObject

/**
 * The model's HTTP service: `GET /health`, `GET /info` and `POST /predict`, as the Samiksha model API describes them.
 *
 * `predict` turns the bytes of an image file into a `Verdict`; `info` is the body of `GET /info`.
 * The server is started after the folds are loaded, so `/health` answers 200 whenever it answers.
 * Port 0 picks a free port, which `port` then reports.
 */
class Server(port: Int, private val predict: (ByteArray) -> Verdict, private val info: Map<String, Any>) {
    private val http = HttpServer.create(InetSocketAddress(port), 0)

    val port: Int get() = http.address.port

    init {
        http.executor = Executors.newCachedThreadPool()
        http.createContext("/health") { reply(it, 200, JSONObject().put("status", "ok")) }
        http.createContext("/info") { reply(it, 200, JSONObject(info)) }
        http.createContext("/predict") { handlePredict(it) }
    }

    fun start() = http.start()

    fun stop() = http.stop(0)

    private fun handlePredict(exchange: HttpExchange) {
        if (exchange.requestMethod != "POST") return reply(exchange, 405, JSONObject().put("error", "method_not_allowed"))
        val requestId: String
        val image: ByteArray
        try {
            val body = JSONObject(exchange.requestBody.readBytes().decodeToString())
            requestId = body.getString("request_id")
            image = Base64.getDecoder().decode(body.getString("image"))
        } catch (e: JSONException) {
            return reply(exchange, 400, JSONObject().put("error", "bad_request"))
        } catch (e: IllegalArgumentException) {
            return reply(exchange, 400, JSONObject().put("error", "bad_request"))
        }
        // Throwable, not Exception: an Error such as OutOfMemoryError would otherwise leave the request
        // without an answer, and Samiksha waits for one until its check times out.
        val verdict = try {
            predict(image)
        } catch (e: Throwable) {
            Verdict.Failed("inference_failed")
        }
        when (verdict) {
            is Verdict.Answer -> reply(exchange, 200, JSONObject()
                .put("request_id", requestId).put("label", verdict.label).put("score", verdict.score).put("folds", org.json.JSONArray(verdict.folds)))
            is Verdict.Failed -> reply(exchange, 422, JSONObject().put("request_id", requestId).put("error", verdict.code))
        }
    }

    private fun reply(exchange: HttpExchange, status: Int, body: JSONObject) {
        val bytes = body.toString().toByteArray()
        exchange.responseHeaders.add("Content-Type", "application/json")
        exchange.sendResponseHeaders(status, bytes.size.toLong())
        exchange.responseBody.use { it.write(bytes) }
    }
}
