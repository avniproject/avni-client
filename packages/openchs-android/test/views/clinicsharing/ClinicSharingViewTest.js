import React from "react";
import {Alert, Text, TouchableNativeFeedback} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

jest.mock('react-native-libsodium', () => require('libsodium-wrappers'));
jest.mock('react-native-tcp-socket', () => require('net'));
jest.mock('react-native-randombytes', () => ({
    randomBytes: (n, cb) => { const b = new Uint8Array(n || 16); if (cb) cb(null, b); return b; },
}));
jest.mock('react-native-zip-archive', () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock('react-native-keychain', () => ({
    getGenericPassword: jest.fn(async () => false), setGenericPassword: jest.fn(async () => {}), resetGenericPassword: jest.fn(async () => {}),
}));
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
// SafeAreaProvider renders nothing until it has native insets, which swallows the whole subtree.
jest.mock("../../../src/views/common/CHSContainer", () => ({
    __esModule: true,
    default: ({children}) => require("react").createElement(require("react-native").View, null, children),
}));
jest.mock("../../../src/views/common/CHSContent", () => ({
    __esModule: true,
    default: ({children}) => require("react").createElement(require("react-native").View, null, children),
}));
jest.mock("../../../src/views/clinicsharing/ClinicHubScanner", () => ({
    __esModule: true,
    default: (props) => require("react").createElement(require("react-native").View, {testID: "scanner", ...props}),
}));
jest.mock("react-native-qrcode-svg", () => ({
    __esModule: true,
    default: (props) => require("react").createElement(require("react-native").View, {testID: "qr", ...props}),
}));
let mockWifiOn = true;
jest.mock("../../../src/framework/clinicsharing/ClinicHubWifi", () => ({canStartHub: () => true, wifiEnabled: async () => mockWifiOn}));
jest.mock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {navigateToLandingView: jest.fn()}}));
jest.mock("../../../src/framework/clinicsharing/ClinicHubPermissions", () => ({
    ClinicRole: {hub: "hub", phone: "phone"},
    requestClinicHubPermissions: jest.fn(async () => ({granted: true, denied: []})),
}));

import ServiceContext from "../../../src/framework/context/ServiceContext";
import ClinicSharingView from "../../../src/views/clinicsharing/ClinicSharingView";
import {encodeJoinPayload} from "../../../src/framework/clinicsharing/ClinicJoinPayload";
import General from "../../../src/utility/General";

const t = (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key);

function services({admin = true, sharing = null, joined = null, savedJoinCode = null, lastSync = null, lastSyncedAt = null,
                      hubRestarted = false, hubNetworkLost = false, held = {count: 0, oldest: null, items: []}, refusal = null, hotspotStopped = false,
                      hubCamp = false, campEnding = false, everyPhoneLeft = false, phones = null, phoneCamp, leftCamp = null, starting = false} = {}) {
    const camp = phoneCamp !== undefined ? phoneCamp : (savedJoinCode || joined ? {hubId: "hub-1", epoch: "epoch-1"} : null);
    const fakes = {
        MessageService: {getI18n: () => ({t})},
        PrivilegeService: {hasAllPrivileges: () => admin},
        EntityService: {findByKey: (key, uuid) => (uuid === 'p-1' ? {nameString: 'Sunita Devi'} : undefined)},
        clinicHubService: {onChange: () => () => {}, getSharing: () => sharing, recentPhoneCount: () => 3, hotspotStopped, campEnding,
            phonesSynced: () => phones || [{deviceId: "d-1", name: "Doctor · Galaxy A15", syncedAt: new Date(2026, 9, 19, 14, 7).getTime()}],
            campActive: async () => hubCamp, everyPhoneLeft: () => everyPhoneLeft, isStarting: () => starting,
            startSharing: jest.fn(async () => {}), stopSharing: jest.fn(async () => {}), endCamp: jest.fn(async () => {}),
            skipPhone: jest.fn(async () => {}), closeCamp: jest.fn(async () => {})},
        clinicSpokeService: {onChange: () => () => {}, joined, lastSync, lastSyncedAt, hubRestarted, hubNetworkLost, leftCamp,
            savedJoinCode: async () => savedJoinCode, camp: async () => camp,
            joinWithCode: jest.fn(async () => {}), syncNow: jest.fn(async () => {}), leaveHub: jest.fn(async () => {})},
        clinicHoldBackService: {getHeldUploads: async () => held},
        clinicMediaService: {getHubStorageRefusal: () => refusal},
    };
    return {fakes, context: {getService: (key) => fakes[typeof key === 'string' ? key : key.name]}};
}

let mounted = [];

