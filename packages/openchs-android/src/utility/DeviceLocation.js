import Geolocation from "react-native-geolocation-service";
import {PermissionsAndroid, Platform} from "react-native";
import General from "./General";

export default class DeviceLocation {
    static async askLocationPermission() {
        if (Platform.OS === "ios" || (Platform.OS === "android" && Platform.Version < 23)) {
            return true;
        }

        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

        if (hasPermission) return true;

        const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

        if (status === PermissionsAndroid.RESULTS.GRANTED) return true;

        if (status === PermissionsAndroid.RESULTS.DENIED) {
            General.logWarn("DeviceLocation", "Location permission denied by user");
        } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            General.logWarn("DeviceLocation", "Location permission revoked by user");
        }

        return false;
    }

    static async getPosition(successCallbackFn) {
        const hasPermission = await this.askLocationPermission();
        if (hasPermission) {
            Geolocation.getCurrentPosition(
                position => successCallbackFn(position),
                error => {
                    General.logWarn("DeviceLocation.getPosition", error);
                },
                {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
            );
        }
    }

}