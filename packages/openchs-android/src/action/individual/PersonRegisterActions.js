import {InteractionManager} from "react-native";
import IndividualService from "../../service/IndividualService";
import ObservationsHolderActions from "../common/ObservationsHolderActions";
import {EDGE_MODEL_ACTION} from "../../service/EdgeModelService";
import {RULE_SERVICE_ACTION} from "../../service/RuleService";
import EntityService from "../../service/EntityService";
import {DraftSubject, Gender, Individual, Observation, ObservationsHolder, Point, SubjectType} from "avni-models";
import IndividualRegistrationState from "../../state/IndividualRegistrationState";
import Wizard from "../../state/Wizard";
import _ from "lodash";
import GeolocationActions from "../common/GeolocationActions";
import IdentifierAssignmentService from "../../service/IdentifierAssignmentService";
import FormMappingService from "../../service/FormMappingService";
import GroupSubjectService from "../../service/GroupSubjectService";
import OrganisationConfigService from "../../service/OrganisationConfigService";
import DraftSubjectService from "../../service/draft/DraftSubjectService";
import DraftConfigService from "../../service/DraftConfigService";
import PhoneNumberVerificationActions from "../common/PhoneNumberVerificationActions";
import GroupAffiliationActions from "../common/GroupAffiliationActions";
import GroupAffiliationState from "../../state/GroupAffiliationState";
import QuickFormEditingActions from "../common/QuickFormEditingActions";
import TimerActions from "../common/TimerActions";
import TaskService from "../../service/task/TaskService";
import General from "../../utility/General";
import moment from "moment";
import AddressLevelService from "../../service/AddressLevelService";
import {canSaveRegistrationDraft} from "../../state/RegistrationDraft";
import UserInfoService from "../../service/UserInfoService";
import ConceptService from "../../service/ConceptService";
import {ABHA_CONCEPT_NAMES} from "../../views/abha/AbhaProfile";

const NO_ABHA_LOCKS = {firstName: false, middleName: false, lastName: false, dateOfBirth: false, gender: false};

export class PersonRegisterActions {
    static getInitialState(context) {
        const genders = context.get(EntityService).getAll(Gender.schema.name);
        const gendersSortedByName = _.sortBy(genders, "name");
        return new IndividualRegistrationState([], null, new Wizard(1, 2, 1), gendersSortedByName, null, true, Individual.createEmptySubjectInstance(), null, true, [], null, null, null);
    }

    static onLoad(state, action, context) {
        let isNewEntity = action.isDraftEntity || _.isNil(action.individualUUID);
        const individual = action.isDraftEntity ?
            PersonRegisterActions.getDraftIndividual(action, context) :
            PersonRegisterActions.getOrCreateIndividual(isNewEntity, action, context);
        const subjectType = individual.subjectType;
        const form = context.get(FormMappingService).findRegistrationForm(subjectType);

        //Populate identifiers much before form elements are hidden or sent to rules.
        //This will enable the value to be used in rules
        context.get(IdentifierAssignmentService).populateIdentifiers(form, new ObservationsHolder(individual.observations));
        const groupAffiliationState = new GroupAffiliationState();
        context.get(GroupSubjectService).populateGroups(individual.uuid, form, groupAffiliationState);
        const organisationConfigService = context.get(OrganisationConfigService);
        const customRegistrationLocations = organisationConfigService.getCustomRegistrationLocationsForSubjectType(subjectType.uuid);
        const saveDrafts = context.get(DraftConfigService).shouldSaveDraft(isNewEntity, action.isDraftEntity);
        const minLevelTypeUUIDs = !_.isEmpty(customRegistrationLocations) ? customRegistrationLocations.locationTypeUUIDs : [];

        let group;
        if(!_.isUndefined(action.groupSubjectUUID)) {
           group = context.get(IndividualService).findByUUID(action.groupSubjectUUID);
        }

        if (!_.isNil(action.taskUuid)) {
            const observations = context.get(TaskService).getObservationsForSubject(action.taskUuid, form);
            individual.observations.push(...observations);
        }

        const newState = IndividualRegistrationState.createLoadState(form, state.genders, individual, action.workLists, minLevelTypeUUIDs, saveDrafts, groupAffiliationState, isNewEntity, group);
        newState.abha = PersonRegisterActions.abhaStateOnLoad(form, individual, context);
        PersonRegisterActions.setAgeState(newState);

        // Defer the wizard fast-forward chain past any in-flight slide animation, so its post-render async work
        // cannot freeze the navigation transition into the registration form.
        InteractionManager.runAfterInteractions(() => {
            QuickFormEditingActions.moveToPageAsync(newState, action, context, PersonRegisterActions);
        });
        return newState;
    }

