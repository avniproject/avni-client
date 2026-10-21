import React from "react";
import {Text, TouchableNativeFeedback} from "react-native";
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
jest.mock("../../../src/framework/clinicsharing/ClinicHubWifi", () => ({canStartHub: () => true}));
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
                      hubRestarted = false, hubNetworkLost = false, held = {count: 0, oldest: null, items: []}, refusal = null, hotspotStopped = false} = {}) {
    const fakes = {
        MessageService: {getI18n: () => ({t})},
        PrivilegeService: {hasAllPrivileges: () => admin},
        EntityService: {findByKey: (key, uuid) => (uuid === 'p-1' ? {nameString: 'Sunita Devi'} : undefined)},
        clinicHubService: {onChange: () => () => {}, getSharing: () => sharing, recentPhoneCount: () => 3, hotspotStopped,
            phonesSynced: () => [{deviceId: "d-1", name: "Doctor · Galaxy A15", syncedAt: new Date(2026, 9, 19, 14, 7).getTime()}],
            startSharing: jest.fn(async () => {}), stopSharing: jest.fn(async () => {})},
        clinicSpokeService: {onChange: () => () => {}, joined, lastSync, lastSyncedAt, hubRestarted, hubNetworkLost, savedJoinCode: async () => savedJoinCode,
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

    it("says why the hub stopped when its Wi-Fi stopped on its own, above Start hub", async () => {
        const stopped = await show({admin: true, hotspotStopped: true});
        expect(stopped.lines()).toEqual(expect.arrayContaining(["clinicSharingHubWifiStopped", "clinicSharingStartHub"]));

        const fresh = await show({admin: true});
        expect(fresh.lines()).not.toContain("clinicSharingHubWifiStopped");
    });

    it("does not show Start hub at all to other users", async () => {
        const {lines, renderer} = await show({admin: false});

        expect(lines()).toContain("clinicSharingScanToJoin");
        expect(lines()).not.toContain("clinicSharingStartHub");
    });

    it("shows a running hub's code, the phones synced lately, its storage refusal and Stop hub", async () => {
        const {renderer, lines} = await show({sharing: {ssid: "AndroidShare_1", passphrase: "pass1234", qrValue: "{}"}, refusal: {freeMb: 120}});

        expect(renderer.root.findByProps({testID: "qr"}).props.value).toBe("{}");
        expect(lines()).toEqual(expect.arrayContaining([
            'clinicSharingPhonesSyncedRecently {"count":3,"minutes":5}',
            'clinicSharingHubLowStorage {"freeMb":120}',
            "clinicSharingStopHub",
        ]));
        expect(lines()).not.toContain("clinicSharingScanToJoin");
        expect(lines().some((line) => line.startsWith('clinicSharingPhoneLastSynced {"phone":"Doctor · Galaxy A15","time":'))).toBe(true);
    });

    it("shows a joined phone's hub, last sync and failure in plain words, and syncs on request", async () => {
        const {fakes, lines, press, renderer} = await show({
            joined: {ssid: "AndroidShare_1"}, lastSyncedAt: new Date(), lastSync: {at: new Date(), error: {code: "timeout"}},
        });

        expect(lines()).toEqual(expect.arrayContaining(['clinicSharingJoinedTo {"hub":"AndroidShare_1"}', "clinicSharingError_timeout {}"]));
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

    it("counts held uploads, and names the patient they wait on after 3 days", async () => {
        const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
        const {lines, renderer} = await show({held: {count: 2, oldest: fourDaysAgo, items: [{uuid: "v-1", waitingOn: "p-1"}, {uuid: "v-2", waitingOn: "p-1"}]}});

        expect(lines()).toEqual(expect.arrayContaining([
            'clinicSharingHeldUploads {"count":2}',
            'clinicSharingHeldUploadsWaitingOn {"days":3,"records":"Sunita Devi"}',
        ]));
    });
});
