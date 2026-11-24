package org.samiksha.tanuh

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import java.util.concurrent.CountDownLatch

/** A rejected promise: the error code and message the app's module gave. */
class PromiseRejected(val code: String, message: String?) : Exception(message)

/** A React Native `Promise` that keeps its answer, so plain Kotlin can wait for what the app's module resolved or rejected. */
class RecordingPromise : Promise {
    private val done = CountDownLatch(1)
    private var value: Any? = null
    private var failure: PromiseRejected? = null

    private fun settle(v: Any?, f: PromiseRejected?) {
        value = v
        failure = f
        done.countDown()
    }

    /** The resolved value; throws `PromiseRejected` when the module rejected. */
    fun await(): Any? {
        done.await()
        failure?.let { throw it }
        return value
    }

    override fun resolve(value: Any?) = settle(value, null)

    override fun reject(code: String, message: String?) = settle(null, PromiseRejected(code, message))

    override fun reject(code: String, throwable: Throwable?) = settle(null, PromiseRejected(code, throwable?.message))

    override fun reject(code: String, message: String?, throwable: Throwable?) =
        settle(null, PromiseRejected(code, message ?: throwable?.message))

    override fun reject(throwable: Throwable) = settle(null, PromiseRejected("", throwable.message))

    override fun reject(throwable: Throwable, userInfo: WritableMap) = settle(null, PromiseRejected("", throwable.message))

    override fun reject(code: String, userInfo: WritableMap) = settle(null, PromiseRejected(code, null))

    override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) =
        settle(null, PromiseRejected(code, throwable?.message))

    override fun reject(code: String, message: String?, userInfo: WritableMap) = settle(null, PromiseRejected(code, message))

    override fun reject(code: String?, message: String?, throwable: Throwable?, userInfo: WritableMap?) =
        settle(null, PromiseRejected(code ?: "", message ?: throwable?.message))

    @Deprecated("Prefer passing a module-specific error code to JS.")
    override fun reject(message: String) = settle(null, PromiseRejected("", message))
}