    // ABDM M1. Held in the reducer because the view does not re-render on form pages. enabledForUser: the
    // organisation has ABHA on and the user has a health centre. formHasConcepts: the registration form asks both
    // ABHA questions. linked: the patient has an ABHA answer. locked: the patient has an ABHA number, so Aadhaar
    // checked name, date of birth and gender; it follows the saved answer, and only with ABHA on for the user,
    // since Remove ABHA link, the only way to lift it, is shown only then. choice: the option the worker took,
    // null until then.
    static abhaStateOnLoad(form, individual, context) {
        const enabledForUser = context.get(OrganisationConfigService).isAbhaEnabled()
            && !_.isEmpty(_.get(context.get(UserInfoService).getUserSettings(), 'abhaHipId'));
        if (!enabledForUser) return {enabledForUser: false, formHasConcepts: false, linked: false, locked: false, lockedFields: NO_ABHA_LOCKS, dobVerifiedByAbha: false, choice: null};
        const conceptNames = _.isNil(form) ? [] :
            _.flatMap(form.getFormElementGroups(), (group) => group.getFormElements()).map((formElement) => formElement.concept.name);
        return {
            enabledForUser,
            formHasConcepts: _.every(_.values(ABHA_CONCEPT_NAMES), (name) => _.includes(conceptNames, name)),
            linked: PersonRegisterActions.hasAbhaAnswer(individual),
            locked: PersonRegisterActions.hasAbhaNumber(individual),
            lockedFields: PersonRegisterActions.lockedFieldsOf(individual),
            dobVerifiedByAbha: false,
            choice: null,
        };
    }

    static hasAbhaAnswer(individual) {
        return _.some(_.values(ABHA_CONCEPT_NAMES), (name) => !_.isNil(individual.findObservation(name)));
    }

    static hasAbhaNumber(individual) {
        return !_.isNil(individual.findObservation(ABHA_CONCEPT_NAMES.abhaNumber));
    }

    // On load there is no record of what the ABHA filled, so every detail the saved patient has counts.
    static lockedFieldsOf(individual) {
        if (!PersonRegisterActions.hasAbhaNumber(individual)) return NO_ABHA_LOCKS;
        return {
            firstName: !_.isEmpty(individual.firstName), middleName: !_.isEmpty(individual.middleName), lastName: !_.isEmpty(individual.lastName),
            dateOfBirth: !_.isNil(individual.dateOfBirth), gender: !_.isNil(individual.gender),
        };
    }

    // Hidden while an ABHA from Eka's screens is being checked (busy), so a second tap cannot open them again.
    static abhaOptionsShown(abha) {
        return !!abha && abha.enabledForUser && _.isNil(abha.choice) && !abha.linked && !abha.busy;
    }

    // busy: from Eka's screens closing with an ABHA until it fills the form in or fails.
    static onAbhaBusy(state, action) {
        if (!PersonRegisterActions.isForThisPatient(state, action)) return state;
        const newState = state.clone();
        newState.abha = {...newState.abha, busy: !!action.busy};
        return newState;
    }

    static onAbhaChoice(state, action) {
        const newState = state.clone();
        newState.abha = {...newState.abha, choice: action.choice};
        return newState;
    }

    // An ABHA action names the patient whose screen started it. The registration store is shared by every
    // registration, so one that arrives after that screen has gone must not change the patient on the screen now.
    static isForThisPatient(state, action) {
        return !_.isNil(action.subjectUUID) && action.subjectUUID === _.get(state, 'individual.uuid');
    }

