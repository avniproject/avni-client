import {Alert, Linking, PermissionsAndroid} from "react-native";
import DeviceInfo from "react-native-device-info";
import I18n from 'i18n-js';
import _ from "lodash";
import General from "./General";
import {deniedPermissions, permissionDeniedAlertKeys, permissionsToRequest} from "./DevicePermissionHelper";

export default class DevicePermissions {
    static async request(required = {}) {
        const apiLevel = await DeviceInfo.getApiLevel();
        const permissions = permissionsToRequest(PermissionsAndroid.PERMISSIONS, apiLevel, General.STORAGE_PERMISSIONS_DEPRECATED_API_LEVEL, required);
        if (_.isEmpty(permissions)) return true;

        const permissionResult = await PermissionsAndroid.requestMultiple(permissions);
        const denied = deniedPermissions(permissionResult, PermissionsAndroid.RESULTS.GRANTED);
        if (!_.isEmpty(denied)) General.logWarn("DevicePermissions", `Not granted: ${denied.join(", ")}`);

        const alertKeys = permissionDeniedAlertKeys(permissionResult, PermissionsAndroid.RESULTS.GRANTED);
        if (alertKeys === null) return true;

        DevicePermissions.showPermissionDeniedAlert(alertKeys);
        return false;
    }

    static hasDeviceLocation() {
        return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    }

    static showPermissionDeniedAlert({titleKey, messageKey}) {
        Alert.alert(I18n.t(titleKey), I18n.t(messageKey), [
            {text: I18n.t('cancel'), style: 'cancel'},
            {
                text: I18n.t('openSettings'),
                onPress: () => Linking.openSettings().catch(error => General.logError("DevicePermissions", error))
            }
        ]);
    }
}
