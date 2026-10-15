import {ClinicHubDiscovery, HUB_PORT, HUB_SERVICE} from "../../../src/framework/clinicsharing/ClinicHubDiscovery";

// Stands in for react-native-zeroconf: records calls, and lets a test emit what the scan finds.
const fakeZeroconf = () => {
    const listeners = {};
    return {
        publishService: jest.fn((options) => Promise.resolve({name: options.name})),
        unpublishService: jest.fn(() => Promise.resolve()),
        scan: jest.fn(),
        stop: jest.fn(),
        subscribe: jest.fn((event, listener) => {
            (listeners[event] = listeners[event] || []).push(listener);
            return () => { listeners[event] = listeners[event].filter((l) => l !== listener); };
        }),
        emit: (event, payload) => (listeners[event] || []).forEach((l) => l(payload)),
        listenerCount: (event) => (listeners[event] || []).length,
    };
};

const HUB = "5f0c6a8e-1d2b-4c3a-9e8f-7a6b5c4d3e2f";
const resolved = (overrides) => ({name: "Avni hub 5f0c6a8e", host: "hub.local.", port: HUB_PORT, addresses: ["192.168.49.1"], ipv4: ["192.168.49.1"], ipv6: [], txt: {hubId: HUB}, ...overrides});

describe("ClinicHubDiscovery", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("announces the hub with its id, on the hub's port", async () => {
        const zeroconf = fakeZeroconf();
        const name = await new ClinicHubDiscovery(() => zeroconf).publishHub({hubId: HUB});
        expect(name).toBe("Avni hub 5f0c6a8e");
        expect(zeroconf.publishService).toHaveBeenCalledWith({...HUB_SERVICE, name: "Avni hub 5f0c6a8e", port: 7373, txt: {hubId: HUB}});
    });

    it("finds the hub whose id matches, and stops looking", async () => {
        const zeroconf = fakeZeroconf();
        const found = new ClinicHubDiscovery(() => zeroconf).findHub(HUB, {timeoutMs: 30000});
        expect(zeroconf.scan).toHaveBeenCalledWith({...HUB_SERVICE, networkInterface: undefined});
        zeroconf.emit("resolved", resolved());
        await expect(found).resolves.toEqual({host: "192.168.49.1", port: 7373});
        expect(zeroconf.stop).toHaveBeenCalled();
        expect(zeroconf.listenerCount("resolved")).toBe(0);
    });

    it("keeps looking past other services, a hub with no IPv4 address, and errors about other services", async () => {
        const zeroconf = fakeZeroconf();
        const found = new ClinicHubDiscovery(() => zeroconf).findHub(HUB, {timeoutMs: 30000});
        // Each decoy has its own address, so taking one by mistake gives a different answer.
        zeroconf.emit("resolved", resolved({txt: {hubId: "another-hub"}, addresses: ["192.168.49.77"], ipv4: ["192.168.49.77"]}));
        zeroconf.emit("resolved", resolved({txt: {}, addresses: ["192.168.49.88"], ipv4: ["192.168.49.88"]}));
        zeroconf.emit("resolved", resolved({ipv4: [], addresses: ["fe80::1"], ipv6: ["fe80::1"]}));
        zeroconf.emit("error", new Error("resolve failed for some printer"));
        zeroconf.emit("resolved", resolved());
        await expect(found).resolves.toEqual({host: "192.168.49.1", port: 7373});
    });

    it("refuses a second search while one is running, and the first still finds the hub", async () => {
        const zeroconf = fakeZeroconf();
        const discovery = new ClinicHubDiscovery(() => zeroconf);
        const first = discovery.findHub(HUB, {timeoutMs: 30000});
        await expect(discovery.findHub(HUB, {timeoutMs: 30000})).rejects.toMatchObject({code: "FIND_IN_PROGRESS"});
        zeroconf.emit("resolved", resolved());
        await expect(first).resolves.toEqual({host: "192.168.49.1", port: 7373});
        expect(zeroconf.scan).toHaveBeenCalledTimes(1);
    });

    it("gives up when the time runs out", async () => {
        const zeroconf = fakeZeroconf();
        const found = new ClinicHubDiscovery(() => zeroconf).findHub(HUB, {timeoutMs: 30000});
        jest.advanceTimersByTime(30000);
        await expect(found).rejects.toMatchObject({code: "HUB_NOT_FOUND"});
        expect(zeroconf.stop).toHaveBeenCalled();
    });

    it("looks on the joined network's interface when it is given one", () => {
        const zeroconf = fakeZeroconf();
        new ClinicHubDiscovery(() => zeroconf).findHub(HUB, {timeoutMs: 30000, networkInterface: "wlan0"});
        expect(zeroconf.scan).toHaveBeenCalledWith({...HUB_SERVICE, networkInterface: "wlan0"});
    });
});
