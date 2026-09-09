import Geolocation from "react-native-geolocation-service";
import {PermissionsAndroid, Platform, Alert, Linking} from "react-native";
import I18n from 'i18n-js';
import General from "./General";
import _ from "lodash";
import IssueUploadUtil from "./IssueUploadUtil";

export default class DeviceLocation {
    static async askLocationPermission() {
        if (Platform.OS === "ios" || (Platform.OS === "android" && Platform.Version < 23)) {
            return true;
        }

        // Approximate (COARSE) location is enough to geotag a photo, so it counts as granted just like FINE -
        // requesting FINE again here when the user already granted COARSE would re-prompt for a permission
        // they already declined.
        const [hasFine, hasCoarse] = await Promise.all([
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION),
            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION)
        ]);

        if (hasFine || hasCoarse) return true;

        try {
            const statuses = await Promise.race([
                PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
                ]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Permission request timeout')), 10000))
            ]);

            const fineStatus = statuses[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
            const coarseStatus = statuses[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

            if (fineStatus === PermissionsAndroid.RESULTS.GRANTED || coarseStatus === PermissionsAndroid.RESULTS.GRANTED) {
                return true;
            }

            General.logWarn("DeviceLocation", `Location permission denied by user (fine: ${fineStatus}, coarse: ${coarseStatus})`);
            return false;
        } catch (error) {
            General.logWarn("DeviceLocation", `Permission request failed: ${error.message}`);
            return false;
        }
    }

    static handleLocationSuccess(position, silent, successCallbackFn, errorCallbackFn) {
        if (silent) {
            successCallbackFn(position);
            return;
        }
        const suggestions = [
            {text: I18n.t('cancel'), style: 'cancel', onPress: () => {
                errorCallbackFn && errorCallbackFn();
            }},
            {text: I18n.t('save'), onPress: () => successCallbackFn(position)}
        ];

        const accuracy = position.coords.accuracy;
        Alert.alert(
            I18n.t('saveLocation'),
            I18n.t('locationFoundWithAccuracy', {accuracy: accuracy?.toFixed(2)}),
            suggestions
        );
    }

    static handleLocationError(error, silent, successCallbackFn, errorCallbackFn, context) {
        General.logWarn("DeviceLocation.getPosition", error);
        if (!silent) {
            if (error.code === 1 || error.code === 2) {
                DeviceLocation.handlePermissionDenied(errorCallbackFn, error);
            } else {
                const errorMessage = `Location error: ${error.message}`;
                const suggestions = [
                    { text: I18n.t('cancel'), style: 'cancel', onPress: () => errorCallbackFn && errorCallbackFn(error) }
                ];
                
                suggestions.push(IssueUploadUtil.createUploadIssueInfoButton(
                    context,
                    I18n,
                    error,
                    "DeviceLocation"
                ));
                
                Alert.alert(I18n.t('locationPermissionRequired'), errorMessage, suggestions);
            }
        }
    }

    static handlePermissionDenied(errorCallbackFn, error = null) {
        const permissionError = error || {code: 1, message: "Location permission denied"};
        Alert.alert(I18n.t('locationPermissionRequired'), I18n.t('giveLocationPermissionFromSettings'), [
            { text: I18n.t('cancel'), style: 'cancel', onPress: () => {
                    errorCallbackFn && errorCallbackFn(permissionError);
                }},
            { text: I18n.t('openSettings'), onPress: () => {
                    Linking.openSettings();
                    errorCallbackFn && errorCallbackFn(permissionError);
                }}
        ]);
    }

    static getPosition = async function(successCallbackFn, silent = true, errorCallbackFn = null, context = null) {
        const hasPermission = await DeviceLocation.askLocationPermission();

        if (hasPermission) {
            Geolocation.getCurrentPosition(
                position => DeviceLocation.handleLocationSuccess(position, silent, successCallbackFn, errorCallbackFn),
                error => DeviceLocation.handleLocationError(error, silent, successCallbackFn, errorCallbackFn, context),
                {enableHighAccuracy: true, timeout: 15000, maximumAge: 0}
            );
        } else if (!silent) {
            DeviceLocation.handlePermissionDenied(errorCallbackFn, null);
        }
    };

}