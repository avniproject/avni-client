import _ from "lodash";
import moment from "moment";

// Concepts the registration form uses for the ABHA identity. Named to match, with no mapping layer
// (ABHA M1 technical design, 11 Sep 2026); a form without them simply does not store the value.
export const ABHA_CONCEPT_NAMES = {abhaNumber: 'ABHA Number', abhaAddress: 'ABHA Address'};

// Eka's TProfileRecord (README of @eka-care/abha 0.2.2): fn, mn, ln, fln, gen 'M'|'F'|'O'|'U', dob, mobile,
// abha_number, 'health-ids' (ABHA addresses), kyc_verified. The same response carries the patient's ABHA
// session tokens; they are never read here, so they cannot end up in the subject.
const GENDER_NAMES = {M: 'Male', F: 'Female', O: 'Other'};
const DOB_FORMATS = ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD'];

class AbhaProfile {
    static fromSdkPayload(payload) {
        let parsed = payload;
        if (_.isString(payload)) {
            try {
                parsed = JSON.parse(payload);
            } catch (e) {
                return null;
            }
        }
        const record = _.get(parsed, 'response.data.profile');
        return _.isPlainObject(record) ? AbhaProfile.fromProfileRecord(record) : null;
    }

    static fromProfileRecord(record) {
        const fullNameParts = _.words(_.trim(record.fln), /[^\s]+/g);
        const firstName = _.trim(record.fn) || _.head(fullNameParts) || null;
        const lastName = _.trim(record.ln) || (_.trim(record.fn) ? null : _.join(_.tail(fullNameParts), ' ')) || null;
        const dob = moment(record.dob, DOB_FORMATS, true);
        return {
            firstName,
            middleName: _.trim(record.mn) || null,
            lastName,
            genderName: GENDER_NAMES[record.gen] || null,
            dateOfBirth: dob.isValid() ? dob.toDate() : null,
            mobile: _.trim(record.mobile) || null,
            abhaNumber: _.trim(record.abha_number) || null,
            abhaAddress: _.head(record['health-ids']) || null,
            kycVerified: record.kyc_verified === true,
        };
    }
}

export default AbhaProfile;
