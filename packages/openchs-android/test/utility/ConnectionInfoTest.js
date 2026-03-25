import {expect} from "chai";

const createConnectionInfoModule = ({fetchImpl} = {}) => {
    jest.resetModules();

    const fetch = fetchImpl || jest.fn(() => Promise.resolve({
        type: "wifi",
        effectiveType: "4g",
        isConnected: true,
        isInternetReachable: true,
        isWifiEnabled: true,
        details: {cellularGeneration: "4g"}
    }));

    jest.doMock("@react-native-community/netinfo", () => ({
        __esModule: true,
        default: {
            fetch
        }
    }));

    jest.doMock("../../src/utility/General", () => ({
        __esModule: true,
        default: {
            logError: jest.fn()
        }
    }));

    const connectionInfoModule = require("../../src/utility/ConnectionInfo");
    const General = require("../../src/utility/General").default;

    return {
        ...connectionInfoModule,
        fetch,
        General
    };
};

describe("ConnectionInfoTest", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it("returns fetched connection info when NetInfo responds before timeout", async () => {
        const {getConnectionInfo, fetch} = createConnectionInfoModule();

        const connectionInfoPromise = getConnectionInfo(3000);
        await Promise.resolve();
        const connectionInfo = await connectionInfoPromise;

        expect(fetch.mock.calls.length).to.equal(1);
        expect(connectionInfo).to.deep.equal({
            type: "wifi",
            effectiveType: "4g",
            isConnected: true,
            isInternetReachable: true,
            isWifiEnabled: true,
            details: {cellularGeneration: "4g"}
        });
    });

    it("returns Unknown fallback when NetInfo does not respond within timeout", async () => {
        const neverResolvingFetch = jest.fn(() => new Promise(() => {
        }));
        const {getConnectionInfo, fetch} = createConnectionInfoModule({fetchImpl: neverResolvingFetch});

        const connectionInfoPromise = getConnectionInfo(3000);
        jest.advanceTimersByTime(3000);
        const connectionInfo = await connectionInfoPromise;

        expect(fetch.mock.calls.length).to.equal(1);
        expect(connectionInfo).to.deep.equal({
            type: "Unknown",
            effectiveType: "Unknown",
            isConnected: false,
            isInternetReachable: false,
            isWifiEnabled: false,
            details: {}
        });
    });

    it("returns Unknown fallback when NetInfo.fetch rejects", async () => {
        const rejectedFetch = jest.fn(() => Promise.reject(new Error("boom")));
        const {getConnectionInfo, General} = createConnectionInfoModule({fetchImpl: rejectedFetch});

        const connectionInfo = await getConnectionInfo(3000);

        expect(connectionInfo).to.deep.equal({
            type: "Unknown",
            effectiveType: "Unknown",
            isConnected: false,
            isInternetReachable: false,
            isWifiEnabled: false,
            details: {}
        });
        expect(General.logError.mock.calls.length).to.equal(0);
    });
});
