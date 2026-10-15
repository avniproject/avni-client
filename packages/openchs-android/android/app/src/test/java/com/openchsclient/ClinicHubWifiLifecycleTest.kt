package com.openchsclient

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ClinicHubWifiLifecycleTest {
    @Test
    fun onlyOneHotspotStartAtATime() {
        val hotspot = HotspotLifecycle()
        val first = hotspot.begin()!!
        assertNull(hotspot.begin())
        assertTrue(hotspot.started(first))
        assertNotNull(hotspot.begin())
    }

    @Test
    fun aFailureBeforeStartingRejectsTheStart() {
        val hotspot = HotspotLifecycle()
        val id = hotspot.begin()!!
        assertEquals(HotspotLifecycle.OnFailed.REJECT_START, hotspot.failed(id))
        assertNotNull(hotspot.begin())
    }

    @Test
    fun aFailureAfterStartingIsReportedAsTheHotspotStopping() {
        val hotspot = HotspotLifecycle()
        val id = hotspot.begin()!!
        hotspot.started(id)
        assertEquals(HotspotLifecycle.OnFailed.REPORT_STOPPED, hotspot.failed(id))
    }

    @Test
    fun stopWhileStartingNamesTheStartAndClosesTheHotspotWhenItArrives() {
        val hotspot = HotspotLifecycle()
        val id = hotspot.begin()!!
        assertEquals(id, hotspot.stop())
        assertFalse(hotspot.started(id))
        assertNotNull(hotspot.begin())
    }

    @Test
    fun aLateCallbackFromAnEarlierHotspotLeavesTheCurrentOneAlone() {
        val hotspot = HotspotLifecycle()
        val earlier = hotspot.begin()!!
        hotspot.started(earlier)
        val current = hotspot.begin()!!
        hotspot.started(current)
        assertFalse(hotspot.stopped(earlier))
        assertEquals(HotspotLifecycle.OnFailed.IGNORE, hotspot.failed(earlier))
        assertTrue(hotspot.stopped(current))
    }

    @Test
    fun aNewJoinNamesTheJoinItReplaces() {
        val joins = JoinLifecycle()
        val (first, replacedByFirst) = joins.begin()
        assertNull(replacedByFirst)
        val (second, replacedBySecond) = joins.begin()
        assertEquals(first, replacedBySecond)
        assertFalse(joins.isCurrent(first))
        assertTrue(joins.isCurrent(second))
    }

    @Test
    fun leavingNamesTheJoinToCancel() {
        val joins = JoinLifecycle()
        val (id, _) = joins.begin()
        assertEquals(id, joins.leave())
        assertNull(joins.leave())
        assertFalse(joins.isCurrent(id))
    }

    @Test
    fun anEndedJoinClearsOnlyItself() {
        val joins = JoinLifecycle()
        val (first, _) = joins.begin()
        val (second, _) = joins.begin()
        joins.end(first)
        assertTrue(joins.isCurrent(second))
        joins.end(second)
        assertNull(joins.leave())
    }
}
