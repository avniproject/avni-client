import {ClinicHubJoin, JOIN_TIMEOUT_MS, JoinError} from "../../../src/framework/clinicsharing/ClinicHubJoin";
import {encodeJoinPayload, JoinPayloadError} from "../../../src/framework/clinicsharing/ClinicJoinPayload";

const KEY = "q83vEjRWeJ-rze8SNFZ4kKvN7xI0VniQq83vEjRWeJA";
const HUB = {hubId: "5f0c6a8e-1d2b-4c3a-9e8f-7a6b5c4d3e2f", epoch: "e1b2c3d4-0000-4000-8000-000000000001", key: KEY};
const NETWORK = {ssid: "AndroidShare_4821", passphrase: "x7k2m9q4w1e8"};
const QR = encodeJoinPayload({...NETWORK, ...HUB});

const setUp = ({level = 34} = {}) => {
    const lost = [];
    const wifi = {
        canStartHub: jest.fn(() => level >= 29),
        canJoinByScan: jest.fn(() => level >= 29),
        apiLevel: jest.fn(() => level),
        startHotspot: jest.fn(() => Promise.resolve(NETWORK)),
        stopHotspot: jest.fn(() => Promise.resolve(true)),
        joinNetwork: jest.fn(() => Promise.resolve({ssid: NETWORK.ssid, gateway: "192.168.49.1"})),
        currentSsid: jest.fn(() => Promise.resolve(NETWORK.ssid)),
        wifiConnected: jest.fn(() => Promise.resolve(true)),
        wifiGateway: jest.fn(() => Promise.resolve("192.168.43.1")),
        leaveNetwork: jest.fn(() => Promise.resolve(true)),
        onNetworkLost: jest.fn((listener) => { lost.push(listener); return () => lost.splice(lost.indexOf(listener), 1); }),
    };
    const netInfoListeners = [];
    const netInfo = {addEventListener: jest.fn((listener) => { netInfoListeners.push(listener); return () => {}; })};
    const join = new ClinicHubJoin({wifi, netInfo});
    return {join, wifi, lost, netInfoListeners};
};

// Lets every promise chain started by a listener run to its end.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe("ClinicHubJoin on the hub", () => {
    it("raises the hotspot and hands back what the QR code shows, without waiting on anything else", async () => {
        const {join} = setUp();
        await expect(join.startHubNetwork(HUB)).resolves.toEqual({...NETWORK, qrValue: QR});
    });

    it("refuses below Android 10 without touching Wi-Fi", async () => {
        const {join, wifi} = setUp({level: 28});
        await expect(join.startHubNetwork(HUB)).rejects.toMatchObject({code: JoinError.hubNeedsAndroid10});
        expect(wifi.startHotspot).not.toHaveBeenCalled();
    });

    it("on stop, stops the hotspot", async () => {
        const {join, wifi} = setUp();
        await join.startHubNetwork(HUB);
        await join.stopHubNetwork();
        expect(wifi.stopHotspot).toHaveBeenCalled();
    });
});

