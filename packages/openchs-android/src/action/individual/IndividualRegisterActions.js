import IndividualService from "../../service/IndividualService";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import EntityService from "../../service/EntityService";
import {DraftSubject, Gender, Individual, ObservationsHolder, Point, SubjectType} from "avni-models";
import IndividualRegistrationState from "../../state/IndividualRegistrationState";
import _ from 'lodash';
import GeolocationActions from "../common/GeolocationActions";
import IdentifierAssignmentService from "../../service/IdentifierAssignmentService";
import FormMappingService from "../../service/FormMappingService";
import GroupSubjectService from "../../service/GroupSubjectService";
import IndividualRelationshipService from "../../service/relationship/IndividualRelationshipService";
import OrganisationConfigService from "../../service/OrganisationConfigService";
import DraftSubjectService from "../../service/draft/DraftSubjectService";
import PhoneNumberVerificationActions from "../common/PhoneNumberVerificationActions";
import GroupAffiliationActions from "../common/GroupAffiliationActions";
import GroupAffiliationState from "../../state/GroupAffiliationState";
import QuickFormEditingActions from "../common/QuickFormEditingActions";

export class IndividualRegisterActions {
    static getInitialState(context) {
        const genders = context.get(EntityService).getAll(Gender.schema.name);
        const gendersSortedByName = _.sortBy(genders, "name");

        return {genders: gendersSortedByName};
    }

    static onLoad(state, action, context) {
        let isNewEntity = action.isDraftEntity || _.isNil(action.individualUUID);
        const individual = action.isDraftEntity ?
            IndividualRegisterActions.getDraftIndividual(action, context) :
            IndividualRegisterActions.getOrCreateIndividual(isNewEntity, action, context);
        const subjectType = individual.subjectType;
        const form = context.get(FormMappingService).findRegistrationForm(subjectType);

        //Populate identifiers much before form elements are hidden or sent to rules.
        //This will enable the value to be used in rules
        context.get(IdentifierAssignmentService).populateIdentifiers(form, new ObservationsHolder(individual.observations));
        const groupAffiliationState = new GroupAffiliationState();
        context.get(GroupSubjectService).populateGroups(individual.uuid, form, groupAffiliationState);
        const organisationConfigService = context.get(OrganisationConfigService);
        const customRegistrationLocations = organisationConfigService.getCustomRegistrationLocationsForSubjectType(subjectType.uuid);
        const isSaveDraftOn = organisationConfigService.isSaveDraftOn();
        const saveDrafts = isNewEntity && isSaveDraftOn;
        const minLevelTypeUUIDs = !_.isEmpty(customRegistrationLocations) ? customRegistrationLocations.locationTypeUUIDs : [];
        const newState = IndividualRegistrationState.createLoadState(form, state.genders, individual, action.workLists, minLevelTypeUUIDs, saveDrafts, groupAffiliationState);
        IndividualRegisterActions.setAgeState(newState);
        return QuickFormEditingActions.moveToPage(newState, action, context, IndividualRegisterActions);
    }

    static onFormLoad(state, action, context) {
        return action.pageNumber ? IndividualRegisterActions.onLoad(state, action, context) : state.clone();
    }

    static enterRegistrationDate(state, action) {
        const newState = state.clone();
        newState.individual.registrationDate = action.value;
        newState.handleValidationResult(newState.individual.validateRegistrationDate());
        return newState;
    }

    static enterFirstName(state, action, context) {
        const newState = state.clone();
        newState.individual.setFirstName(action.value);
        newState.handleValidationResults([newState.validateName(context), newState.individual.validateFirstName()], context);
        return newState;
    }

    static enterLastName(state, action, context) {
        const newState = state.clone();
        newState.individual.setLastName(action.value);
        newState.handleValidationResults([newState.validateName(context), newState.individual.validateLastName()], context);
        return newState;
    }

    static setProfilePicture(state, action, context) {
        const newState = state.clone();
        const isSame = action.value === newState.individual.profilePicture;
        newState.individual.profilePicture = isSame ? null : action.value;
        return newState;
    }

    static setLocation(state, action, context) {
        const newState = state.clone();
        const position = action.value;
        newState.individual.registrationLocation = Point.newInstance(position.coords.latitude, position.coords.longitude);
        newState.handleValidationResult(
            state.validateLocation(
                newState.individual.registrationLocation,
                Individual.validationKeys.REGISTRATION_LOCATION,
                context
            )
        );
        return newState;
    }

    static enterIndividualDOB(state, action) {
        const newState = state.clone();
        newState.individual.setDateOfBirth(action.value);
        IndividualRegisterActions.setAgeState(newState);
        newState.handleValidationResult(newState.household.validateRelativeAge(newState.individual));
        newState.handleValidationResult(newState.individual.validateDateOfBirth());
        return newState;
    }

