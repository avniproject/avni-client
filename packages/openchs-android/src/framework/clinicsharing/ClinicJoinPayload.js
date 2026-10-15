// epoch is new on every Start hub; key is ClinicTransport's 32-byte session key.
export const JOIN_PAYLOAD_VERSION = 1;

export const JoinPayloadError = Object.freeze({
    notJson: "notJson",
    notClinicCode: "notClinicCode",
    newerVersion: "newerVersion",
});

// libsodium's default base64 (URL-safe, unpadded) is always 43 characters; any other form would only fail at the handshake.
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;
// A WPA2 passphrase is 8 to 63 printable ASCII characters; Android refuses anything else, and a scanned code is untrusted.
const PASSPHRASE_PATTERN = /^[\x20-\x7E]{8,63}$/;
// A Wi-Fi network name is at most 32 bytes.
const SSID_MAX_BYTES = 32;

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;

const utf8Length = (text) => Array.from(text).reduce((bytes, character) => {
    const codePoint = character.codePointAt(0);
    return bytes + (codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4);
}, 0);

const invalidField = ({ssid, passphrase, hubId, epoch, key}) => {
    if (!isNonEmptyString(ssid) || utf8Length(ssid) > SSID_MAX_BYTES) return "ssid";
    if (typeof passphrase !== "string" || !PASSPHRASE_PATTERN.test(passphrase)) return "passphrase";
    if (!isNonEmptyString(hubId)) return "hubId";
    if (!isNonEmptyString(epoch)) return "epoch";
    if (typeof key !== "string" || !KEY_PATTERN.test(key)) return "key";
    return null;
};

export const encodeJoinPayload = ({ssid, passphrase, hubId, epoch, key}) => {
    const payload = {v: JOIN_PAYLOAD_VERSION, ssid, passphrase, hubId, epoch, key};
    const field = invalidField(payload);
    if (field) throw new Error(`Cannot make a join code: ${field} is missing or invalid`);
    return JSON.stringify(payload);
};

export const parseJoinPayload = (text) => {
    let payload;
    try {
        payload = JSON.parse(text);
    } catch (e) {
        return {ok: false, error: JoinPayloadError.notJson};
    }
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return {ok: false, error: JoinPayloadError.notClinicCode};
    if (Number.isInteger(payload.v) && payload.v > JOIN_PAYLOAD_VERSION) return {ok: false, error: JoinPayloadError.newerVersion};
    if (payload.v !== JOIN_PAYLOAD_VERSION || invalidField(payload)) return {ok: false, error: JoinPayloadError.notClinicCode};
    const {ssid, passphrase, hubId, epoch, key} = payload;
    return {ok: true, payload: {ssid, passphrase, hubId, epoch, key}};
};
