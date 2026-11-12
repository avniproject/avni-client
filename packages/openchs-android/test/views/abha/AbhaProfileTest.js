import {expect} from "chai";
import moment from "moment";
import AbhaProfile from "../../../src/views/abha/AbhaProfile";

const sdkPayload = (profile) => JSON.stringify({
    response: {
        skip_state: 1,
        method: 2,
        txn_id: "txn-1",
        data: {tokens: {sess: "patient-session-token", refresh: "patient-refresh-token"}, profile}
    }
});

describe('AbhaProfileTest', () => {
    it('maps a verified ABHA profile to registration fields', () => {
        const profile = AbhaProfile.fromSdkPayload(sdkPayload({
            fn: "Asha", mn: "K", ln: "Rao", fln: "Asha K Rao", gen: "F", dob: "1990-04-23",
            mobile: "9000000000", abha_number: "91-1234-5678-9012", "health-ids": ["asha.rao@abdm", "asha@abdm"],
            kyc_verified: true, oid: "oid-1", at: "x"
        }));
        expect(profile.firstName).to.equal("Asha");
        expect(profile.middleName).to.equal("K");
        expect(profile.lastName).to.equal("Rao");
        expect(profile.genderName).to.equal("Female");
        expect(moment(profile.dateOfBirth).format("YYYY-MM-DD")).to.equal("1990-04-23");
        expect(profile.mobile).to.equal("9000000000");
        expect(profile.abhaNumber).to.equal("91-1234-5678-9012");
        expect(profile.abhaAddress).to.equal("asha.rao@abdm");
        expect(profile.kycVerified).to.equal(true);
    });

    it('never carries the patient session tokens', () => {
        const profile = AbhaProfile.fromSdkPayload(sdkPayload({fn: "Asha", oid: "oid-1", at: "x"}));
        expect(JSON.stringify(profile)).to.not.contain("patient-session-token");
        expect(JSON.stringify(profile)).to.not.contain("patient-refresh-token");
    });

    it('splits the full name only when first and last names are absent', () => {
        expect(AbhaProfile.fromProfileRecord({fln: "Ravi Kumar Shetty"})).to.include({firstName: "Ravi", lastName: "Kumar Shetty"});
        expect(AbhaProfile.fromProfileRecord({fn: "Ravi", fln: "Ravi Kumar Shetty"})).to.include({firstName: "Ravi", lastName: null});
    });

    it('accepts the date formats ABDM uses and drops anything else', () => {
        expect(moment(AbhaProfile.fromProfileRecord({dob: "23-04-1990"}).dateOfBirth).format("YYYY-MM-DD")).to.equal("1990-04-23");
        expect(moment(AbhaProfile.fromProfileRecord({dob: "23/04/1990"}).dateOfBirth).format("YYYY-MM-DD")).to.equal("1990-04-23");
        expect(AbhaProfile.fromProfileRecord({dob: "April 1990"}).dateOfBirth).to.equal(null);
        expect(AbhaProfile.fromProfileRecord({}).dateOfBirth).to.equal(null);
    });

    it('maps only the genders Avni has and leaves unknown blank', () => {
        expect(AbhaProfile.fromProfileRecord({gen: "M"}).genderName).to.equal("Male");
        expect(AbhaProfile.fromProfileRecord({gen: "O"}).genderName).to.equal("Other");
        expect(AbhaProfile.fromProfileRecord({gen: "U"}).genderName).to.equal(null);
    });

    it('profileReadsOidTxnAndMethod, for the audit record', () => {
        const profile = AbhaProfile.fromSdkPayload(JSON.stringify({
            response: {skip_state: "abha_end", method: "aadhaar", txn_id: "txn-1", data: {profile: {fn: "Asha", oid: "oid-1"}}}
        }));
        expect(profile.ekaOid).to.equal("oid-1");
        expect(profile.ekaTxnId).to.equal("txn-1");
        expect(profile.route).to.equal("aadhaar");
        expect(profile.action).to.equal("linked");
    });

    it('records linked until the sandbox shows which field of the reply marks a new ABHA', () => {
        ["abha_create", "abha_end", 1, undefined].forEach((skipState) =>
            expect(AbhaProfile.fromSdkPayload({response: {skip_state: skipState, data: {profile: {fn: "Asha"}}}}).action,
                String(skipState)).to.equal("linked"));
    });

    it('routeMappedFromEkaMethod', () => {
        expect(AbhaProfile.routeOf("aadhaar")).to.equal("aadhaar");
        expect(AbhaProfile.routeOf("aadhaar_number")).to.equal("aadhaar");
        expect(AbhaProfile.routeOf("aadhaar_otp")).to.equal("aadhaar");
        expect(AbhaProfile.routeOf("mobile")).to.equal("mobile");
        expect(AbhaProfile.routeOf("abha_number")).to.equal("abha_number");
        expect(AbhaProfile.routeOf("abha_address")).to.equal("abha_address");
        expect(AbhaProfile.routeOf("phr_address")).to.equal("abha_address");
        expect(AbhaProfile.routeOf("ABHA_Number")).to.equal("abha_number");
    });

    it('names a method it does not know unknown, never a guess', () => {
        expect(AbhaProfile.routeOf(2)).to.equal("unknown");
        expect(AbhaProfile.routeOf("face_auth")).to.equal("unknown");
        expect(AbhaProfile.routeOf(undefined)).to.equal("unknown");
        expect(AbhaProfile.fromProfileRecord({fn: "Asha"}).route).to.equal("unknown");
    });

    it('compares ABHA numbers as digits only', () => {
        expect(AbhaProfile.digitsOnly("91-1234-5678-9012")).to.equal("91123456789012");
        expect(AbhaProfile.digitsOnly(" 9112 3456 7890 12 ")).to.equal("91123456789012");
        expect(AbhaProfile.digitsOnly(null)).to.equal(null);
        expect(AbhaProfile.digitsOnly("--")).to.equal(null);
    });

    it('returns null for a payload without a profile or not JSON', () => {
        expect(AbhaProfile.fromSdkPayload(JSON.stringify({response: {error: {code: 1, message: "bad"}}}))).to.equal(null);
        expect(AbhaProfile.fromSdkPayload("not json")).to.equal(null);
        expect(AbhaProfile.fromSdkPayload(null)).to.equal(null);
    });

    it('maskAbhaNumberKeepsLastFour', () => {
        expect(AbhaProfile.maskAbhaNumber("91-1234-5678-1234")).to.equal("xx-xxxx-xxxx-1234");
        expect(AbhaProfile.maskAbhaNumber("91123456781234")).to.equal("xx-xxxx-xxxx-1234");
        expect(AbhaProfile.maskAbhaNumber("")).to.equal(null);
        expect(AbhaProfile.maskAbhaNumber(null)).to.equal(null);
        expect(AbhaProfile.maskAbhaNumber("12")).to.equal(null);
    });
});

