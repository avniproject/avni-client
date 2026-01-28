import Geolocation from "react-native-geolocation-service";
import {PermissionsAndroid, Platform, Alert, Linking} from "react-native";
import I18n from 'i18n-js';
import General from "./General";
import _ from "lodash";

export default class DeviceLocation {
    static async askLocationPermission() {
        if (Platform.OS === "ios" || (Platform.OS === "android" && Platform.Version < 23)) {
            return true;
        }

        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

        if (hasPermission) return true;

        try {
            const status = await Promise.race([
                PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                ),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Permission request timeout')), 10000))
            ]);

        if (status === PermissionsAndroid.RESULTS.GRANTED) return true;

        if (status === PermissionsAndroid.RESULTS.DENIED) {
            General.logWarn("DeviceLocation", "Location permission denied by user");
        } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            General.logWarn("DeviceLocation", "Location permission revoked by user");
        }

        return false;
        } catch (error) {
            General.logWarn("DeviceLocation", `Permission request failed: ${error.message}`);
            return false;
        }
    }

    static handleLocationSuccess(position, silent, successCallbackFn, errorCallbackFn) {
        if (silent) {
            successCallbackFn(position);
        } else {
            const accuracy = position.coords.accuracy;
            Alert.alert(
                I18n.t('saveLocation'),
                I18n.t('locationFoundWithAccuracy', {accuracy: accuracy?.toFixed(2)}),
                [
                    {
                        text: I18n.t('cancel'),
                        style: 'cancel',
                        onPress: () => {
                            errorCallbackFn && errorCallbackFn();
                        }
                    },
                    {
                        text: I18n.t('tryAgain'),
                        onPress: () => {
                            DeviceLocation.getPosition(successCallbackFn, silent, errorCallbackFn);
                        }
                    },
                    {
                        text: I18n.t('save'),
                        onPress: () => {
                            successCallbackFn(position);
                        }
                    }
                ]
            );
        }
    }

    static handleLocationError(error, silent, successCallbackFn, errorCallbackFn) {
        General.logWarn("DeviceLocation.getPosition", error);
        if (!silent) {
            const errorMessage = `Location error: ${error.message}`;
            const suggestions = [
                { text: I18n.t('cancel'), style: 'cancel', onPress: () => errorCallbackFn && errorCallbackFn(error) },
                {
                    text: I18n.t('tryAgain'),
                    onPress: () => {
                        DeviceLocation.getPosition(successCallbackFn, silent, errorCallbackFn);
                    }
                }
            ];
            Alert.alert(I18n.t('locationPermissionRequired'), errorMessage, suggestions);
        }
    }

    static handlePermissionDenied(errorCallbackFn, error = null) {
        const permissionError = error || {code: 1, message: "Location permission denied"};

        Alert.alert(I18n.t('locationPermissionRequired'), I18n.t('enableLocationPermission'), [
            { text: I18n.t('cancel'), style: 'cancel', onPress: () => {
                    errorCallbackFn && errorCallbackFn(permissionError);
                }},
            { text: I18n.t('openSettings'), onPress: () => {
                    Linking.openSettings();
                    errorCallbackFn && errorCallbackFn(permissionError);
                }}
        ]);
    }

    static getPosition = _.debounce(async function(successCallbackFn, silent = true, errorCallbackFn = null) {
        const hasPermission = await DeviceLocation.askLocationPermission();

        if (hasPermission) {
            Geolocation.getCurrentPosition(
                position => DeviceLocation.handleLocationSuccess(position, silent, successCallbackFn, errorCallbackFn),
                error => DeviceLocation.handleLocationError(error, silent, successCallbackFn, errorCallbackFn),
                {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
            );
        } else if (!silent) {
            DeviceLocation.handlePermissionDenied(errorCallbackFn, null);
        }
    }, 1000, {leading: true, trailing: false});

}