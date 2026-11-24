const mockAuthDelayMs = {value: 0};
const mockGetService = (name) => name === "authService"
    ? {getAuthProviderService: () => ({
        getAuthToken: () => new Promise(resolve => setTimeout(() => resolve("token"), mockAuthDelayMs.value))
    })}
    : {getSettings: () => ({idpType: "cognito"})};
jest.mock("../../../src/GlobalContext", () => ({
    __esModule: true,
    default: {getInstance: () => ({beanRegistry: {getService: (name) => mockGetService(name), register: jest.fn()}})}
}));
jest.mock("@react-native-cookies/cookies", () => ({get: jest.fn(async () => ({}))}));

import {getJSONTimed, postTimed} from "../../../src/framework/http/requests";

const SLOW_AUTH_MS = 200;
// Large enough to be a speed sample; Devanagari is 3 bytes per letter, so bytes != string length.
const PAGE_TEXT = JSON.stringify({name: "राम".repeat(3000), items: [1, 2, 3]});

describe("timed requests used for the sync's speed", () => {
    let fetchedBodies;

    beforeEach(() => {
        fetchedBodies = [];
        mockAuthDelayMs.value = SLOW_AUTH_MS;
        global.fetch = jest.fn(async (url, init) => {
            fetchedBodies.push(init.body);
            return {status: 200, text: async () => PAGE_TEXT};
        });
    });

    it("times a download from after the auth token is ready", async () => {
        const {timings} = await getJSONTimed("https://server/individual");

        expect(timings.networkMs).toBeGreaterThanOrEqual(SLOW_AUTH_MS - 5);
        expect(timings.transferMs).toBeLessThan(SLOW_AUTH_MS / 2);
    });

    it("ends the transfer time when the response arrives, not after converting it to text", async () => {
        global.fetch = jest.fn(async () => ({
            status: 200,
            text: () => new Promise(resolve => setTimeout(() => resolve('{"a":1}'), SLOW_AUTH_MS))
        }));

        const {timings} = await getJSONTimed("https://server/individual");

        expect(timings.transferMs).toBeLessThan(SLOW_AUTH_MS / 2);
        expect(timings.networkMs).toBeGreaterThanOrEqual(2 * SLOW_AUTH_MS - 10);
    });

    it("sizes a download in UTF-8 bytes, not string length", async () => {
        const {timings} = await getJSONTimed("https://server/individual");

        expect(timings.bytes).toBe(Buffer.byteLength(PAGE_TEXT, "utf8"));
        expect(timings.bytes).toBe(PAGE_TEXT.length + 18000);
    });

    it("rejects a failed download with the server error", async () => {
        global.fetch = jest.fn(async () => ({status: 502, text: async () => "Bad gateway"}));

        await expect(getJSONTimed("https://server/individual")).rejects.toMatchObject({response: {status: 502}});
    });

    it("times an upload from after the auth token is ready and sizes its body", async () => {
        const record = {uuid: "u-1", name: "తెలుగు".repeat(1000)};

        const {timings} = await postTimed("https://server/individuals", record);

        expect(timings.transferMs).toBeLessThan(SLOW_AUTH_MS / 2);
        expect(timings.networkMs).toBeGreaterThanOrEqual(SLOW_AUTH_MS - 5);
        expect(timings.bytes).toBe(Buffer.byteLength(JSON.stringify(record), "utf8"));
        expect(timings.bytes).toBe(JSON.stringify(record).length + 12000);
        expect(fetchedBodies[0]).toBe(JSON.stringify(record));
    });
});