    // The verified ABHA profile fills the first page through the handlers the fields use, so validation runs as if
    // typed. Only what the ABHA gives is filled; a gender the organisation does not use is left for the worker.
    static onAbhaProfile(state, action, context) {
        if (!PersonRegisterActions.isForThisPatient(state, action)) return state;
        const {profile} = action;
        const tickedBefore = state.individual.dateOfBirthVerified;
        let newState = state.clone();
        if (profile.firstName) newState = PersonRegisterActions.enterFirstName(newState, {value: profile.firstName}, context);
        if (profile.middleName) newState = PersonRegisterActions.enterMiddleName(newState, {value: profile.middleName}, context);
        if (profile.lastName) newState = PersonRegisterActions.enterLastName(newState, {value: profile.lastName}, context);
        if (profile.dateOfBirth) newState = PersonRegisterActions.enterIndividualDOB(newState, {value: profile.dateOfBirth});
        const gender = profile.genderName && _.find(newState.genders, (g) => g.name === profile.genderName);
        if (gender) newState = PersonRegisterActions.enterIndividualGender(newState, {value: gender});
        // An ABHA number means Aadhaar checked the details: the date of birth is marked verified, and the details
        // the ABHA gave lock. A tick the worker gave before the ABHA is not the ABHA's, and stays on removal.
        const verified = !!profile.abhaNumber;
        let dobVerifiedByAbha = state.abha.dobVerifiedByAbha;
        if (verified) {
            dobVerifiedByAbha = dobVerifiedByAbha || !tickedBefore;
            newState = PersonRegisterActions.enterIndividualDOBVerified(newState, {value: true});
        } else if (dobVerifiedByAbha) {
            dobVerifiedByAbha = false;
            newState = PersonRegisterActions.enterIndividualDOBVerified(newState, {value: false});
        }
        PersonRegisterActions.writeAbhaAnswers(newState, profile, context);
        const lockedFields = !verified ? NO_ABHA_LOCKS : {
            firstName: !!profile.firstName, middleName: !!profile.middleName, lastName: !!profile.lastName,
            dateOfBirth: !!profile.dateOfBirth, gender: !!gender,
        };
        newState.abha = {...newState.abha, linked: PersonRegisterActions.hasAbhaAnswer(newState.individual),
            locked: PersonRegisterActions.hasAbhaNumber(newState.individual), lockedFields, dobVerifiedByAbha, choice: action.choice || null, busy: false};
        return newState;
    }

    static onAbhaLinkRemoved(state, action, context) {
        const newState = state.clone();
        PersonRegisterActions.writeAbhaAnswers(newState, {}, context);
        if (state.abha.dobVerifiedByAbha) newState.individual.dateOfBirthVerified = false;
        newState.abha = {...newState.abha, linked: PersonRegisterActions.hasAbhaAnswer(newState.individual),
            locked: PersonRegisterActions.hasAbhaNumber(newState.individual), lockedFields: NO_ABHA_LOCKS, dobVerifiedByAbha: false, choice: null};
        return newState;
    }

    // Both ABHA answers go straight into the observations, since their questions sit on later pages. An absent one
    // is removed, so a new ABHA leaves nothing of an earlier one. The number is kept as Eka writes it.
    static writeAbhaAnswers(state, values, context) {
        const conceptService = context.get(ConceptService);
        const observationsHolder = new ObservationsHolder(state.individual.observations);
        _.forEach(ABHA_CONCEPT_NAMES, (conceptName, field) => {
            const concept = conceptService.getConceptByName(conceptName);
            if (concept) observationsHolder.addOrUpdatePrimitiveObs(concept, values[field] || null, Observation.AnswerSource.Auto);
        });
    }

    static onFormLoad(state, action, context) {
        return PersonRegisterActions.onLoad(state, action, context);
    }

    static enterRegistrationDate(state, action) {
        const newState = state.clone();
        newState.individual.registrationDate = moment(new Date(action.value)).startOf('day').toDate();
        newState.handleValidationResult(newState.individual.validateRegistrationDate());
        return newState;
    }

    static enterFirstName(state, action, context) {
        const newState = state.clone();
        newState.individual.setFirstName(action.value);
        newState.handleValidationResults([newState.validateName(context), newState.individual.validateFirstName()], context);
        return newState;
    }

