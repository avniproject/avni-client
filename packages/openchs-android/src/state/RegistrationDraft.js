import _ from "lodash";
import {Individual} from "avni-models";

// SQLite rejects a draft subject without a name, a registration date and a real lowest address level.
export function canSaveRegistrationDraft(subject) {
    const addressUUID = _.get(subject, 'lowestAddressLevel.uuid');
    return !_.isEmpty(subject.firstName) && !_.isNil(subject.registrationDate)
        && !_.isEmpty(addressUUID) && addressUUID !== Individual.getAddressLevelDummyUUID();
}
