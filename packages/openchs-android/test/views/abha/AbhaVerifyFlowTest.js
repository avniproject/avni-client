import AbhaVerifyFlow, {
    hyphenatedAbhaNumber, MAX_RESENDS, METHODS, OTP_SYSTEMS, RESEND_AFTER_MS, STEPS, validationKey, verhoeffValid,
} from "../../../src/views/abha/verify/AbhaVerifyFlow";
import {EkaAbhaError} from "../../../src/service/EkaAbhaClient";

// Made-up values in the shapes the screens take. The Aadhaar-shaped one passes the check digit; the other does not.
const MOBILE = "9876501234";
const AADHAAR = "234123412346";
const BAD_AADHAAR = "234123412340";
const ABHA_NUMBER = "91111122223333";
const OTP = "482913";
const TYPED = [MOBILE, AADHAAR, ABHA_NUMBER, OTP];

const refusal = (status, sourceCode) => new EkaAbhaError("x", status, null, sourceCode);

function flowWith(replies = {}) {
    let now = 1_000_000;
    const client = {
        search: jest.fn(() => Promise.resolve({profiles: null, txn_id: "s-txn"})),
        methods: jest.fn(() => Promise.resolve({auth_methods: [], blocked_methods: []})),
        loginInit: jest.fn(() => Promise.resolve({txn_id: "i-txn", hint: "OTP sent to mobile number ending with ******1234"})),
        loginVerify: jest.fn(() => Promise.resolve({skip_state: "abha_end", txn_id: "v-txn", profile: {first_name: "Asha"}, eka: {oid: "oid-1"}})),
        loginPhr: jest.fn(() => Promise.resolve({skip_state: "abha_end", txn_id: "p-txn", profile: {first_name: "Asha"}, eka: {oid: "oid-1"}})),
        ...replies,
    };
    const onVerified = jest.fn();
    const onChange = jest.fn();
    const flow = new AbhaVerifyFlow(client, {environment: "sandbox", onChange, onVerified, now: () => now});
    return {flow, client, onVerified, onChange, later: (ms) => { now += ms; }};
}

const neverShown = (onChange) => {
    const everything = JSON.stringify(onChange.mock.calls);
    TYPED.forEach((value) => expect(everything).not.toContain(value));
};