    static setAgeState(state) {
        state.age = state.individual.getAge().durationValueAsString;
        state.ageProvidedInYears = state.individual.getAge().isInYears;
    }

    static enterIndividualDOBVerified(state, action) {
        const newState = state.clone();
        newState.individual.dateOfBirthVerified = action.value;
        return newState;
    }

    static enterIndividualAge(state, action) {
        const newState = state.clone();
        newState.age = action.value;
        newState.individual.setAge(action.value, state.ageProvidedInYears);
        newState.handleValidationResult(newState.household.validateRelativeAge(newState.individual));
        newState.handleValidationResult(newState.individual.validateDateOfBirth());
        return newState;
    }

    static enterIndividualAgeProvidedInYears(state, action) {
        const newState = state.clone();
        newState.ageProvidedInYears = action.value;
        newState.individual.setAge(state.age, action.value);
        newState.handleValidationResult(newState.individual.validateDateOfBirth());
        return newState;
    }

    static enterIndividualGender(state, action) {
        const newState = state.clone();
        newState.individual.gender = action.value;
        newState.handleValidationResult(newState.individual.validateGender());
        newState.handleValidationResult(newState.household.validateRelativeGender(action.value));
        return newState;
    }

    static enterIndividualAddressLevel(state, action) {
        const newState = state.clone();
        newState.individual.lowestAddressLevel = action.value;
        newState.handleValidationResult(newState.individual.validateAddress());
        return newState;
    }

    static onNext(state, action, context) {
        const newState = state.clone().handleNext(action, context);
        if (state.saveDrafts && _.isEmpty(newState.validationResults)) {
            const draftIndividual = DraftSubject.create(state.individual);
            context.get(DraftSubjectService).saveDraftSubject(draftIndividual);
        }
        return newState;
    }

    static onSummaryPage(state, action, context) {
        return state.clone().handleSummaryPage(action, context);
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        context.get(IndividualService).register(newState.individual, action.nextScheduledVisits, action.skipCreatingPendingStatus, newState.groupAffiliation.groupSubjectObservations);
        const {member, headOfHousehold, individualRelative} = newState.household;
        if (!_.isNil(member)) {
            member.memberSubject = context.get(IndividualService).findByUUID(newState.individual.uuid);
            const addRelative = member.groupSubject.isHousehold() && !headOfHousehold;
            individualRelative.relative = newState.individual;
            context.get(GroupSubjectService).addMember(member, addRelative, individualRelative);
        }
        action.cb();
        context.get(DraftSubjectService).deleteDraftSubjectByUUID(newState.individual.uuid);
        return newState;
    }

    static getDraftIndividual(action, context) {
        const draftSubject = context.get(DraftSubjectService).findByUUID(action.individualUUID);
        const subject = draftSubject.constructIndividual();
        subject.name = subject.nameString;
        return subject;
    }

    static getOrCreateIndividual(isNewEntity, action, context) {
        let individual;
        if (isNewEntity) {
            individual = Individual.createEmptySubjectInstance();
        } else {
            const subjectFromDB = context.get(IndividualService).findByUUID(action.individualUUID);
            individual = subjectFromDB.cloneForEdit();
        }
        const currentWorkItem = action.workLists.getCurrentWorkItem();
        const groupSubject = _.get(currentWorkItem, 'parameters.member.groupSubject');
        if (isNewEntity && (groupSubject && groupSubject.isHousehold())) {
            individual.lowestAddressLevel = _.get(groupSubject, 'lowestAddressLevel');
        }

        const subjectType = context.get(EntityService).findByKey('name', currentWorkItem.parameters.subjectTypeName, SubjectType.schema.name);

        if (_.isEmpty(individual.subjectType.name)) {
            individual.subjectType = subjectType;
        }
        return individual;
    }
}

