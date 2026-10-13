import _ from "lodash";
import {WorkItem} from "avni-models";

// A draft subject needs a name, a registration date and a lowest address level; SQLite rejects it without them.
export function canSaveRegistrationDraft(subject) {
    return !_.isEmpty(subject.firstName) && !_.isNil(subject.registrationDate) && !_.isNil(subject.lowestAddressLevel);
}

// A reopened draft starts from a plain registration, so one started from a household or group would be saved
// without its membership. Those drafts wait under Register instead.
export function canReopenRegistration(state) {
    const workItemType = _.get(_.invoke(state, 'workListState.workLists.getCurrentWorkItem'), 'type');
    return _.isNil(state.group) && !_.includes([WorkItem.type.ADD_MEMBER, WorkItem.type.HOUSEHOLD], workItemType);
}
