package com.openchsclient

// Android can answer a hotspot start after the app asked to stop, so a callback from an earlier start must not touch the current one.
internal class HotspotLifecycle {
    enum class OnFailed { REJECT_START, REPORT_STOPPED, IGNORE }

    private var nextId = 0
    private var pending: Int? = null
    private var active: Int? = null

    /** A new start, or null while one is still waiting for Android. The caller closes any hotspot it holds. */
    fun begin(): Int? {
        if (pending != null) return null
        active = null
        nextId += 1
        pending = nextId
        return nextId
    }

    /** True while the start is still wanted; false when it was stopped meanwhile, and the caller closes it. */
    fun started(id: Int): Boolean {
        if (pending != id) return false
        pending = null
        active = id
        return true
    }

    fun failed(id: Int): OnFailed = when (id) {
        pending -> {
            pending = null
            OnFailed.REJECT_START
        }
        active -> {
            active = null
            OnFailed.REPORT_STOPPED
        }
        else -> OnFailed.IGNORE
    }

    /** True when Android stopped the current hotspot. */
    fun stopped(id: Int): Boolean {
        if (active != id) return false
        active = null
        return true
    }

    /** Forgets both; returns a start still waiting for Android, so its caller can be told it was stopped. */
    fun stop(): Int? {
        val waiting = pending
        pending = null
        active = null
        return waiting
    }
}

// Once a join's callback is unregistered Android sends nothing more, so the join it ends is named and its caller told.
internal class JoinLifecycle {
    private var nextId = 0
    private var current: Int? = null

    fun begin(): Pair<Int, Int?> {
        val replaced = current
        nextId += 1
        current = nextId
        return Pair(nextId, replaced)
    }

    fun isCurrent(id: Int) = current == id

    fun end(id: Int) {
        if (current == id) current = null
    }

    fun leave(): Int? {
        val leaving = current
        current = null
        return leaving
    }
}
