import {ValidationResult, WorkItem} from "openchs-models";
import _ from "lodash";

export default class HouseholdState {
    static validationKeys = {
        TOTAL_MEMBERS: 'TOTAL_MEMBERS',
        RELATIVE_GENDER: 'RELATIVE_GENDER',
        RELATIVE_AGE: 'RELATIVE',
    };

    constructor(workLists) {
        this.totalMembers = '';
        const workItem = workLists && workLists.getCurrentWorkItem() || {};
        if (_.includes([WorkItem.type.ADD_MEMBER, WorkItem.type.HOUSEHOLD], workItem.type)) {
            const {member, headOfHousehold, individualRelative, relativeGender} = workItem.parameters;
            this.member = member;
            this.headOfHousehold = headOfHousehold;
            this.individualRelative = individualRelative;
            this.relativeGender = relativeGender;
        }
    }

    setTotalMembers(totalMembers) {
        this.totalMembers = totalMembers.replace(/\D/g, '');
    }

    validateTotalMembers() {
        return _.isEmpty(this.totalMembers) ? ValidationResult.failure(HouseholdState.validationKeys.TOTAL_MEMBERS, 'emptyValidationMessage') : ValidationResult.successful(HouseholdState.validationKeys.TOTAL_MEMBERS)
    }

    validateRelativeGender(selectedGender) {
        if (this.relativeGender) {
            return selectedGender.uuid !== this.relativeGender.uuid ? ValidationResult.failure(HouseholdState.validationKeys.RELATIVE_GENDER, 'genderDoesNotMatchWithRelativeGender') : ValidationResult.successful(HouseholdState.validationKeys.RELATIVE_GENDER);
        } else {
            return ValidationResult.successful(HouseholdState.validationKeys.RELATIVE_GENDER)
        }
    }

    validateRelativeAge(relative) {
        if (this.relativeGender) {
            this.individualRelative.relative = relative;
            return this.individualRelative.validateAge() || ValidationResult.successful(HouseholdState.validationKeys.RELATIVE_AGE);
        } else {
            return ValidationResult.successful(HouseholdState.validationKeys.RELATIVE_AGE)
        }
    }

    clone() {
        const household = new HouseholdState();
        household.totalMembers = this.totalMembers;
        household.member = this.member;
        household.headOfHousehold = this.headOfHousehold;
        household.individualRelative = this.individualRelative;
        household.relativeGender = this.relativeGender;
        return household;
    }
}
