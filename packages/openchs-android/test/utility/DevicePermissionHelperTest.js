import {assert} from "chai";
import {permissionDeniedAlertKeys, permissionsToRequest} from "../../src/utility/DevicePermissionHelper";
import en from "../../translations/en.json";

const PERMISSIONS = {
    CAMERA: 'android.permission.CAMERA',
    RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
    WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    ACCESS_MEDIA_LOCATION: 'android.permission.ACCESS_MEDIA_LOCATION',
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    ACCESS_COARSE_LOCATION: 'android.permission.ACCESS_COARSE_LOCATION'
};
const STORAGE_DEPRECATED_AT = 33;
const GRANTED = 'granted';

const forApiLevel = (apiLevel, required) => permissionsToRequest(PERMISSIONS, apiLevel, STORAGE_DEPRECATED_AT, required);

describe('DevicePermissionHelper', () => {
    describe('permissionsToRequest', () => {
        it('asks only for the camera once storage permissions are deprecated', () => {
            assert.deepEqual(forApiLevel(34, {camera: true}), [PERMISSIONS.CAMERA]);
        });

        it('asks for storage as well on older api levels', () => {
            assert.deepEqual(forApiLevel(30, {camera: true}),
                [PERMISSIONS.READ_EXTERNAL_STORAGE, PERMISSIONS.WRITE_EXTERNAL_STORAGE, PERMISSIONS.CAMERA]);
        });

        it('asks for the microphone when audio is recorded', () => {
            assert.deepEqual(forApiLevel(34, {microphone: true}), [PERMISSIONS.RECORD_AUDIO]);
            assert.deepEqual(forApiLevel(30, {microphone: true}),
                [PERMISSIONS.READ_EXTERNAL_STORAGE, PERMISSIONS.WRITE_EXTERNAL_STORAGE, PERMISSIONS.RECORD_AUDIO]);
        });

        it('asks for nothing when a plain file attachment runs above the storage deprecation level', () => {
            assert.deepEqual(forApiLevel(34, {}), []);
            assert.deepEqual(forApiLevel(30, {}),
                [PERMISSIONS.READ_EXTERNAL_STORAGE, PERMISSIONS.WRITE_EXTERNAL_STORAGE]);
        });

        it('asks for the device gps only when the capture itself is geotagged', () => {
            assert.deepEqual(forApiLevel(34, {camera: true, deviceLocation: true, mediaLocation: true}),
                [PERMISSIONS.CAMERA, PERMISSIONS.ACCESS_MEDIA_LOCATION, PERMISSIONS.ACCESS_FINE_LOCATION, PERMISSIONS.ACCESS_COARSE_LOCATION]);
        });

        it('asks only for media location when reading exif off an already-taken photo', () => {
            assert.deepEqual(forApiLevel(34, {mediaLocation: true}), [PERMISSIONS.ACCESS_MEDIA_LOCATION]);
        });
    });

    describe('permissionDeniedAlertKeys', () => {
        it('returns null when everything is granted', () => {
            assert.isNull(permissionDeniedAlertKeys({
                [PERMISSIONS.CAMERA]: GRANTED,
                [PERMISSIONS.ACCESS_FINE_LOCATION]: GRANTED
            }, GRANTED));
        });

        it('reports the camera when it is denied', () => {
            assert.deepEqual(permissionDeniedAlertKeys({[PERMISSIONS.CAMERA]: 'denied'}, GRANTED),
                {titleKey: 'cameraPermissionRequired', messageKey: 'giveCameraPermissionFromSettings'});
        });

        it('reports the camera when it is permanently denied', () => {
            assert.deepEqual(permissionDeniedAlertKeys({[PERMISSIONS.CAMERA]: 'never_ask_again'}, GRANTED),
                {titleKey: 'cameraPermissionRequired', messageKey: 'giveCameraPermissionFromSettings'});
        });

        it('reports the microphone when audio recording is denied', () => {
            assert.deepEqual(permissionDeniedAlertKeys({[PERMISSIONS.RECORD_AUDIO]: 'never_ask_again'}, GRANTED),
                {titleKey: 'microphonePermissionRequired', messageKey: 'giveMicrophonePermissionFromSettings'});
        });

        it('lets the capture through when only the optional location permissions are denied', () => {
            assert.isNull(permissionDeniedAlertKeys({
                [PERMISSIONS.CAMERA]: GRANTED,
                [PERMISSIONS.ACCESS_MEDIA_LOCATION]: 'never_ask_again',
                [PERMISSIONS.ACCESS_FINE_LOCATION]: 'never_ask_again',
                [PERMISSIONS.ACCESS_COARSE_LOCATION]: 'never_ask_again'
            }, GRANTED));
        });

        it('reports storage when the capture permission is granted but storage is not', () => {
            assert.deepEqual(permissionDeniedAlertKeys({
                [PERMISSIONS.READ_EXTERNAL_STORAGE]: 'denied',
                [PERMISSIONS.WRITE_EXTERNAL_STORAGE]: 'denied',
                [PERMISSIONS.CAMERA]: GRANTED
            }, GRANTED), {titleKey: 'storagePermissionRequired', messageKey: 'giveStoragePermissionFromSettings'});
        });

        it('prefers the camera message when camera and location are both denied', () => {
            assert.deepEqual(permissionDeniedAlertKeys({
                [PERMISSIONS.CAMERA]: 'denied',
                [PERMISSIONS.ACCESS_FINE_LOCATION]: 'denied'
            }, GRANTED), {titleKey: 'cameraPermissionRequired', messageKey: 'giveCameraPermissionFromSettings'});
        });

        it('only returns keys that are translated', () => {
            const scenarios = [
                {[PERMISSIONS.CAMERA]: 'denied'},
                {[PERMISSIONS.RECORD_AUDIO]: 'denied'},
                {[PERMISSIONS.CAMERA]: GRANTED, [PERMISSIONS.READ_EXTERNAL_STORAGE]: 'denied'}
            ];
            scenarios.forEach(scenario => {
                const {titleKey, messageKey} = permissionDeniedAlertKeys(scenario, GRANTED);
                assert.isString(en.translations[titleKey], `missing translation for ${titleKey}`);
                assert.isString(en.translations[messageKey], `missing translation for ${messageKey}`);
            });
        });
    });
});