describe("ClinicHubJoin on a phone", () => {
    it("on Android 10 or later, joins the hotspot from the code and connects to its gateway, which is the hub", async () => {
        const {join, wifi} = setUp({level: 34});
        await expect(join.joinHub(QR)).resolves.toEqual({host: "192.168.49.1", port: 7373, ...HUB, ssid: NETWORK.ssid});
        expect(wifi.joinNetwork).toHaveBeenCalledWith(NETWORK.ssid, NETWORK.passphrase, JOIN_TIMEOUT_MS);
    });

    it("says why a code is no good", async () => {
        const {join, wifi} = setUp();
        await expect(join.joinHub("hello")).rejects.toMatchObject({code: JoinError.badCode, details: {payloadError: JoinPayloadError.notJson}});
        expect(wifi.joinNetwork).not.toHaveBeenCalled();
    });

    it("says when the phone could not join the hotspot", async () => {
        const {join, wifi} = setUp();
        wifi.joinNetwork.mockReturnValue(Promise.reject(new Error("Could not join")));
        await expect(join.joinHub(QR)).rejects.toMatchObject({code: JoinError.joinFailed});
    });

    it("says the hub was not found when Android gives no gateway, and leaves the hub's network so the phone gets its usual Wi-Fi back", async () => {
        const {join, wifi} = setUp({level: 34});
        wifi.joinNetwork.mockReturnValue(Promise.resolve({ssid: NETWORK.ssid, gateway: null}));
        await expect(join.joinHub(QR)).rejects.toMatchObject({code: JoinError.hubNotFound});
        expect(wifi.leaveNetwork).toHaveBeenCalled();
    });

    it("below Android 10, checks the phone is already on the hub's network, then connects to that network's gateway", async () => {
        const {join, wifi} = setUp({level: 28});
        await expect(join.joinHub(QR)).resolves.toEqual({host: "192.168.43.1", port: 7373, ...HUB, ssid: NETWORK.ssid});
        expect(wifi.joinNetwork).not.toHaveBeenCalled();
    });

    it("below Android 10, never asks for the gateway of the wrong network", async () => {
        const {join, wifi} = setUp({level: 28});
        wifi.currentSsid.mockReturnValue(Promise.resolve("OfficeWifi"));
        await expect(join.joinHub(QR)).rejects.toMatchObject({code: JoinError.wrongNetwork});
        expect(wifi.wifiGateway).not.toHaveBeenCalled();
    });

    it("below Android 10, says the phone is on the wrong network, naming both", async () => {
        const {join, wifi} = setUp({level: 28});
        wifi.currentSsid.mockReturnValue(Promise.resolve("HomeWifi"));
        await expect(join.joinHub(QR)).rejects.toMatchObject({code: JoinError.wrongNetwork, details: {current: "HomeWifi", expected: NETWORK.ssid}});
    });

    it("below Android 10, says the phone cannot see its network when Android will not name it", async () => {
        const {join, wifi} = setUp({level: 28});
        wifi.currentSsid.mockReturnValue(Promise.resolve(null));
        await expect(join.joinHub(QR)).rejects.toMatchObject({code: JoinError.cannotReadNetwork});
    });

    it("below Android 10, says the phone is on the wrong network when it is on no Wi-Fi at all", async () => {
        const {join, wifi} = setUp({level: 28});
        wifi.currentSsid.mockReturnValue(Promise.resolve(null));
        wifi.wifiConnected.mockReturnValue(Promise.resolve(false));
        await expect(join.joinHub(QR)).rejects.toMatchObject({code: JoinError.wrongNetwork, details: {current: null, expected: NETWORK.ssid}});
    });

    it("refuses a second join while one is under way", async () => {
        const {join, wifi} = setUp();
        wifi.joinNetwork.mockReturnValue(new Promise(() => {}));
        join.joinHub(QR);
        await expect(join.joinHub(QR)).rejects.toMatchObject({code: JoinError.joinInProgress});
    });

    it("lets a new join start once the last one has failed", async () => {
        const {join, wifi} = setUp();
        wifi.joinNetwork.mockReturnValueOnce(Promise.reject(new Error("Could not join")));
        await expect(join.joinHub(QR)).rejects.toMatchObject({code: JoinError.joinFailed});
        await expect(join.joinHub(QR)).resolves.toMatchObject({host: "192.168.49.1"});
    });

    it("below Android 10, says the hub was not found when Android gives no gateway, and never leaves a network the person joined by hand", async () => {
        const {join, wifi} = setUp({level: 28});
        wifi.wifiGateway.mockReturnValue(Promise.resolve(null));
        await expect(join.joinHub(QR)).rejects.toMatchObject({code: JoinError.hubNotFound});
        expect(wifi.leaveNetwork).not.toHaveBeenCalled();
    });

    it("on Android 10 or later, asks for a fresh scan once when the hub's network goes", () => {
        const {join, lost} = setUp({level: 34});
        const onRejoinNeeded = jest.fn();
        join.watchHubNetwork({ssid: NETWORK.ssid}, onRejoinNeeded);
        lost[0]({ssid: "SomeOtherNetwork"});
        lost[0]({ssid: NETWORK.ssid});
        lost[0]({ssid: NETWORK.ssid});
        expect(onRejoinNeeded).toHaveBeenCalledTimes(1);
    });

    it("below Android 10, asks for a fresh scan when Wi-Fi moves off the hub's network", async () => {
        const {join, wifi, netInfoListeners} = setUp({level: 28});
        const onRejoinNeeded = jest.fn();
        join.watchHubNetwork({ssid: NETWORK.ssid}, onRejoinNeeded);
        netInfoListeners[0]({type: "wifi", isConnected: true});
        await flush();
        expect(onRejoinNeeded).not.toHaveBeenCalled();
        wifi.currentSsid.mockReturnValue(Promise.resolve("HomeWifi"));
        netInfoListeners[0]({type: "wifi", isConnected: true});
        await flush();
        expect(onRejoinNeeded).toHaveBeenCalledTimes(1);
    });

    it("below Android 10, an unreadable name while Wi-Fi is still connected is no reason to scan again", async () => {
        const {join, wifi, netInfoListeners} = setUp({level: 28});
        const onRejoinNeeded = jest.fn();
        join.watchHubNetwork({ssid: NETWORK.ssid}, onRejoinNeeded);
        wifi.currentSsid.mockReturnValue(Promise.resolve(null));
        netInfoListeners[0]({type: "wifi", isConnected: true});
        await flush();
        expect(onRejoinNeeded).not.toHaveBeenCalled();
        wifi.wifiConnected.mockReturnValue(Promise.resolve(false));
        netInfoListeners[0]({type: "none", isConnected: false});
        await flush();
        expect(onRejoinNeeded).toHaveBeenCalledTimes(1);
    });
});
