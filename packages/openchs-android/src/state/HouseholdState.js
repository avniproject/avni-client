import {ValidationResult} from "openchs-models";

export default class HouseholdState {
    static validationKeys = {
        TOTAL_MEMBERS: 'TOTAL_MEMBERS'
    };

    constructor() {
        this.totalMembers = '';
    }

    setTotalMembers(totalMembers) {
        this.totalMembers = totalMembers.replace(/\D/g, '');
    }

    validateTotalMembers() {
        return _.isEmpty(this.totalMembers) ? ValidationResult.failure(HouseholdState.validationKeys.TOTAL_MEMBERS, 'emptyValidationMessage') : ValidationResult.successful(HouseholdState.validationKeys.TOTAL_MEMBERS)
    }

    clone() {
        const household = new HouseholdState();
        household.totalMembers = this.totalMembers;
        return household;
    }
}