async function show(options) {
    const {fakes, context} = services(options);
    let renderer;
    await act(async () => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}><ClinicSharingView/></ServiceContext.Provider>);
    });
    mounted.push(renderer);
    const lines = () => renderer.root.findAllByType(Text).map((text) => [].concat(text.props.children).join(""));
    const press = async (label) => {
        const button = renderer.root.findAllByType(TouchableNativeFeedback).find((b) => b.findAllByType(Text).some((text) => [].concat(text.props.children).join("") === label));
        await act(async () => button.props.onPress());
    };
    return {fakes, renderer, lines, press};
}

describe("ClinicSharingView", () => {
    beforeEach(() => {
        mockWifiOn = true;
    });

    afterEach(() => {
        mounted.forEach((renderer) => act(() => renderer.unmount()));
        mounted = [];
    });

    it("offers Scan to join, and Start hub to an administrator", async () => {
        const {fakes, lines, press, renderer} = await show({admin: true});

        expect(lines()).toEqual(expect.arrayContaining(["clinicSharingScanToJoin", "clinicSharingStartHub"]));
        await press("clinicSharingStartHub");
        expect(fakes.clinicHubService.startSharing).toHaveBeenCalled();
    });

    it("starts the hub with a log that writes to the app's log file, so refused phones are recorded", async () => {
        const logInfo = jest.spyOn(General, "logInfo").mockImplementation(() => {});
        const {fakes, press} = await show({admin: true});

        await press("clinicSharingStartHub");
        const [hubLog] = fakes.clinicHubService.startSharing.mock.calls[0];
        hubLog("Refused 192.168.43.2: its messages could not be read, so it holds an old or wrong key");

        expect(logInfo).toHaveBeenCalledWith("ClinicHub", "Refused 192.168.43.2: its messages could not be read, so it holds an old or wrong key");
        logInfo.mockRestore();
    });

    it("on a hub whose camp is still on but whose hotspot stopped, says why and offers to start it again or close the camp", async () => {
        const stopped = await show({admin: true, hotspotStopped: true, hubCamp: true});
        expect(stopped.lines()).toEqual(expect.arrayContaining(["clinicSharingHubWifiStopped", "clinicSharingHubCampPaused", "clinicSharingStartHub", "clinicSharingCloseCamp"]));
        expect(stopped.lines()).not.toContain("clinicSharingScanToJoin");

        const fresh = await show({admin: true});
        expect(fresh.lines()).not.toContain("clinicSharingHubWifiStopped");
    });

    it("while the hub is starting, as after the app reopens in a camp, says so and offers no button that would start it twice", async () => {
        const {lines} = await show({admin: true, hubCamp: true, starting: true});

        expect(lines()).toContain("clinicSharingHubStarting");
        expect(lines()).not.toEqual(expect.arrayContaining(["clinicSharingStartHub"]));
        expect(lines()).not.toContain("clinicSharingCloseCamp");
    });

    it("does not show Start hub at all to other users", async () => {
        const {lines, renderer} = await show({admin: false});

        expect(lines()).toContain("clinicSharingScanToJoin");
        expect(lines()).not.toContain("clinicSharingStartHub");
    });

    it("shows a running hub's code, the phones synced lately, its storage refusal and End camp", async () => {
        const {renderer, lines} = await show({sharing: {ssid: "AndroidShare_1", passphrase: "pass1234", qrValue: "{}"}, refusal: {freeMb: 120}});

        expect(renderer.root.findByProps({testID: "qr"}).props.value).toBe("{}");
        expect(lines()).toEqual(expect.arrayContaining([
            'clinicSharingPhonesSyncedRecently {"count":3,"minutes":5}',
            'clinicSharingHubLowStorage {"freeMb":120}',
            "clinicSharingEndCamp",
        ]));
        expect(lines()).not.toContain("clinicSharingScanToJoin");
        expect(lines().some((line) => line.startsWith('clinicSharingPhoneLastSynced {"phone":"Doctor · Galaxy A15","time":'))).toBe(true);
    });

    it("shows a joined phone's hub, last sync and failure in plain words, and syncs on request", async () => {
        const {fakes, lines, press, renderer} = await show({
            joined: {ssid: "AndroidShare_1"}, lastSyncedAt: new Date(), lastSync: {at: new Date(), error: {code: "timeout"}},
        });

        expect(lines()).toEqual(expect.arrayContaining(['clinicSharingJoinedTo {"hub":"AndroidShare_1"}', "clinicSharingError_timeout {}", "clinicSharingInCamp", "clinicSharingLeaveHub"]));
        expect(lines().some((line) => line.startsWith("clinicSharingLastSynced"))).toBe(true);
        await press("clinicSharingSyncWithHub");
        expect(fakes.clinicSpokeService.syncNow).toHaveBeenCalled();
    });

    it("offers Rejoin with the remembered code after a restart, and asks for a new scan after the hub restarted", async () => {
        const code = encodeJoinPayload({ssid: "AndroidShare_1", passphrase: "pass1234", hubId: "hub-1", epoch: "epoch-1", key: "A".repeat(43)});
        const remembered = await show({savedJoinCode: code, hubNetworkLost: true});
        expect(remembered.lines()).toEqual(expect.arrayContaining([
            'clinicSharingRejoin {"hub":"AndroidShare_1"}', 'clinicSharingHubNetworkLost {"hub":"AndroidShare_1"}',
        ]));

        const restarted = await show({hubRestarted: true});
        expect(restarted.lines()).toContain("clinicSharingHubRestarted");
    });

    it("suggests scanning a new code when Rejoin cannot find the hub's network", async () => {
        const code = encodeJoinPayload({ssid: "AndroidShare_1", passphrase: "pass1234", hubId: "hub-1", epoch: "epoch-1", key: "A".repeat(43)});
        const {fakes, lines, press} = await show({savedJoinCode: code, hubNetworkLost: true});
        fakes.clinicSpokeService.joinWithCode.mockRejectedValue(Object.assign(new Error("Could not join AndroidShare_1"), {code: "joinFailed"}));

        await press('clinicSharingRejoin {"hub":"AndroidShare_1"}');

        expect(lines()).toContain('clinicSharingError_rejoinFailed {"hub":"AndroidShare_1"}');
    });

    it("says Wi-Fi is off when Rejoin fails for that, not that the hub may have restarted", async () => {
        const code = encodeJoinPayload({ssid: "AndroidShare_1", passphrase: "pass1234", hubId: "hub-1", epoch: "epoch-1", key: "A".repeat(43)});
        const {fakes, lines, press} = await show({savedJoinCode: code, hubNetworkLost: true});
        fakes.clinicSpokeService.joinWithCode.mockRejectedValue(Object.assign(new Error("Wi-Fi is off on this phone"), {code: "wifiOff"}));
        mockWifiOn = false;

        await press('clinicSharingRejoin {"hub":"AndroidShare_1"}');

        expect(lines()).toContain("clinicSharingError_wifiOff {}");
        expect(lines()).not.toContain('clinicSharingError_rejoinFailed {"hub":"AndroidShare_1"}');
    });

    it("says Wi-Fi is off on the lost-hub screen itself, before anything is tapped (issue #2232)", async () => {
        const code = encodeJoinPayload({ssid: "AndroidShare_1", passphrase: "pass1234", hubId: "hub-1", epoch: "epoch-1", key: "A".repeat(43)});
        mockWifiOn = false;
        const {lines} = await show({savedJoinCode: code, hubNetworkLost: true});

        expect(lines()).toContain("clinicSharingError_wifiOff");
        expect(lines()).not.toContain('clinicSharingHubNetworkLost {"hub":"AndroidShare_1"}');
    });

    it("drops the Wi-Fi-off message on the next refresh once Wi-Fi is back on (issue #2232)", async () => {
        const code = encodeJoinPayload({ssid: "AndroidShare_1", passphrase: "pass1234", hubId: "hub-1", epoch: "epoch-1", key: "A".repeat(43)});
        const {fakes, lines, press, renderer} = await show({savedJoinCode: code, hubNetworkLost: true});
        fakes.clinicSpokeService.joinWithCode.mockRejectedValue(Object.assign(new Error("Wi-Fi is off on this phone"), {code: "wifiOff"}));
        mockWifiOn = false;
        await press('clinicSharingRejoin {"hub":"AndroidShare_1"}');
        expect(lines()).toContain("clinicSharingError_wifiOff {}");

        mockWifiOn = true;
        await act(async () => renderer.root.findByType(ClinicSharingView).instance.refresh());

        expect(lines()).not.toContain("clinicSharingError_wifiOff {}");
        expect(lines()).toContain('clinicSharingHubNetworkLost {"hub":"AndroidShare_1"}');
    });

    it("shows the date of a phone's last sync when it was on an earlier day of the camp", async () => {
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
        const {lines} = await show({sharing: {ssid: "AndroidShare_1", passphrase: "pass1234", qrValue: "{}"}, hubCamp: true,
            phones: [{deviceId: "d-1", name: "Nurse", syncedAt: eightDaysAgo.getTime()}]});

        const line = lines().find((text) => text.startsWith('clinicSharingPhoneLastSynced {"phone":"Nurse"'));
        expect(line).toContain(require("moment")(eightDaysAgo).format('D MMM'));
    });

    it("ends the camp from the hub, then lists who has left, lets the hub skip a phone that is gone, and closes only when all have", async () => {
        const sharing = {ssid: "AndroidShare_1", passphrase: "pass1234", qrValue: "{}"};
        const running = await show({sharing, hubCamp: true});
        const confirm = jest.spyOn(Alert, "alert").mockImplementation(() => {});
        await running.press("clinicSharingEndCamp");
        expect(running.fakes.clinicHubService.endCamp).not.toHaveBeenCalled();
        const [, message, buttons] = confirm.mock.calls[0];
        expect(message).toBe("clinicSharingEndCampConfirm");
        await act(async () => buttons.find(({text}) => text === "clinicSharingEndCamp").onPress());
        expect(running.fakes.clinicHubService.endCamp).toHaveBeenCalled();
        confirm.mockRestore();

        const phones = [
            {deviceId: "d-1", name: "Doctor", syncedAt: Date.now(), leftAt: Date.now()},
            {deviceId: "d-2", name: "Nurse", syncedAt: Date.now()},
        ];
        const ending = await show({sharing, hubCamp: true, campEnding: true, phones});
        expect(ending.lines()).toEqual(expect.arrayContaining(["clinicSharingCampEnding", 'clinicSharingPhoneLeft {"phone":"Doctor"}']));
        expect(ending.lines().some((line) => line.startsWith('clinicSharingPhoneNotLeft {"phone":"Nurse"'))).toBe(true);
        expect(ending.lines()).not.toContain("clinicSharingCloseHub");
        expect(ending.lines()).not.toContain("clinicSharingEndCamp");
        await ending.press('clinicSharingSkipPhone {"phone":"Nurse"}');
        expect(ending.fakes.clinicHubService.skipPhone).toHaveBeenCalledWith("d-2");

        const done = await show({sharing, hubCamp: true, campEnding: true, everyPhoneLeft: true, phones: [phones[0]]});
        await done.press("clinicSharingCloseHub");
        expect(done.fakes.clinicHubService.closeCamp).toHaveBeenCalled();
    });

    it("keeps a phone in its camp after it lost the hub, offering Rejoin and Leave camp, and no Start hub", async () => {
        const code = encodeJoinPayload({ssid: "AndroidShare_1", passphrase: "pass1234", hubId: "hub-1", epoch: "epoch-1", key: "A".repeat(43)});
        const {fakes, lines, press} = await show({admin: true, savedJoinCode: code, hubNetworkLost: true});

        expect(lines()).toEqual(expect.arrayContaining(["clinicSharingInCamp", 'clinicSharingRejoin {"hub":"AndroidShare_1"}', "clinicSharingScanNewCode", "clinicSharingLeaveHub"]));
        expect(lines()).not.toContain("clinicSharingStartHub");
        await press("clinicSharingLeaveHub");
        expect(fakes.clinicSpokeService.leaveHub).toHaveBeenCalled();
    });

    it("says why the phone left its camp: the hub ended it, or its setup differs, naming the types", async () => {
        const ended = await show({leftCamp: {code: "campEnded"}});
        expect(ended.lines()).toContain("clinicSharingCampEndedByHub");

        const differs = await show({leftCamp: {code: "setup", details: {types: ["Form", "Concept"]}}});
        expect(differs.lines()).toContain('clinicSharingError_setup {"types":"Form, Concept"}');
    });

    it("goes back to Home once joined, but stays when the first sync refused the phone", async () => {
        const navigator = require("../../../src/utility/CHSNavigator").default;
        const joined = await show({});
        joined.fakes.clinicSpokeService.joinWithCode.mockImplementation(async () => { joined.fakes.clinicSpokeService.joined = {ssid: "AndroidShare_1"}; });
        await act(async () => joined.renderer.root.findByType(ClinicSharingView).instance.joinAndGoHome("code"));
        expect(navigator.navigateToLandingView).toHaveBeenCalledTimes(1);

        const refused = await show({});
        refused.fakes.clinicSpokeService.joinWithCode.mockImplementation(async () => {});
        await act(async () => refused.renderer.root.findByType(ClinicSharingView).instance.joinAndGoHome("code"));
        expect(navigator.navigateToLandingView).toHaveBeenCalledTimes(1);
    });

    it("counts held uploads, and names the patient they wait on after 3 days", async () => {
        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
        const {lines, renderer} = await show({held: {count: 2, oldest: fourDaysAgo, items: [{uuid: "v-1", waitingOn: "p-1"}, {uuid: "v-2", waitingOn: "p-1"}]}});

        expect(lines()).toEqual(expect.arrayContaining([
            'clinicSharingHeldUploads {"count":2}',
            'clinicSharingHeldUploadsWaitingOn {"days":3,"records":"Sunita Devi"}',
        ]));
    });
});
