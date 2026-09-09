import {assert} from "chai";
import {Platform, PermissionsAndroid} from "react-native";

jest.mock('react-native-geolocation-service', () => ({
    getCurrentPosition: jest.fn()
}));
// IssueUploadUtil pulls in BackupRestoreRealmService's native-module chain (zip-archive, realm, ...),
// none of which askLocationPermission touches - stub it out rather than mocking that whole chain.
jest.mock('../../src/utility/IssueUploadUtil', () => ({
    createUploadIssueInfoButton: jest.fn()
}));

import DeviceLocation from "../../src/utility/DeviceLocation";

describe('DeviceLocation.askLocationPermission', () => {
    let requestedPermissions;

    beforeEach(() => {
        Platform.OS = 'android';
        Platform.Version = 33;
        requestedPermissions = [];
        PermissionsAndroid.check = () => Promise.resolve(false);
        PermissionsAndroid.requestMultiple = (permissions) => {
            requestedPermissions.push(permissions);
            return Promise.resolve({});
        };
    });

    it('returns true without requesting when fine location is already granted', async () => {
        PermissionsAndroid.check = (permission) => Promise.resolve(permission === PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

        assert.isTrue(await DeviceLocation.askLocationPermission());
        assert.lengthOf(requestedPermissions, 0);
    });

    it('returns true without requesting when only coarse location is already granted', async () => {
        PermissionsAndroid.check = (permission) => Promise.resolve(permission === PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);

        assert.isTrue(await DeviceLocation.askLocationPermission());
        assert.lengthOf(requestedPermissions, 0);
    });

    it('requests both fine and coarse together when neither is granted', async () => {
        PermissionsAndroid.requestMultiple = (permissions) => {
            requestedPermissions.push(permissions);
            return Promise.resolve({
                [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.DENIED,
                [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]: PermissionsAndroid.RESULTS.GRANTED
            });
        };

        assert.isTrue(await DeviceLocation.askLocationPermission());
        assert.lengthOf(requestedPermissions, 1);
        assert.includeMembers(requestedPermissions[0], [
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        ]);
    });

    it('returns false when the user denies both fine and coarse', async () => {
        PermissionsAndroid.requestMultiple = (permissions) => {
            requestedPermissions.push(permissions);
            return Promise.resolve({
                [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.DENIED,
                [PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION]: PermissionsAndroid.RESULTS.DENIED
            });
        };

        assert.isFalse(await DeviceLocation.askLocationPermission());
    });
});
