import _ from "lodash";

// A draft subject needs a name, a registration date and a lowest address level; SQLite rejects it without them.
export function canSaveRegistrationDraft(subject) {
    return !_.isEmpty(subject.firstName) && !_.isNil(subject.registrationDate) && !_.isNil(subject.lowestAddressLevel);
}