const actions = {
    ON_LOAD: "REGISTRATION_ON_LOAD",
    ON_FORM_LOAD: "REGISTRATION_ON_FORM_LOAD",
    NEXT: "REGISTRATION_NEXT",
    SUMMARY_PAGE: "REGISTRATION_SUMMARY_PAGE",
    PREVIOUS: "REGISTRATION_PREVIOUS",
    REGISTRATION_ENTER_REGISTRATION_DATE: "REGISTRATION_ENTER_REGISTRATION_DATE",
    REGISTRATION_ENTER_FIRST_NAME: "REGISTRATION_ENTER_FIRST_NAME",
    REGISTRATION_ENTER_LAST_NAME: "REGISTRATION_ENTER_LAST_NAME",
    REGISTRATION_ENTER_DOB: "REGISTRATION_ENTER_DOB",
    REGISTRATION_ENTER_DOB_VERIFIED: "REGISTRATION_ENTER_DOB_VERIFIED",
    REGISTRATION_ENTER_AGE: "REGISTRATION_ENTER_AGE",
    REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS: "REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS",
    REGISTRATION_ENTER_GENDER: "REGISTRATION_ENTER_GENDER",
    REGISTRATION_ENTER_ADDRESS_LEVEL: "REGISTRATION_ENTER_ADDRESS_LEVEL",
    TOGGLE_MULTISELECT_ANSWER: "b2af8248-ad5e-4639-ba6d-02b25c813e5e",
    TOGGLE_SINGLESELECT_ANSWER: "cdc7b1c2-d5aa-4382-aa93-1663275132f7",
    PRIMITIVE_VALUE_CHANGE: '13230ada-ee22-4a50-a2a8-5f14d1d9cd46',
    PRIMITIVE_VALUE_END_EDITING: '84f511d9-acf0-412d-951b-4226f7c6cf47',
    DATE_DURATION_CHANGE: '17e164f5-756d-4fe5-b3e4-41dad53abb53',
    DURATION_CHANGE: 'b1136ef7-202b-4a41-8b82-5603a4f90000',
    SAVE: 'IRA.SAVE',
    RESET: 'IRA.RESET',
    REGISTRATION_SET_PROFILE_PICTURE: "REGISTRATION_SET_PROFILE_PICTURE",
    REGISTRATION_SET_LOCATION: "REGISTRATION_SET_LOCATION",
    SET_LOCATION_ERROR: "IRA.SET_LOCATION_ERROR",
    PHONE_NUMBER_CHANGE: "IRA.PHONE_NUMBER_CHANGE",
    GROUP_QUESTION_VALUE_CHANGE: "IRA.GROUP_QUESTION_VALUE_CHANGE",
    ON_SUCCESS_OTP_VERIFICATION: "IRA.ON_SUCCESS_OTP_VERIFICATION",
    ON_SKIP_VERIFICATION: "IRA.ON_SKIP_VERIFICATION",
    TOGGLE_GROUPS: "IRA.TOGGLE_GROUPS",
};

export default new Map([
    [actions.ON_LOAD, IndividualRegisterActions.onLoad],
    [actions.ON_FORM_LOAD, IndividualRegisterActions.onFormLoad],
    [actions.NEXT, IndividualRegisterActions.onNext],
    [actions.SUMMARY_PAGE, IndividualRegisterActions.onSummaryPage],
    [actions.PREVIOUS, IndividualRegisterActions.onPrevious],
    [actions.REGISTRATION_ENTER_REGISTRATION_DATE, IndividualRegisterActions.enterRegistrationDate],
    [actions.REGISTRATION_ENTER_FIRST_NAME, IndividualRegisterActions.enterFirstName],
    [actions.REGISTRATION_ENTER_LAST_NAME, IndividualRegisterActions.enterLastName],
    [actions.REGISTRATION_ENTER_DOB, IndividualRegisterActions.enterIndividualDOB],
    [actions.REGISTRATION_ENTER_DOB_VERIFIED, IndividualRegisterActions.enterIndividualDOBVerified],
    [actions.REGISTRATION_ENTER_AGE, IndividualRegisterActions.enterIndividualAge],
    [actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, IndividualRegisterActions.enterIndividualAgeProvidedInYears],
    [actions.REGISTRATION_ENTER_GENDER, IndividualRegisterActions.enterIndividualGender],
    [actions.REGISTRATION_ENTER_ADDRESS_LEVEL, IndividualRegisterActions.enterIndividualAddressLevel],
    [actions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [actions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [actions.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [actions.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [actions.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [actions.SAVE, IndividualRegisterActions.onSave],
    [actions.REGISTRATION_SET_PROFILE_PICTURE, IndividualRegisterActions.setProfilePicture],
    [actions.REGISTRATION_SET_LOCATION, IndividualRegisterActions.setLocation],
    [actions.SET_LOCATION_ERROR, GeolocationActions.setLocationError],
    [actions.PHONE_NUMBER_CHANGE, ObservationsHolderActions.onPhoneNumberChange],
    [actions.GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onGroupQuestionChange],
    [actions.ON_SUCCESS_OTP_VERIFICATION, PhoneNumberVerificationActions.onSuccessVerification],
    [actions.ON_SKIP_VERIFICATION, PhoneNumberVerificationActions.onSkipVerification],
    [actions.TOGGLE_GROUPS, GroupAffiliationActions.updateValue],
]);

export {actions as Actions};
