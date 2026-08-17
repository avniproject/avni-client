import {assert} from "chai";
import {Alert, Linking, PermissionsAndroid} from "react-native";
import DeviceInfo from "react-native-device-info";
import DevicePermissions from "../../src/utility/DevicePermissions";

describe('DevicePermissions', () => {
    let alertArgs;
    let requestedPermissions;

    const respondWith = (status) => (permissions) => {
        requestedPermissions.push(permissions);
        return Promise.resolve(permissions.reduce((acc, p) => ({...acc, [p]: status}), {}));
    };

    beforeEach(() => {
        alertArgs = [];
        requestedPermissions = [];
        Alert.alert = (...args) => alertArgs.push(args);
        Linking.openSettings = () => Promise.resolve();
        DeviceInfo.getApiLevel = () => Promise.resolve(34);
        PermissionsAndroid.requestMultiple = respondWith(PermissionsAndroid.RESULTS.GRANTED);
    });

    it('grants silently when the user allows everything', async () => {
        assert.isTrue(await DevicePermissions.request({camera: true}));
        assert.lengthOf(alertArgs, 0);
    });

    it('alerts with an Open Settings action instead of failing silently when denied', async () => {
        PermissionsAndroid.requestMultiple = respondWith(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
        assert.isFalse(await DevicePermissions.request({camera: true}));

        assert.lengthOf(alertArgs, 1);
        const buttons = alertArgs[0][2];
        assert.lengthOf(buttons, 2);
        assert.isFunction(buttons[1].onPress);
    });

    it('re-requests the permission on every attempt', async () => {
        PermissionsAndroid.requestMultiple = respondWith(PermissionsAndroid.RESULTS.DENIED);
        await DevicePermissions.request({camera: true});
        await DevicePermissions.request({camera: true});
        assert.lengthOf(requestedPermissions, 2);
    });

    it('does not prompt at all when nothing needs requesting', async () => {
        assert.isTrue(await DevicePermissions.request());
        assert.lengthOf(requestedPermissions, 0);
        assert.lengthOf(alertArgs, 0);
    });

    it('lets a geotagged capture proceed when only the location permissions are refused', async () => {
        PermissionsAndroid.requestMultiple = (permissions) => {
            requestedPermissions.push(permissions);
            return Promise.resolve(permissions.reduce((acc, p) => ({
                ...acc,
                [p]: p === PermissionsAndroid.PERMISSIONS.CAMERA ? PermissionsAndroid.RESULTS.GRANTED : PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
            }), {}));
        };

        assert.isTrue(await DevicePermissions.request({camera: true, deviceLocation: true, mediaLocation: true}));
        assert.lengthOf(alertArgs, 0);
    });
});
