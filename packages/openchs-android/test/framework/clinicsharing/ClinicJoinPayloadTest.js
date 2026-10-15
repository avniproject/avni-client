import {encodeJoinPayload, JOIN_PAYLOAD_VERSION, JoinPayloadError, parseJoinPayload} from "../../../src/framework/clinicsharing/ClinicJoinPayload";
import {generateSessionKey} from "../../../src/framework/clinicsharing/ClinicTransport";

// As in ClinicTransportTest: the JS build of libsodium stands in for the native one, with the same base64 defaults.
jest.mock("react-native-libsodium", () => require("libsodium-wrappers"));
jest.mock("react-native-tcp-socket", () => require("net"));

// 32 bytes, as card 3 makes it: libsodium to_base64, URL-safe with no padding (react-native-libsodium lib.native.ts:246)
const KEY = "q83vEjRWeJ-rze8SNFZ4kKvN7xI0VniQq83vEjRWeJA";
const valid = {ssid: "AndroidShare_4821", passphrase: "x7k2m9q4w1e8", hubId: "5f0c6a8e-1d2b-4c3a-9e8f-7a6b5c4d3e2f", epoch: "e1b2c3d4-0000-4000-8000-000000000001", key: KEY};

describe("ClinicJoinPayload", () => {
    it("round-trips everything a phone needs to join", () => {
        const text = encodeJoinPayload(valid);
        expect(JSON.parse(text).v).toBe(JOIN_PAYLOAD_VERSION);
        expect(parseJoinPayload(text)).toEqual({ok: true, payload: valid});
    });

    it("refuses to build a code with a missing or wrong field", () => {
        expect(() => encodeJoinPayload({...valid, ssid: ""})).toThrow(/ssid/);
        expect(() => encodeJoinPayload({...valid, passphrase: "short"})).toThrow(/passphrase/);
        expect(() => encodeJoinPayload({...valid, key: "c2hvcnQ="})).toThrow(/key/);
        expect(() => encodeJoinPayload({...valid, epoch: 7})).toThrow(/epoch/);
    });

    it("says a code that is not JSON is not JSON", () => {
        expect(parseJoinPayload("https://avniproject.org")).toEqual({ok: false, error: JoinPayloadError.notJson});
    });

    it("says JSON that is not a join code is not a clinic code", () => {
        expect(parseJoinPayload("null")).toEqual({ok: false, error: JoinPayloadError.notClinicCode});
        expect(parseJoinPayload("[1,2]")).toEqual({ok: false, error: JoinPayloadError.notClinicCode});
        expect(parseJoinPayload(JSON.stringify({hello: "world"}))).toEqual({ok: false, error: JoinPayloadError.notClinicCode});
        expect(parseJoinPayload(JSON.stringify({...valid, v: 1, hubId: ""}))).toEqual({ok: false, error: JoinPayloadError.notClinicCode});
    });

    it("tells a code from a newer app apart, so the phone can ask for an update", () => {
        expect(parseJoinPayload(JSON.stringify({...valid, v: 2}))).toEqual({ok: false, error: JoinPayloadError.newerVersion});
    });

    it("carries the session key exactly as the transport makes it", async () => {
        const key = await generateSessionKey();
        expect(parseJoinPayload(encodeJoinPayload({...valid, key})).payload.key).toBe(key);
    });

    it("refuses a key in standard base64, which the transport cannot read", () => {
        expect(() => encodeJoinPayload({...valid, key: "q83vEjRWeJ+rze8SNFZ4kKvN7xI0VniQq83vEjRWeJA="})).toThrow(/key/);
        expect(() => encodeJoinPayload({...valid, key: "q83vEjRWeJ-rze8SNFZ4kKvN7xI0VniQq83vEjRWeJA="})).toThrow(/key/);
    });

    it("refuses a password Android cannot use to join", () => {
        expect(() => encodeJoinPayload({...valid, passphrase: "pässwörd12"})).toThrow(/passphrase/);
        expect(parseJoinPayload(JSON.stringify({...valid, v: 1, passphrase: "pässwörd12"}))).toEqual({ok: false, error: JoinPayloadError.notClinicCode});
    });

    it("refuses a network name longer than Wi-Fi allows, counted in bytes", () => {
        expect(() => encodeJoinPayload({...valid, ssid: "A".repeat(33)})).toThrow(/ssid/);
        expect(() => encodeJoinPayload({...valid, ssid: "é".repeat(17)})).toThrow(/ssid/);
        expect(parseJoinPayload(encodeJoinPayload({...valid, ssid: "Café clinic"})).ok).toBe(true);
    });

    it("keeps only the known fields", () => {
        const result = parseJoinPayload(JSON.stringify({...valid, v: 1, extra: "x"}));
        expect(result.payload).toEqual(valid);
    });
});
