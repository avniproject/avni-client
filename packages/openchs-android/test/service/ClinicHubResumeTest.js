/**
 * A hub phone that restarted carries on its camp when the app opens, without asking for anything,
 * and Home says why when it cannot.
 *
 * Run: npx jest --selectProjects unit --testPathPattern ClinicHubResumeTest
 */
jest.mock("../../src/framework/bean/Service", () => () => (target) => target);
jest.mock('react-native-libsodium', () => ({}));
jest.mock('react-native-tcp-socket', () => ({}));
jest.mock('react-native-randombytes', () => ({randomBytes: () => new Uint8Array(16)}));
jest.mock('react-native-zip-archive', () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));
jest.mock("../../src/framework/clinicsharing/ClinicHubWifi", () => ({canStartHub: jest.fn(() => true)}));
jest.mock("../../src/framework/clinicsharing/ClinicHubPermissions", () => ({
    ClinicRole: {hub: 'hub', phone: 'phone'},
    hasClinicHubPermissions: jest.fn(async () => true),
}));

import {Alert, AppState} from "react-native";
import ClinicHubService from "../../src/service/clinicsharing/ClinicHubService";
import {resumeClinicCamp, resumeClinicCampWhenOpened} from "../../src/views/clinicsharing/ClinicSharingMessages";
import {canStartHub} from "../../src/framework/clinicsharing/ClinicHubWifi";
import {hasClinicHubPermissions} from "../../src/framework/clinicsharing/ClinicHubPermissions";

const log = () => {};

function hub({inCamp = true, sharing = null} = {}) {
    const service = new ClinicHubService({}, {});
    service.campActive = jest.fn(async () => inCamp);
    service.sharing = sharing;
    service.startSharing = jest.fn(async () => ({ssid: 'AndroidShare_1'}));
    return service;
}

describe('Resuming a camp when the app opens', () => {
    beforeEach(() => {
        AppState.currentState = 'active';
        canStartHub.mockReturnValue(true);
        hasClinicHubPermissions.mockResolvedValue(true);
    });

    it('starts the hub again in its camp, asking for nothing', async () => {
        const service = hub();

        await service.resumeCamp(log);

        expect(service.startSharing).toHaveBeenCalledWith(log);
    });

    it('does nothing outside a camp, so the first start of a camp is always by hand', async () => {
        const service = hub({inCamp: false});

        expect(await service.resumeCamp(log)).toBeNull();
        expect(service.startSharing).not.toHaveBeenCalled();
    });

    it('does nothing while the hub is already running, or while the app is not on screen', async () => {
        const running = hub({sharing: {ssid: 'AndroidShare_1'}});
        await running.resumeCamp(log);
        expect(running.startSharing).not.toHaveBeenCalled();

        AppState.currentState = 'background';
        const behind = hub();
        await behind.resumeCamp(log);
        expect(behind.startSharing).not.toHaveBeenCalled();
    });

    it('refuses to start when Android has taken a permission back, rather than prompting', async () => {
        hasClinicHubPermissions.mockResolvedValue(false);
        const service = hub();

        await expect(service.resumeCamp(log)).rejects.toMatchObject({code: 'hotspotNotAllowed'});
        expect(service.startSharing).not.toHaveBeenCalled();
    });

    it("tells the user on Home why the hub did not start, in the screen's own words", async () => {
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        const service = hub();
        service.startSharing.mockRejectedValue(Object.assign(new Error('location off'), {code: 'locationOff'}));
        const I18n = {t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key)};

        await resumeClinicCamp(service, I18n);

        expect(alert).toHaveBeenCalledWith('clinicSharing', 'clinicSharingHubNotResumed {"reason":"clinicSharingError_locationOff {}"}');
        alert.mockRestore();
    });

    it("tells each reason once, as the app comes back to the screen often, and again after the hub has started", async () => {
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        const service = hub();
        const I18n = {t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key)};
        service.startSharing.mockRejectedValue(Object.assign(new Error('permission'), {code: 'hotspotNotAllowed'}));

        await resumeClinicCamp(service, I18n);
        await resumeClinicCamp(service, I18n);
        expect(alert).toHaveBeenCalledTimes(1);

        service.startSharing.mockResolvedValueOnce({ssid: 'AndroidShare_1'});
        await resumeClinicCamp(service, I18n);
        await resumeClinicCamp(service, I18n);
        expect(alert).toHaveBeenCalledTimes(2);
        alert.mockRestore();
    });

    it("points to Start hub only when the reason does not already say what to do", async () => {
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
        const service = hub();
        service.startSharing.mockRejectedValue(new Error('disk error'));
        const I18n = {t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key)};

        await resumeClinicCamp(service, I18n);

        expect(alert.mock.calls[0][1]).toMatch(/^clinicSharingHubNotResumedOther /);
        alert.mockRestore();
    });

    it("tries again whenever the app comes back to the screen, until Home is gone", async () => {
        let onChange;
        const remove = jest.fn();
        jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => { onChange = handler; return {remove}; });
        const service = hub();
        service.resumeCamp = jest.fn(async () => null);

        const stop = resumeClinicCampWhenOpened(service, {t: (key) => key});
        onChange('background');
        onChange('active');
        expect(service.resumeCamp).toHaveBeenCalledTimes(2);

        stop();
        expect(remove).toHaveBeenCalled();
    });
});
