/**
 * In a camp the Sync button syncs a joined phone with its hub, and tells the hub or a phone that lost
 * its hub what to do, instead of refusing.
 *
 * Run: npx jest --selectProjects unit --testPathPattern SyncComponentCampTest
 */
jest.mock('react-native-randombytes', () => ({randomBytes: () => new Uint8Array(16)}));
jest.mock('react-native-zip-archive', () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));
jest.mock('react-native-geolocation-service', () => ({}));
jest.mock('react-native-tcp-socket', () => ({}));
jest.mock('react-native-background-timer', () => ({}));
jest.mock('react-native-keep-awake', () => ({__esModule: true, default: () => null}));
jest.mock('@react-native-documents/picker', () => ({}));
jest.mock('react-native-vision-camera', () => ({}));
jest.mock('@react-native-clipboard/clipboard', () => ({}));
jest.mock('react-native-share', () => ({}));
jest.mock('react-native-file-viewer', () => ({}));

import {Alert, ToastAndroid} from "react-native";
import SyncComponent from "../../src/views/SyncComponent";

function component({isHub = false} = {}) {
    const instance = Object.create(SyncComponent.prototype);
    instance._i18n = {t: (key) => key};
    instance.context = {getService: (name) => (name === 'clinicHubService' ? {campActive: async () => isHub} : undefined)};
    return instance;
}

describe("The Sync button during a camp", () => {
    let toast, alert;
    beforeEach(() => {
        toast = jest.spyOn(ToastAndroid, 'show').mockImplementation(() => {});
        alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    it("syncs a joined phone with its hub and says how it went", async () => {
        const spoke = {joined: {ssid: 'AndroidShare_1'}, syncNow: jest.fn(async () => ({sent: 1}))};

        await component().syncInCamp(spoke);

        expect(spoke.syncNow).toHaveBeenCalled();
        expect(toast.mock.calls.map(([message]) => message)).toEqual(['clinicCampSyncingWithHub', 'clinicCampSyncedWithHub']);
    });

    it("says a hub sync failed, pointing to Clinic sharing", async () => {
        const spoke = {joined: {ssid: 'AndroidShare_1'}, syncNow: jest.fn(async () => ({error: {code: 'timeout'}}))};

        await component().syncInCamp(spoke);

        expect(toast).toHaveBeenLastCalledWith('clinicCampHubSyncFailed', ToastAndroid.SHORT);
    });

    it("tells the hub phone that phones sync with it, and a phone that lost its hub how to rejoin", async () => {
        await component({isHub: true}).syncInCamp({joined: null});
        await component().syncInCamp({joined: null});

        expect(alert.mock.calls.map(([, message]) => message)).toEqual(['clinicCampHubSyncInfo', 'clinicCampNotJoined']);
    });
});
