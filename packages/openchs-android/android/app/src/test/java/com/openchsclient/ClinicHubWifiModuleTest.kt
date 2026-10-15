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
        assertEquals("no-channel", ClinicHubWifiModule.hotspotFailureReason(WifiManager.LocalOnlyHotspotCallback.ERROR_NO_CHANNEL))
        assertEquals("incompatible-mode", ClinicHubWifiModule.hotspotFailureReason(WifiManager.LocalOnlyHotspotCallback.ERROR_INCOMPATIBLE_MODE))
        assertEquals("tethering-disallowed", ClinicHubWifiModule.hotspotFailureReason(WifiManager.LocalOnlyHotspotCallback.ERROR_TETHERING_DISALLOWED))
        assertEquals("generic", ClinicHubWifiModule.hotspotFailureReason(WifiManager.LocalOnlyHotspotCallback.ERROR_GENERIC))
        assertEquals("unknown-99", ClinicHubWifiModule.hotspotFailureReason(99))
    }

    @Test
    fun aHotspotRefusedWithLocationOffSaysSoOnAndroid10To12() {
        assertEquals(ClinicHubWifiModule.E_LOCATION_OFF, ClinicHubWifiModule.startFailureCode(29, locationEnabled = false))
        assertEquals(ClinicHubWifiModule.E_LOCATION_OFF, ClinicHubWifiModule.startFailureCode(32, locationEnabled = false))
        assertEquals(ClinicHubWifiModule.E_PERMISSION, ClinicHubWifiModule.startFailureCode(32, locationEnabled = true))
        assertEquals(ClinicHubWifiModule.E_PERMISSION, ClinicHubWifiModule.startFailureCode(33, locationEnabled = false))
    }
}
