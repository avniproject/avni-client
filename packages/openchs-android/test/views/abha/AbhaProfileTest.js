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
            mobile: "9000000000", abha_number: "91-1234-5678-9012", "health-ids": ["asha.rao@sbx", "asha@sbx"],
            kyc_verified: true, oid: "oid-1", at: "x"
        }));
        expect(profile.firstName).to.equal("Asha");
        expect(profile.middleName).to.equal("K");
        expect(profile.lastName).to.equal("Rao");
        expect(profile.genderName).to.equal("Female");
        expect(moment(profile.dateOfBirth).format("YYYY-MM-DD")).to.equal("1990-04-23");
        expect(profile.mobile).to.equal("9000000000");
        expect(profile.abhaNumber).to.equal("91-1234-5678-9012");
        expect(profile.abhaAddress).to.equal("asha.rao@sbx");
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

    it('returns null for a payload without a profile or not JSON', () => {
        expect(AbhaProfile.fromSdkPayload(JSON.stringify({response: {error: {code: 1, message: "bad"}}}))).to.equal(null);
        expect(AbhaProfile.fromSdkPayload("not json")).to.equal(null);
        expect(AbhaProfile.fromSdkPayload(null)).to.equal(null);
    });
});
