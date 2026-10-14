import {NativeEventEmitter, NativeModules} from "react-native";
import DeviceInfo from "react-native-device-info";

// The only place that talks to ClinicHubWifiModule (avni-client#2173).
// Android 10 (API 29) brings both the hotspot's network name and password, and joining a named network from an app.
export const HUB_MIN_API_LEVEL = 29;

const nativeModule = () => NativeModules.ClinicHubWifiModule;
let emitter = null;
const events = () => emitter || (emitter = new NativeEventEmitter(nativeModule()));

const subscribe = (event, listener) => {
    const subscription = events().addListener(event, listener);
    return () => subscription.remove();
};

export const apiLevel = () => DeviceInfo.getApiLevelSync();
export const canStartHub = (level = apiLevel()) => level >= HUB_MIN_API_LEVEL;
export const canJoinByScan = (level = apiLevel()) => level >= HUB_MIN_API_LEVEL;

export const startHotspot = () => nativeModule().startHotspot();
export const stopHotspot = () => nativeModule().stopHotspot();
export const joinNetwork = (ssid, passphrase, timeoutMs) => nativeModule().joinNetwork(ssid, passphrase, timeoutMs);
export const leaveNetwork = () => nativeModule().leaveNetwork();
export const currentSsid = () => nativeModule().currentSsid();
// Below Android 10 a missing name means either no Wi-Fi or a name Android will not reveal; this tells them apart.
export const wifiConnected = () => nativeModule().wifiConnected();

export const onNetworkLost = (listener) => subscribe("ClinicHubNetworkLost", listener);
export const onHotspotStopped = (listener) => subscribe("ClinicHubHotspotStopped", listener);
