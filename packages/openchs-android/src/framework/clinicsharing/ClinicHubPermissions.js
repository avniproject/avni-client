import {PermissionsAndroid} from "react-native";
import DeviceInfo from "react-native-device-info";

const P = PermissionsAndroid.PERMISSIONS;

export const ClinicRole = Object.freeze({hub: "hub", phone: "phone"});

// Android 13+ needs "nearby devices" (neverForLocation) for Wi-Fi; earlier versions need precise location.
const requiredPermissions = (role, apiLevel) => {
    const wifi = apiLevel >= 33 ? [P.NEARBY_WIFI_DEVICES] : [P.ACCESS_FINE_LOCATION];
    return role === ClinicRole.hub ? wifi : [P.CAMERA, ...wifi];
};

// Some Android 12 phones ignore a request for precise location made without approximate location, so they go together.
export const clinicHubPermissions = (role, apiLevel) =>
    apiLevel >= 33 ? requiredPermissions(role, apiLevel) : [...requiredPermissions(role, apiLevel), P.ACCESS_COARSE_LOCATION];

export const requestClinicHubPermissions = async (role, apiLevel = DeviceInfo.getApiLevelSync()) => {
    const results = await PermissionsAndroid.requestMultiple(clinicHubPermissions(role, apiLevel));
    const denied = requiredPermissions(role, apiLevel).filter((permission) => results[permission] !== PermissionsAndroid.RESULTS.GRANTED);
    return {granted: denied.length === 0, denied};
};