describe("AbhaVerifyFlow", () => {
    describe("what the worker types", () => {
        it("takes a 10-digit mobile starting 6 to 9", () => {
            expect(validationKey(METHODS.MOBILE, MOBILE)).toBeNull();
            expect(validationKey(METHODS.MOBILE, "5876501234")).toBe("abhaVerifyMobileInvalid");
            expect(validationKey(METHODS.MOBILE, "98765")).toBe("abhaVerifyMobileInvalid");
        });

        it("takes an Aadhaar number only when its check digit is right, with NHA's message otherwise (CRT_ABHA_104)", () => {
            expect(verhoeffValid(AADHAAR)).toBe(true);
            expect(validationKey(METHODS.AADHAAR, AADHAAR)).toBeNull();
            expect(validationKey(METHODS.AADHAAR, BAD_AADHAAR)).toBe("abhaVerifyAadhaarInvalid");
            expect(validationKey(METHODS.AADHAAR, "23412341234")).toBe("abhaVerifyAadhaarInvalid");
            expect(validationKey(METHODS.AADHAAR, "abcd12341234")).toBe("abhaVerifyAadhaarInvalid");
        });

        it("takes 14 ABHA digits with or without hyphens, and sends them as ABDM writes them", () => {
            expect(validationKey(METHODS.ABHA_NUMBER, ABHA_NUMBER)).toBeNull();
            expect(validationKey(METHODS.ABHA_NUMBER, "91-1111-2222-3333")).toBeNull();
            expect(validationKey(METHODS.ABHA_NUMBER, "9111112222")).toBe("abhaNumberInvalid");
            expect(hyphenatedAbhaNumber(ABHA_NUMBER)).toBe("91-1111-2222-3333");
        });

        it("takes an ABHA address with or without its suffix", () => {
            expect(validationKey(METHODS.ABHA_ADDRESS, "asha.rao")).toBeNull();
            expect(validationKey(METHODS.ABHA_ADDRESS, "asha.rao@sbx")).toBeNull();
            expect(validationKey(METHODS.ABHA_ADDRESS, "a@")).toBe("abhaVerifyAddressInvalid");
        });

        it("refuses a wrong value without calling Eka", async () => {
            const {flow, client} = flowWith();
            flow.chooseMethod(METHODS.AADHAAR);
            await flow.submitIdentifier(BAD_AADHAAR);
            expect(flow.state.errorKey).toBe("abhaVerifyAadhaarInvalid");
            expect(flow.state.step).toBe(STEPS.IDENTIFIER);
            expect(client.loginInit).not.toHaveBeenCalled();
        });
    });

    describe("by mobile", () => {
        it("VRFY_ABHA_303: a mobile with no ABHA says so, with a create option, and no OTP is sent", async () => {
            const {flow, client, onChange} = flowWith();
            flow.chooseMethod(METHODS.MOBILE);
            await flow.submitIdentifier(MOBILE);
            expect(client.search).toHaveBeenCalledWith(MOBILE);
            expect(flow.state.step).toBe(STEPS.NOT_FOUND);
            expect(flow.state.notFoundKind).toBe(METHODS.MOBILE);
            expect(client.loginInit).not.toHaveBeenCalled();
            expect(flow.aadhaarForCreate()).toBeNull();
            neverShown(onChange);
        });

        it("VRFY_ABHA_303: ABDM's 'no ABHA' refusal of the search reads the same, and still sends no OTP", async () => {
            const {flow, client} = flowWith({search: jest.fn(() => Promise.reject(refusal(404, "ABDM-1114")))});
            flow.chooseMethod(METHODS.MOBILE);
            await flow.submitIdentifier(MOBILE);
            expect(flow.state.step).toBe(STEPS.NOT_FOUND);
            expect(client.loginInit).not.toHaveBeenCalled();
        });

        it("VRFY_ABHA_304: lists the ABHAs on the mobile first, and sends the OTP only for the one picked", async () => {
            const {flow, client, onChange} = flowWith({search: jest.fn(() => Promise.resolve({txn_id: "s-txn", profiles: [
                {index: 1, name: "Asha Rao", abha_number: "xx-xxxx-xxxx-1505", kyc_verified: "true"},
                {index: 2, name: "Ravi Rao", abha_number: "xx-xxxx-xxxx-7781", kyc_verified: "false"},
            ]}))});
            flow.chooseMethod(METHODS.MOBILE);
            await flow.submitIdentifier(MOBILE);
            expect(flow.state.step).toBe(STEPS.PROFILES);
            expect(flow.state.profiles).toEqual([
                {index: 1, name: "Asha Rao", abhaNumber: "xx-xxxx-xxxx-1505", kycVerified: true},
                {index: 2, name: "Ravi Rao", abhaNumber: "xx-xxxx-xxxx-7781", kycVerified: false},
            ]);
            expect(client.loginInit).not.toHaveBeenCalled();
            await flow.pickProfile(2);
            expect(client.loginInit).toHaveBeenCalledWith({method: "search", identifier: 2, txnId: "s-txn", otpSystem: "abdm"});
            expect(flow.state.step).toBe(STEPS.OTP);
            expect(flow.state.hint).toBe("OTP sent to mobile number ending with ******1234");
            neverShown(onChange);
        });

        it("ignores a pick that is not on the list", async () => {
            const {flow, client} = flowWith({search: jest.fn(() => Promise.resolve({txn_id: "s", profiles: [{index: 1}]}))});
            flow.chooseMethod(METHODS.MOBILE);
            await flow.submitIdentifier(MOBILE);
            await flow.pickProfile(9);
            expect(client.loginInit).not.toHaveBeenCalled();
        });
    });

    describe("by ABHA number and ABHA address", () => {
        it("VRFY_ABHA_101: the worker can send the OTP to the Aadhaar-linked mobile or to the ABHA's mobile", async () => {
            const {flow, client} = flowWith();
            flow.chooseMethod(METHODS.ABHA_NUMBER);
            await flow.submitIdentifier(ABHA_NUMBER, OTP_SYSTEMS.AADHAAR);
            expect(client.loginInit).toHaveBeenLastCalledWith({method: "abha_number", identifier: "91-1111-2222-3333", otpSystem: "aadhaar"});
            flow.back();
            await flow.submitIdentifier(ABHA_NUMBER, OTP_SYSTEMS.MOBILE);
            expect(client.loginInit).toHaveBeenLastCalledWith({method: "abha_number", identifier: "91-1111-2222-3333", otpSystem: "abdm"});
        });

        it("VRFY_ABHA_102: offers the OTP methods ABHA lists for the address, leaving out a blocked one", async () => {
            const {flow, client} = flowWith({methods: jest.fn(() => Promise.resolve({
                auth_methods: ["MOBILE_OTP", "AADHAAR_OTP"], blocked_methods: [], abha_number: "91-1111-2222-3333"}))});
            flow.chooseMethod(METHODS.ABHA_ADDRESS);
            await flow.submitIdentifier("asha.rao");
            expect(client.methods).toHaveBeenCalledWith("asha.rao@sbx");
            expect(flow.state.step).toBe(STEPS.OTP_CHOICE);
            expect(flow.state.otpChoices).toEqual(["aadhaar", "abdm"]);
            expect(client.loginInit).not.toHaveBeenCalled();

            const blocked = flowWith({methods: jest.fn(() => Promise.resolve({auth_methods: ["MOBILE_OTP", "AADHAAR_OTP"], blocked_methods: ["AADHAAR_OTP"]}))});
            blocked.flow.chooseMethod(METHODS.ABHA_ADDRESS);
            await blocked.flow.submitIdentifier("asha.rao@sbx");
            expect(blocked.flow.state.otpChoices).toEqual(["abdm"]);
        });

        it("VRFY_ABHA_102: an address's Aadhaar OTP goes through its ABHA number; its mobile OTP through the address", async () => {
            const {flow, client} = flowWith({methods: jest.fn(() => Promise.resolve({
                auth_methods: ["MOBILE_OTP", "AADHAAR_OTP"], abha_number: "91-1111-2222-3333"}))});
            flow.chooseMethod(METHODS.ABHA_ADDRESS);
            await flow.submitIdentifier("asha.rao");
            await flow.chooseOtpSystem(OTP_SYSTEMS.AADHAAR);
            expect(client.loginInit).toHaveBeenLastCalledWith({method: "abha_number", identifier: "91-1111-2222-3333", otpSystem: "aadhaar"});
            flow.back();
            await flow.submitIdentifier("asha.rao");
            await flow.chooseOtpSystem(OTP_SYSTEMS.MOBILE);
            expect(client.loginInit).toHaveBeenLastCalledWith({method: "phr_address", identifier: "asha.rao@sbx", otpSystem: "abdm"});
        });

        it("says so when ABHA lists no OTP method for the address", async () => {
            const {flow} = flowWith();
            flow.chooseMethod(METHODS.ABHA_ADDRESS);
            await flow.submitIdentifier("asha.rao");
            expect(flow.state.errorKey).toBe("abhaVerifyNoMethods");
            expect(flow.state.step).toBe(STEPS.IDENTIFIER);
        });
    });

    describe("by Aadhaar", () => {
        it("VRFY_ABHA_403: an Aadhaar with no ABHA says so after the OTP, and offers creation with that Aadhaar", async () => {
            const {flow, client, onVerified, onChange} = flowWith({loginVerify: jest.fn(() => Promise.resolve({skip_state: "abha_create", txn_id: "v"}))});
            flow.chooseMethod(METHODS.AADHAAR);
            await flow.submitIdentifier(AADHAAR);
            expect(client.loginInit).toHaveBeenCalledWith({method: "aadhaar_number", identifier: AADHAAR, otpSystem: "aadhaar"});
            await flow.submitOtp(OTP);
            expect(flow.state.step).toBe(STEPS.NOT_FOUND);
            expect(flow.state.notFoundKind).toBe(METHODS.AADHAAR);
            expect(flow.aadhaarForCreate()).toBe(AADHAAR);
            expect(onVerified).not.toHaveBeenCalled();
            neverShown(onChange);
        });

        it("VRFY_ABHA_403: ABDM's 'no ABHA' refusal at the OTP reads the same", async () => {
            const {flow} = flowWith({loginVerify: jest.fn(() => Promise.reject(refusal(404, "ABDM-1114")))});
            flow.chooseMethod(METHODS.AADHAAR);
            await flow.submitIdentifier(AADHAAR);
            await flow.submitOtp(OTP);
            expect(flow.state.step).toBe(STEPS.NOT_FOUND);
            expect(flow.aadhaarForCreate()).toBe(AADHAAR);
        });

        it("an Aadhaar holding ABHAs lists their addresses, and the one chosen completes the login", async () => {
            const {flow, client, onVerified} = flowWith({loginVerify: jest.fn(() => Promise.resolve({skip_state: "abha_select", txn_id: "v-txn",
                abha_profiles: [{abha_address: "asha.rao@sbx", name: "Asha Rao", kyc_verified: "VERIFIED"}]}))});
            flow.chooseMethod(METHODS.AADHAAR);
            await flow.submitIdentifier(AADHAAR);
            await flow.submitOtp(OTP);
            expect(flow.state.step).toBe(STEPS.SELECT);
            expect(flow.state.addresses).toEqual([{i: 0, abhaAddress: "asha.rao@sbx", name: "Asha Rao", kycVerified: true}]);
            await flow.selectAddress(0);
            expect(client.loginPhr).toHaveBeenCalledWith({txnId: "v-txn", abhaAddress: "asha.rao@sbx"});
            expect(onVerified).toHaveBeenCalledWith(expect.objectContaining({skip_state: "abha_end"}), METHODS.AADHAAR);
            expect(flow.aadhaarForCreate()).toBeNull();
        });
    });

    describe("the OTP", () => {
        async function atOtp(replies) {
            const made = flowWith(replies);
            made.flow.chooseMethod(METHODS.ABHA_NUMBER);
            await made.flow.submitIdentifier(ABHA_NUMBER, OTP_SYSTEMS.MOBILE);
            made.client.loginInit.mockClear();
            return made;
        }

        it("can be asked for again after 60 seconds, twice, and the third ask shows the limit and calls nobody", async () => {
            const {flow, client, later} = await atOtp();
            await flow.resend();
            expect(client.loginInit).not.toHaveBeenCalled();
            for (let i = 1; i <= MAX_RESENDS; i++) {
                later(RESEND_AFTER_MS);
                await flow.resend();
                expect(client.loginInit).toHaveBeenCalledTimes(i);
                expect(client.loginInit).toHaveBeenLastCalledWith({method: "abha_number", identifier: "91-1111-2222-3333", otpSystem: "abdm"});
            }
            later(RESEND_AFTER_MS);
            await flow.resend();
            expect(client.loginInit).toHaveBeenCalledTimes(MAX_RESENDS);
            expect(flow.state.resendLimitReached).toBe(true);
            expect(flow.state.errorKey).toBe("abhaVerifyResendLimit");
        });

        it("a wrong OTP is said and the same transaction kept for another try", async () => {
            const loginVerify = jest.fn()
                .mockImplementationOnce(() => Promise.reject(refusal(400, "ABDM-1204")))
                .mockImplementationOnce(() => Promise.resolve({skip_state: "abha_end", profile: {first_name: "Asha"}}));
            const {flow, onVerified} = await atOtp({loginVerify});
            await flow.submitOtp(OTP);
            expect(flow.state.step).toBe(STEPS.OTP);
            expect(flow.state.errorKey).toBe("abhaVerifyOtpFailed");
            expect(flow.state.errorDetail).toBe("ABDM-1204");
            await flow.submitOtp(OTP);
            expect(loginVerify.mock.calls.map(([args]) => args.txnId)).toEqual(["i-txn", "i-txn"]);
            expect(onVerified).toHaveBeenCalledTimes(1);
        });

        it("must have six digits before Eka is asked", async () => {
            const {flow, client} = await atOtp();
            await flow.submitOtp("12a4");
            expect(flow.state.errorKey).toBe("abhaVerifyOtpInvalid");
            expect(client.loginVerify).not.toHaveBeenCalled();
        });

        it("hands the profile back once, and keeps nothing typed after", async () => {
            const {flow, onVerified} = await atOtp();
            await flow.submitOtp(OTP);
            expect(flow.state.step).toBe(STEPS.DONE);
            expect(onVerified).toHaveBeenCalledWith(expect.objectContaining({eka: {oid: "oid-1"}}), METHODS.ABHA_NUMBER);
            expect([flow.identifier, flow.txn, flow.lastInit, flow.aadhaar]).toEqual([null, null, null, null]);
        });

        it("says the ABHA service is not answering when Eka cannot be reached or times out", async () => {
            const {flow} = await atOtp({loginVerify: jest.fn(() => Promise.reject(refusal(504)))});
            await flow.submitOtp(OTP);
            expect(flow.state.errorKey).toBe("abhaEkaUnavailable");
        });
    });

    it("goes back one step at a time, and says so when there is nothing left to go back to", async () => {
        const {flow} = flowWith();
        expect(flow.back()).toBe(false);
        flow.chooseMethod(METHODS.ABHA_NUMBER);
        await flow.submitIdentifier(ABHA_NUMBER, OTP_SYSTEMS.MOBILE);
        expect(flow.back()).toBe(true);
        expect(flow.state.step).toBe(STEPS.IDENTIFIER);
        expect(flow.back()).toBe(true);
        expect(flow.state.step).toBe(STEPS.METHOD);
    });
});
