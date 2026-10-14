import {DeviceEventEmitter, NativeModules} from "react-native";

const native = {
    startHotspot: jest.fn(() => Promise.resolve({ssid: "AndroidShare_4821", passphrase: "x7k2m9q4w1e8"})),
    stopHotspot: jest.fn(() => Promise.resolve(true)),
    joinNetwork: jest.fn(() => Promise.resolve({ssid: "AndroidShare_4821", interfaceName: "wlan0"})),
    leaveNetwork: jest.fn(() => Promise.resolve(true)),
    currentSsid: jest.fn(() => Promise.resolve("AndroidShare_4821")),
    wifiConnected: jest.fn(() => Promise.resolve(true)),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
};
NativeModules.ClinicHubWifiModule = native;

const ClinicHubWifi = require("../../../src/framework/clinicsharing/ClinicHubWifi");

describe("ClinicHubWifi", () => {
    it("offers the hub only from Android 10", () => {
        expect(ClinicHubWifi.HUB_MIN_API_LEVEL).toBe(29);
        expect(ClinicHubWifi.canStartHub(28)).toBe(false);
        expect(ClinicHubWifi.canStartHub(29)).toBe(true);
        expect(ClinicHubWifi.canJoinByScan(28)).toBe(false);
        expect(ClinicHubWifi.canJoinByScan(35)).toBe(true);
    });

    it("passes calls to the native module", async () => {
        await expect(ClinicHubWifi.startHotspot()).resolves.toEqual({ssid: "AndroidShare_4821", passphrase: "x7k2m9q4w1e8"});
        await ClinicHubWifi.joinNetwork("AndroidShare_4821", "x7k2m9q4w1e8", 30000);
        expect(native.joinNetwork).toHaveBeenCalledWith("AndroidShare_4821", "x7k2m9q4w1e8", 30000);
        await expect(ClinicHubWifi.currentSsid()).resolves.toBe("AndroidShare_4821");
        await expect(ClinicHubWifi.wifiConnected()).resolves.toBe(true);
    });

    it("tells a listener when the joined network goes, until it unsubscribes", () => {
        const listener = jest.fn();
        const unsubscribe = ClinicHubWifi.onNetworkLost(listener);
        DeviceEventEmitter.emit("ClinicHubNetworkLost", {ssid: "AndroidShare_4821"});
        unsubscribe();
        DeviceEventEmitter.emit("ClinicHubNetworkLost", {ssid: "AndroidShare_4821"});
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith({ssid: "AndroidShare_4821"});
    });

    it("tells a listener when Android stops the hotspot", () => {
        const listener = jest.fn();
        const unsubscribe = ClinicHubWifi.onHotspotStopped(listener);
        DeviceEventEmitter.emit("ClinicHubHotspotStopped", {});
        unsubscribe();
        expect(listener).toHaveBeenCalledTimes(1);
    });
});
