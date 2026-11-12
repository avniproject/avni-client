import EkaAbhaClient, {EKA_LOGIN_PATHS, EkaAbhaError} from "../../src/service/EkaAbhaClient";
import General from "../../src/utility/General";

const SESSION = {accessToken: "eka-key-7f3a", hipId: "hip-1", environment: "sandbox", expiresInSeconds: 1800};
// Made-up values in the shapes the calls carry; the Aadhaar-shaped one passes the check digit.
const MOBILE = "9876501234";
const AADHAAR = "234123412346";

const reply = (status, body) => Promise.resolve({ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body)});

describe("EkaAbhaClient", () => {
    let warn;
    beforeEach(() => { warn = jest.spyOn(General, "logWarn").mockImplementation(() => undefined); });
    afterEach(() => warn.mockRestore());

    const call = (fetch) => fetch.mock.calls[0];
    const bodyOf = (fetch) => JSON.parse(call(fetch)[1].body);

    it("calls Eka's sandbox host with the SDK's own headers, and never Avni's auth token", async () => {
        const fetch = jest.fn(() => reply(200, {profiles: [], txn_id: "t"}));
        await new EkaAbhaClient(SESSION, fetch).search(MOBILE);
        const [url, options] = call(fetch);
        expect(url).toBe("https://api.dev.eka.care" + EKA_LOGIN_PATHS.search);
        expect(options.method).toBe("POST");
        expect(options.headers).toEqual({
            "Content-Type": "application/json", auth: "eka-key-7f3a", "client-id": "ext", "X-Hip-Id": "hip-1", "X-ABHA-SDK-Version": "1.0.0",
        });
        expect(Object.keys(options.headers)).not.toContain("AUTH-TOKEN");
        expect(Object.keys(options.headers)).not.toContain("Authorization");
    });

    it("calls the live host for a production session, and refuses an unknown environment", async () => {
        const fetch = jest.fn(() => reply(200, {}));
        await new EkaAbhaClient({...SESSION, environment: "production"}, fetch).methods("asha@abdm");
        expect(call(fetch)[0]).toBe("https://api.eka.care" + EKA_LOGIN_PATHS.methods);
        expect(() => new EkaAbhaClient({...SESSION, environment: "staging"}, fetch)).toThrow();
    });

    it("sends each call's body as Eka documents it", async () => {
        const fetch = jest.fn(() => reply(200, {}));
        const client = new EkaAbhaClient(SESSION, fetch);
        await client.search(MOBILE);
        expect(bodyOf(fetch)).toEqual({mobile: MOBILE});
        fetch.mockClear();
        await client.methods("asha@abdm");
        expect(bodyOf(fetch)).toEqual({abha_address: "asha@abdm"});
        fetch.mockClear();
        await client.loginInit({method: "search", identifier: 2, txnId: "s-txn", otpSystem: "abdm"});
        expect(bodyOf(fetch)).toEqual({method: "search", identifier: "2", txn_id: "s-txn", otp_system: "abdm"});
        fetch.mockClear();
        await client.loginInit({method: "aadhaar_number", identifier: AADHAAR, otpSystem: "aadhaar"});
        expect(bodyOf(fetch)).toEqual({method: "aadhaar_number", identifier: AADHAAR, otp_system: "aadhaar"});
        fetch.mockClear();
        await client.loginVerify({txnId: "t1", otp: "123456"});
        expect(bodyOf(fetch)).toEqual({txn_id: "t1", otp: "123456"});
        fetch.mockClear();
        await client.loginPhr({txnId: "t2", abhaAddress: "asha@abdm"});
        expect(bodyOf(fetch)).toEqual({txn_id: "t2", phr_address: "asha@abdm"});
    });

    it("turns a refusal into its status and codes, and keeps Eka's message, which can quote what was typed, out of the error and the log", async () => {
        const fetch = jest.fn(() => reply(400, {code: 400, error: `No ABHA for ${MOBILE}`, source_error: {code: "ABDM-1114", message: `No ABHA for ${MOBILE}`}}));
        const error = await new EkaAbhaClient(SESSION, fetch).search(MOBILE).catch((e) => e);
        expect(error).toBeInstanceOf(EkaAbhaError);
        expect(error.status).toBe(400);
        expect(error.sourceCode).toBe("ABDM-1114");
        expect(error.message).not.toContain(MOBILE);
        expect(JSON.stringify(warn.mock.calls)).not.toContain(MOBILE);
    });

    it("drops a code that could be a number of the patient's", async () => {
        const fetch = jest.fn(() => reply(422, {code: AADHAAR, source_error: {code: "ABDM-1207"}}));
        const error = await new EkaAbhaClient(SESSION, fetch).loginInit({method: "aadhaar_number", identifier: AADHAAR}).catch((e) => e);
        expect(error.code).toBeNull();
        expect(error.sourceCode).toBe("ABDM-1207");
        expect(JSON.stringify(warn.mock.calls)).not.toContain(AADHAAR);
    });

    it("says Eka was not reached, with status 0, when the call never gets an answer", async () => {
        const fetch = jest.fn(() => Promise.reject(new Error(`socket closed for ${MOBILE}`)));
        const error = await new EkaAbhaClient(SESSION, fetch).search(MOBILE).catch((e) => e);
        expect(error.status).toBe(0);
        expect(JSON.stringify(warn.mock.calls)).not.toContain(MOBILE);
    });

    it("answers an empty object for a reply that is not JSON", async () => {
        const fetch = jest.fn(() => Promise.resolve({ok: true, status: 200, json: () => Promise.reject(new Error("not json"))}));
        expect(await new EkaAbhaClient(SESSION, fetch).search(MOBILE)).toEqual({});
    });
});