describe("AbhaProfile.fromEkaLogin, for Avni's own verify screens", () => {
    const reply = (profile, extra = {}) => ({txn_id: "txn-9", skip_state: "abha_end", eka: {oid: "oid-9", min_token: "patient-token"}, profile, ...extra});

    it("reads Eka's login reply into the same profile the SDK's reply gives", () => {
        const profile = AbhaProfile.fromEkaLogin(reply({
            first_name: "Asha", middle_name: "", last_name: "Rao", full_name: "Asha Rao", gender: "F",
            year_of_birth: 1990, month_of_birth: 4, day_of_birth: 3, mobile: "9876501234",
            abha_number: "91-1234-5678-9012", abha_address: "asha.rao@abdm", abha_addresses: ["asha.rao@abdm", "asha.r@abdm"], kyc_verified: true,
        }), "mobile");
        expect(profile.firstName).to.equal("Asha");
        expect(profile.middleName).to.equal(null);
        expect(profile.lastName).to.equal("Rao");
        expect(profile.genderName).to.equal("Female");
        expect(moment(profile.dateOfBirth).format("YYYY-MM-DD")).to.equal("1990-04-03");
        expect(profile.mobile).to.equal("9876501234");
        expect(profile.abhaNumber).to.equal("91-1234-5678-9012");
        expect(profile.abhaAddress).to.equal("asha.rao@abdm");
        expect(profile.kycVerified).to.equal(true);
        expect(profile.ekaOid).to.equal("oid-9");
        expect(profile.ekaTxnId).to.equal("txn-9");
        expect(profile.route).to.equal("mobile");
        expect(profile.action).to.equal("linked");
        expect(JSON.stringify(profile)).not.to.contain("patient-token");
    });

    it("takes the first of the addresses when the reply names no preferred one, and no date of birth from a partial one", () => {
        const profile = AbhaProfile.fromEkaLogin(reply({first_name: "Asha", abha_addresses: ["asha.r@abdm"], year_of_birth: 1990}), "aadhaar");
        expect(profile.abhaAddress).to.equal("asha.r@abdm");
        expect(profile.dateOfBirth).to.equal(null);
        expect(profile.route).to.equal("aadhaar");
    });

    it("is null with no profile, and a route it does not know reads unknown", () => {
        expect(AbhaProfile.fromEkaLogin({skip_state: "abha_select"}, "mobile")).to.equal(null);
        expect(AbhaProfile.fromEkaLogin(reply({first_name: "Asha"}), "fax").route).to.equal("unknown");
    });
});
