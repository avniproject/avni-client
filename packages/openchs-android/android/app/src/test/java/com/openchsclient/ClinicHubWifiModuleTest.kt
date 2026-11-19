package com.openchsclient

import android.net.wifi.WifiManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ClinicHubWifiModuleTest {
    @Test
    fun ssidLosesTheQuotesAndroidPutsAroundIt() {
        assertEquals("AndroidShare_4821", ClinicHubWifiModule.unquoteSsid("\"AndroidShare_4821\""))
        assertEquals("AndroidShare_4821", ClinicHubWifiModule.unquoteSsid("AndroidShare_4821"))
    }

    @Test
    fun anSsidAndroidWillNotRevealIsNull() {
        assertNull(ClinicHubWifiModule.unquoteSsid("<unknown ssid>"))
        assertNull(ClinicHubWifiModule.unquoteSsid(null))
        assertNull(ClinicHubWifiModule.unquoteSsid(""))
        assertNull(ClinicHubWifiModule.unquoteSsid("\"\""))
    }

    @Test
    fun hotspotFailuresAreNamed() {
        assertEquals("no-channel", ClinicHubHotspot.failureReason(WifiManager.LocalOnlyHotspotCallback.ERROR_NO_CHANNEL))
        assertEquals("incompatible-mode", ClinicHubHotspot.failureReason(WifiManager.LocalOnlyHotspotCallback.ERROR_INCOMPATIBLE_MODE))
        assertEquals("tethering-disallowed", ClinicHubHotspot.failureReason(WifiManager.LocalOnlyHotspotCallback.ERROR_TETHERING_DISALLOWED))
        assertEquals("generic", ClinicHubHotspot.failureReason(WifiManager.LocalOnlyHotspotCallback.ERROR_GENERIC))
        assertEquals("unknown-99", ClinicHubHotspot.failureReason(99))
    }

    @Test
    fun aHotspotRefusedWithLocationOffSaysSoOnAndroid10To12() {
        assertEquals(ClinicHubWifiModule.E_LOCATION_OFF, ClinicHubWifiModule.startFailureCode(29, locationEnabled = false))
        assertEquals(ClinicHubWifiModule.E_LOCATION_OFF, ClinicHubWifiModule.startFailureCode(32, locationEnabled = false))
        assertEquals(ClinicHubWifiModule.E_PERMISSION, ClinicHubWifiModule.startFailureCode(32, locationEnabled = true))
        assertEquals(ClinicHubWifiModule.E_PERMISSION, ClinicHubWifiModule.startFailureCode(33, locationEnabled = false))
    }

    @Test
    fun theGatewayOfAManualJoinReadsFirstByteLowest() {
        assertEquals("192.168.43.1", ClinicHubWifiModule.dhcpAddress(0x012BA8C0))
        assertEquals("10.0.0.255", ClinicHubWifiModule.dhcpAddress(0xFF00000A.toInt()))
        assertNull(ClinicHubWifiModule.dhcpAddress(0))
    }
}