    static enterMiddleName(state, action, context) {
        const newState = state.clone();
        newState.individual.setMiddleName(action.value);
        newState.handleValidationResults([newState.validateName(context), newState.individual.validateMiddleName()], context);
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
        const isSame = action.answerUUID === newState.individual.profilePicture;
        newState.individual.profilePicture = isSame ? null : action.answerUUID;
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
        PersonRegisterActions.setAgeState(newState);
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

    static enterIndividualAddressLevel(state, action, context) {
        const newState = state.clone();
        newState.individual.lowestAddressLevel = action.value && context.get(AddressLevelService).findByUUID(action.value.uuid);
        newState.handleValidationResult(newState.individual.validateAddress());
        return newState;
    }

    static onNextAsync(state, action, context) {
        const newState = state.clone();
        const newStateForPromise = newState.clone();
        const newStatePromise = newStateForPromise.handleNextAsync(action, context);
        return newStatePromise.then(() => {
            if (newStateForPromise.saveDrafts && !newStateForPromise.hasValidationError) {
                const draftIndividual = DraftSubject.create(newStateForPromise.individual);
                context.get(DraftSubjectService).saveDraftSubject(draftIndividual);
            }
            action.onCompletion(newStateForPromise); //Used to update state in view
            return newStateForPromise; //Used to satisfy iteration checking for FE rule execution errors
        })
    }

    static onNext(state, action, context) {
        PersonRegisterActions.onNextAsync(state, action, context);
        return state.clone();
    }

    static onSummaryPage(state, action, context) {
        const newState = state.clone();
        const newStateForPromise = newState.clone();
        newStateForPromise.handleSummaryPageAsync(action, context).then(() => {
            action.onCompletion(newStateForPromise); //Used to update state in view
        });
        return newState;
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    static onSave(state, action, context) {
        try {
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
        } catch (error) {
            General.logError('PersonRegisterActions.onSave', error);
            return state.clone();
        }
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
        if (isNewEntity && groupSubject && (groupSubject.isHousehold() || groupSubject.isGroup())) {
            individual.lowestAddressLevel = _.get(groupSubject, 'lowestAddressLevel');
        }

        const subjectType = context.get(EntityService).findByKey('name', currentWorkItem.parameters.subjectTypeName, SubjectType.schema.name);

        if (_.isEmpty(individual.subjectType.name)) {
            individual.subjectType = subjectType;
        }
        return individual;
    }

    static onUseThisState(state, action, context) {
        return action.state;
    }

    static onAppBackground(state, action, context) {
        const individual = state.individual;
        if (!state.saveDrafts || _.isNil(state.wizard) || !canSaveRegistrationDraft(individual)) return state;
        if (!_.isNil(context.get(IndividualService).findByUUID(individual.uuid))) return state;
        context.get(DraftSubjectService).saveDraftSubject(DraftSubject.create(individual));
        return state;
    }
}

const actions = {
    ON_LOAD: "REGISTRATION_ON_LOAD",
    ON_FORM_LOAD: "REGISTRATION_ON_FORM_LOAD",
    NEXT: "REGISTRATION_NEXT",
    USE_THIS_STATE: "REGISTRATION_USE_THIS_STATE",
    SUMMARY_PAGE: "REGISTRATION_SUMMARY_PAGE",
    PREVIOUS: "REGISTRATION_PREVIOUS",
    REGISTRATION_ENTER_REGISTRATION_DATE: "REGISTRATION_ENTER_REGISTRATION_DATE",
    REGISTRATION_ENTER_FIRST_NAME: "REGISTRATION_ENTER_FIRST_NAME",
    REGISTRATION_ENTER_MIDDLE_NAME: "REGISTRATION_ENTER_MIDDLE_NAME",
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
    REPEATABLE_GROUP_QUESTION_VALUE_CHANGE: "IRA.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE",
    ON_SUCCESS_OTP_VERIFICATION: "IRA.ON_SUCCESS_OTP_VERIFICATION",
    ON_SKIP_VERIFICATION: "IRA.ON_SKIP_VERIFICATION",
    TOGGLE_GROUPS: "IRA.TOGGLE_GROUPS",
    ON_TIMED_FORM: "IRA.ON_TIMED_FORM",
    ON_START_TIMER: "IRA.ON_START_TIMER",
    ON_APP_BACKGROUND: "IRA.ON_APP_BACKGROUND",
    ON_ABHA_CHOICE: "IRA.ON_ABHA_CHOICE",
    ON_ABHA_PROFILE: "IRA.ON_ABHA_PROFILE",
    ON_ABHA_LINK_REMOVED: "IRA.ON_ABHA_LINK_REMOVED",
    ON_ABHA_BUSY: "IRA.ON_ABHA_BUSY",
};

export default new Map([
    [actions.ON_LOAD, PersonRegisterActions.onLoad],
    [actions.ON_FORM_LOAD, PersonRegisterActions.onFormLoad],
    [actions.NEXT, PersonRegisterActions.onNext],
    [actions.USE_THIS_STATE, PersonRegisterActions.onUseThisState],
    [actions.SUMMARY_PAGE, PersonRegisterActions.onSummaryPage],
    [actions.PREVIOUS, PersonRegisterActions.onPrevious],
    [actions.REGISTRATION_ENTER_REGISTRATION_DATE, PersonRegisterActions.enterRegistrationDate],
    [actions.REGISTRATION_ENTER_FIRST_NAME, PersonRegisterActions.enterFirstName],
    [actions.REGISTRATION_ENTER_MIDDLE_NAME, PersonRegisterActions.enterMiddleName],
    [actions.REGISTRATION_ENTER_LAST_NAME, PersonRegisterActions.enterLastName],
    [actions.REGISTRATION_ENTER_DOB, PersonRegisterActions.enterIndividualDOB],
    [actions.REGISTRATION_ENTER_DOB_VERIFIED, PersonRegisterActions.enterIndividualDOBVerified],
    [actions.REGISTRATION_ENTER_AGE, PersonRegisterActions.enterIndividualAge],
    [actions.REGISTRATION_ENTER_AGE_PROVIDED_IN_YEARS, PersonRegisterActions.enterIndividualAgeProvidedInYears],
    [actions.REGISTRATION_ENTER_GENDER, PersonRegisterActions.enterIndividualGender],
    [actions.REGISTRATION_ENTER_ADDRESS_LEVEL, PersonRegisterActions.enterIndividualAddressLevel],
    [actions.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [actions.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [actions.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [actions.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [actions.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [actions.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [actions.SAVE, PersonRegisterActions.onSave],
    [actions.REGISTRATION_SET_PROFILE_PICTURE, PersonRegisterActions.setProfilePicture],
    [actions.REGISTRATION_SET_LOCATION, PersonRegisterActions.setLocation],
    [actions.SET_LOCATION_ERROR, GeolocationActions.setLocationError],
    [actions.PHONE_NUMBER_CHANGE, ObservationsHolderActions.onPhoneNumberChange],
    [actions.GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onGroupQuestionChange],
    [actions.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onRepeatableGroupQuestionChange],
    [actions.ON_SUCCESS_OTP_VERIFICATION, PhoneNumberVerificationActions.onSuccessVerification],
    [actions.ON_SKIP_VERIFICATION, PhoneNumberVerificationActions.onSkipVerification],
    [actions.TOGGLE_GROUPS, GroupAffiliationActions.updateValue],
    [actions.ON_TIMED_FORM, TimerActions.onTimedForm],
    [actions.ON_START_TIMER, TimerActions.onStartTimer],
    [actions.ON_APP_BACKGROUND, PersonRegisterActions.onAppBackground],
    [actions.ON_ABHA_CHOICE, PersonRegisterActions.onAbhaChoice],
    [actions.ON_ABHA_PROFILE, PersonRegisterActions.onAbhaProfile],
    [actions.ON_ABHA_LINK_REMOVED, PersonRegisterActions.onAbhaLinkRemoved],
    [actions.ON_ABHA_BUSY, PersonRegisterActions.onAbhaBusy],
    [EDGE_MODEL_ACTION.INFERENCE_RESULT_AVAILABLE, ObservationsHolderActions.onInferenceResultAvailable],
    [EDGE_MODEL_ACTION.INFERENCE_RESULTS_BATCH, ObservationsHolderActions.onObservationWriteBatch],
    [EDGE_MODEL_ACTION.INFERENCE_UNAVAILABLE, ObservationsHolderActions.onInferenceUnavailable],
    [RULE_SERVICE_ACTION.OBSERVATION_WRITE_BATCH, ObservationsHolderActions.onObservationWriteBatch],
]);

export {actions as Actions};
