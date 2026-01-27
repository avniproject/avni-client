import Geolocation from "react-native-geolocation-service";
import {PermissionsAndroid, Platform, Alert, Linking} from "react-native";
import General from "./General";
import _ from "lodash";

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

    static getPosition = _.debounce(async function(successCallbackFn, silent = true, errorCallbackFn = null, i18n) {
        const hasPermission = await DeviceLocation.askLocationPermission();
        if (hasPermission) {
            Geolocation.getCurrentPosition(
                position => {
                    if (silent) {
                        successCallbackFn(position);
                    } else {
                        const accuracy = position.coords.accuracy;

                        Alert.alert(
                            i18n.t('saveLocation'),
                            i18n.t('locationFoundWithAccuracy', {accuracy: accuracy?.toFixed(2)}) ,
                            [
                                { 
                                    text: i18n.t('cancel') ,
                                    style: 'cancel',
                                    onPress:()=>{
                                        errorCallbackFn && errorCallbackFn();
                                    }
                                },
                                { 
                                    text: 'Retry',
                                    onPress: () => {
                                        DeviceLocation.getPosition(successCallbackFn, silent, errorCallbackFn, i18n);
                                    }
                                },
                                { 
                                    text: 'Save Location',
                                    onPress: () => {
                                        successCallbackFn(position);
                                    }
                                }
                            ]
                        );
                    }
                },
                error => {
                    General.logWarn("DeviceLocation.getPosition", error);
                    if (!silent) {
                        let errorMessage;
                        let suggestions = [];

                        switch(error.code) {
                            case 1:
                                errorMessage = 'Location permission was denied.';
                                suggestions = [
                                    { text: 'Cancel', style: 'cancel', onPress: () => errorCallbackFn && errorCallbackFn(error) },
                                    { text: 'Open Settings', onPress: () => {
                                        Linking.openSettings();
                                        errorCallbackFn && errorCallbackFn(error);
                                    }}
                                ];
                                break;
                            case 2:
                                errorMessage = 'Location services are not available.';
                                suggestions = [
                                    { text: 'Cancel', style: 'cancel', onPress: () => errorCallbackFn && errorCallbackFn(error) },
                                    {
                                        text: 'Try Again',
                                        onPress: () => {
                                            DeviceLocation.getPosition(successCallbackFn, silent, errorCallbackFn, i18n);
                                        }
                                    }
                                ];
                                break;
                            case 3:
                                errorMessage = 'Location request timed out.';
                                suggestions = [
                                    { text: 'Cancel', style: 'cancel', onPress: () => errorCallbackFn && errorCallbackFn(error) },
                                    {
                                        text: 'Try Again',
                                        onPress: () => {
                                            DeviceLocation.getPosition(successCallbackFn, silent, errorCallbackFn, i18n);
                                        }
                                    }
                                ];
                                break;
                            default:
                                errorMessage = `Location error: ${error.message}`;
                                suggestions = [
                                    { text: 'Cancel', style: 'cancel', onPress: () => errorCallbackFn && errorCallbackFn(error) },
                                    {
                                        text: 'Try Again',
                                        onPress: () => {
                                            DeviceLocation.getPosition(successCallbackFn, silent, errorCallbackFn, i18n);
                                        }
                                    }
                                ];
                        }

                        Alert.alert('Location Error', errorMessage, suggestions);
                    }
                },
                {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000}
            );
        } else if (!silent) {
            const permissionError = {code: 1, message: "Location permission denied"};
            Alert.alert('Location Error', 'Location permission was denied.', [
                { text: 'Cancel', style: 'cancel', onPress: () => errorCallbackFn && errorCallbackFn(permissionError) },
                { text: 'Open Settings', onPress: () => {
                    Linking.openSettings();
                    errorCallbackFn && errorCallbackFn(permissionError);
                }}
            ]);
        }
    }, 1000, {leading: true, trailing: false});

}