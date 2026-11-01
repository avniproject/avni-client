import {assert} from "chai";
import {PermissionsAndroid, Platform} from "react-native";
jest.mock("../../../src/views/common/ExpandableMedia", () => () => null);
jest.mock("react-native-image-picker", () => ({launchCamera: jest.fn(), launchImageLibrary: jest.fn()}));
jest.mock("react-native-geolocation-service", () => ({getCurrentPosition: jest.fn()}));
jest.mock("../../../src/utility/IssueUploadUtil", () => ({createUploadIssueInfoButton: jest.fn()}));
import Geolocation from "react-native-geolocation-service";
import MediaV2FormElement from "../../../src/views/form/formElement/MediaV2FormElement";
import DevicePermissions from "../../../src/utility/DevicePermissions";
import DeviceLocation from "../../../src/utility/DeviceLocation";

const {ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION} = PermissionsAndroid.PERMISSIONS;

const grant = (...granted) => {
    PermissionsAndroid.check = (permission) => Promise.resolve(granted.includes(permission));
};

describe('ImageV2 geotag with approximate location (#2064)', () => {
    let requested;
    beforeEach(() => {
        requested = [];
        Platform.OS = "android";
        Object.defineProperty(Platform, "Version", {get: () => 34, configurable: true});
        PermissionsAndroid.request = (p) => { requested.push(p); return Promise.resolve(PermissionsAndroid.RESULTS.DENIED); };
        Geolocation.getCurrentPosition.mockReset();
    });

    describe('DevicePermissions.locationPrecision', () => {
        it('is precise when precise location is granted', async () => {
            grant(ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION);
            assert.equal(await DevicePermissions.locationPrecision(), "precise");
            assert.isTrue(await DevicePermissions.hasDeviceLocation());
        });

        it('is approximate when only approximate location is granted', async () => {
            grant(ACCESS_COARSE_LOCATION);
            assert.equal(await DevicePermissions.locationPrecision(), "approximate");
            assert.isTrue(await DevicePermissions.hasDeviceLocation());
        });

        it('is null when no location is granted', async () => {
            grant();
            assert.isNull(await DevicePermissions.locationPrecision());
            assert.isFalse(await DevicePermissions.hasDeviceLocation());
        });
    });

    describe('DeviceLocation.getPosition', () => {
        it('takes a fix with approximate location when the caller accepts it, without re-prompting', async () => {
            grant(ACCESS_COARSE_LOCATION);
            await DeviceLocation.getPosition(() => {}, true, null, null, true);
            assert.lengthOf(requested, 0);
            assert.equal(Geolocation.getCurrentPosition.mock.calls.length, 1);
        });

        it('still asks for precise location for callers that need it', async () => {
            grant(ACCESS_COARSE_LOCATION);
            await DeviceLocation.getPosition(() => {}, true);
            assert.deepEqual(requested, [ACCESS_FINE_LOCATION]);
            assert.equal(Geolocation.getCurrentPosition.mock.calls.length, 0);
        });
    });

    describe('MediaV2FormElement', () => {
        const element = (state = {}) => {
            const el = Object.create(MediaV2FormElement.prototype);
            el.state = state;
            el.props = {element: {concept: {datatype: "ImageV2"}}};
            el.setState = (fn) => { el.state = typeof fn === 'function' ? fn(el.state) : {...el.state, ...fn}; };
            el.getFromKeyValue = (k, d) => d;
            el.includeLocationInfo = () => true;
            el.addMediaFromPicker = () => {};
            el.debouncedGetPosition = (cb) => DeviceLocation.getPosition(cb, true, null, null, true);
            return el;
        };

        it('geotags a camera capture when only approximate location is granted, and records the precision', async () => {
            grant(ACCESS_COARSE_LOCATION);
            DevicePermissions.request = () => Promise.resolve(true);
            const el = element();
            await el.launchCamera(() => {});
            await new Promise(setImmediate);
            assert.equal(Geolocation.getCurrentPosition.mock.calls.length, 1);
            const onFix = Geolocation.getCurrentPosition.mock.calls[0][0];
            onFix({coords: {latitude: 12.9, longitude: 77.6, accuracy: 1500}});

            const metadata = el.populateImageMetadata("a.jpg", undefined);
            assert.equal(metadata.latitude, 12.9);
            assert.equal(metadata.locationAccuracy, 1500);
            assert.equal(metadata.locationPrecision, "approximate");
        });

        it('records precise when precise location was used', () => {
            const el = element({deviceLocation: {coords: {latitude: 1, longitude: 2, accuracy: 5}}, deviceLocationPrecision: "precise"});
            assert.equal(el.populateImageMetadata("a.jpg", undefined).locationPrecision, "precise");
        });

        it('records no precision when the device gave no fix', () => {
            const el = element({deviceLocation: null, deviceLocationPrecision: null});
            assert.isUndefined(el.populateImageMetadata("a.jpg", undefined).locationPrecision);
        });
    });
});
