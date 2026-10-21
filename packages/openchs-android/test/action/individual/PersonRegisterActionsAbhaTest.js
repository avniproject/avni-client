import {InteractionManager} from "react-native";
import {Concept, Gender, Individual, Observation, PrimitiveValue, SubjectType, WorkItem, WorkList, WorkLists} from "avni-models";
import {PersonRegisterActions} from "../../../src/action/individual/PersonRegisterActions";
import EntityFactory from "../../EntityFactory";
import EntityService from "../../../src/service/EntityService";
import FormMappingService from "../../../src/service/FormMappingService";
import IdentifierAssignmentService from "../../../src/service/IdentifierAssignmentService";
import GroupSubjectService from "../../../src/service/GroupSubjectService";
import OrganisationConfigService from "../../../src/service/OrganisationConfigService";
import DraftConfigService from "../../../src/service/DraftConfigService";
import IndividualService from "../../../src/service/IndividualService";
import UserInfoService from "../../../src/service/UserInfoService";
import ConceptService from "../../../src/service/ConceptService";
import AbhaService from "../../../src/service/AbhaService";
import DraftSubjectService from "../../../src/service/draft/DraftSubjectService";
import SettingsService from "../../../src/service/SettingsService";

const subjectType = Object.assign(SubjectType.create("Person"), {uuid: "st-person", type: "Person"});
const abhaNumberConcept = EntityFactory.createConcept("ABHA Number", Concept.dataType.Text, "c-abha-number");
const abhaAddressConcept = EntityFactory.createConcept("ABHA Address", Concept.dataType.Text, "c-abha-address");
const otherConcept = EntityFactory.createConcept("Occupation", Concept.dataType.Text, "c-occupation");
const gender = (name) => Object.assign(Gender.create(name), {uuid: `g-${name}`});
const GENDERS = [gender("Female"), gender("Male")];

function registrationForm(concepts) {
    const form = EntityFactory.createForm("Person registration");
    const group = EntityFactory.createFormElementGroup("Details", 1, form);
    concepts.forEach((concept, index) => group.addFormElement(EntityFactory.createFormElement(concept.name, false, concept, index + 1)));
    return form;
}

const NO_LOCKS = {firstName: false, middleName: false, lastName: false, dateOfBirth: false, gender: false};
const abhaForm = () => registrationForm([otherConcept, abhaNumberConcept, abhaAddressConcept]);

function savedPerson(observations = []) {
    const person = Individual.createEmptySubjectInstance();
    person.subjectType = subjectType;
    person.observations = observations;
    return person;
}

const workLists = () => new WorkLists(new WorkList("Registration", [new WorkItem("w-1", WorkItem.type.REGISTRATION, {subjectTypeName: "Person"})]));

function contextWith({abhaOn = false, hipId = null, form = abhaForm(), saved = null} = {}) {
    const services = new Map([
        [EntityService, {findByKey: () => subjectType, getAll: () => []}],
        [FormMappingService, {findRegistrationForm: () => form}],
        [IdentifierAssignmentService, {populateIdentifiers: jest.fn()}],
        [GroupSubjectService, {populateGroups: jest.fn()}],
        [OrganisationConfigService, {getCustomRegistrationLocationsForSubjectType: () => undefined, isAbhaEnabled: jest.fn(() => abhaOn)}],
        [DraftConfigService, {shouldSaveDraft: () => false}],
        [IndividualService, {findByUUID: () => saved && {cloneForEdit: () => saved}, register: jest.fn()}],
        [DraftSubjectService, {deleteDraftSubjectByUUID: jest.fn()}],
        [AbhaService, {resendUnsentEvents: jest.fn(() => Promise.resolve([]))}],
        [SettingsService, {getSettings: () => ({})}],
        [UserInfoService, {getUserSettings: jest.fn(() => (hipId ? {abhaHipId: hipId, locale: "en"} : {locale: "en"}))}],
        [ConceptService, {getConceptByName: (name) => [abhaNumberConcept, abhaAddressConcept].find((c) => c.name === name)}],
    ]);
    return {get: (serviceClass) => services.get(serviceClass)};
}

// The ABHA flow names the patient whose screen asked for the profile; the reducer fills only that patient.
const onAbhaProfile = (state, action, context) =>
    PersonRegisterActions.onAbhaProfile(state, {subjectUUID: state.individual.uuid, ...action}, context);

const load = (context, individualUUID) => PersonRegisterActions.onLoad(
    PersonRegisterActions.getInitialState({get: () => ({getAll: () => GENDERS})}),
    {individualUUID, workLists: workLists(), isDraftEntity: false}, context);

describe("PersonRegisterActions, ABHA", () => {
    beforeEach(() => jest.spyOn(InteractionManager, "runAfterInteractions").mockImplementation(() => {}));
    afterEach(() => jest.restoreAllMocks());

    describe("on load", () => {
        it("onLoadAbhaStateForFourCombinations: the options are for a user with a health centre in an organisation with ABHA on", () => {
            [[true, "hip-1", true], [true, null, false], [false, "hip-1", false], [false, null, false]].forEach(([abhaOn, hipId, expected]) =>
                expect([abhaOn, hipId, load(contextWith({abhaOn, hipId})).abha.enabledForUser]).toEqual([abhaOn, hipId, expected]));
        });

        it("formWithoutConceptsMarksNotSetUp, either question missing", () => {
            expect(load(contextWith({abhaOn: true, hipId: "hip-1"})).abha.formHasConcepts).toBe(true);
            expect(load(contextWith({abhaOn: true, hipId: "hip-1", form: registrationForm([abhaNumberConcept])})).abha.formHasConcepts).toBe(false);
            expect(load(contextWith({abhaOn: true, hipId: "hip-1", form: registrationForm([abhaAddressConcept])})).abha.formHasConcepts).toBe(false);
        });

        it("a new patient is not linked and no option is chosen yet", () => {
            expect(load(contextWith({abhaOn: true, hipId: "hip-1"})).abha).toEqual(
                {enabledForUser: true, formHasConcepts: true, linked: false, locked: false, lockedFields: NO_LOCKS, dobVerifiedByAbha: false, choice: null});
        });

        it("a patient being edited is linked when they have either ABHA answer", () => {
            const withNumber = savedPerson([Observation.create(abhaNumberConcept, new PrimitiveValue("91-1234-5678-9012"))]);
            const withAddressOnly = savedPerson([Observation.create(abhaAddressConcept, new PrimitiveValue("asha@sbx"))]);
            expect(load(contextWith({abhaOn: true, hipId: "hip-1", saved: withNumber}), withNumber.uuid).abha.linked).toBe(true);
            expect(load(contextWith({abhaOn: true, hipId: "hip-1", saved: withAddressOnly}), withAddressOnly.uuid).abha.linked).toBe(true);
            expect(load(contextWith({abhaOn: true, hipId: "hip-1", saved: savedPerson()}), "x").abha.linked).toBe(false);
        });

        it("keeps the ABHA state through every clone", () => {
            const state = load(contextWith({abhaOn: true, hipId: "hip-1"}));
            expect(state.clone().abha).toEqual({enabledForUser: true, formHasConcepts: true, linked: false, locked: false, lockedFields: NO_LOCKS, dobVerifiedByAbha: false, choice: null});
        });

        it("with ABHA off, never reads the user's settings and leaves the rest of the load as it was", () => {
            const off = contextWith({abhaOn: false, hipId: "hip-1"});
            const state = load(off);
            expect(off.get(UserInfoService).getUserSettings).not.toHaveBeenCalled();
            expect(state.abha).toEqual({enabledForUser: false, formHasConcepts: false, linked: false, locked: false, lockedFields: NO_LOCKS, dobVerifiedByAbha: false, choice: null});
            const {abha, ...rest} = state;
            const {abha: abhaOn, ...restOn} = load(contextWith({abhaOn: true, hipId: "hip-1"}));
            expect(Object.keys(rest).sort()).toEqual(Object.keys(restOn).sort());
        });
    });

    describe("the worker's choice and the ABHA's details", () => {
        const PROFILE = {
            firstName: "Asha", middleName: "K", lastName: "Rao", genderName: "Female", dateOfBirth: new Date(1990, 3, 23),
            abhaNumber: "91-1234-5678-9012", abhaAddress: "asha.rao@sbx", ekaOid: "oid-1", ekaTxnId: "txn-1", route: "aadhaar", action: "linked",
        };
        const loaded = (saved) => load(contextWith({abhaOn: true, hipId: "hip-1", saved}), saved && saved.uuid);
        const answer = (state, conceptName) => state.individual.findObservation(conceptName);

        it("withoutChoiceHidesOptions", () => {
            const context = contextWith({abhaOn: true, hipId: "hip-1"});
            const state = load(context);
            expect(PersonRegisterActions.abhaOptionsShown(state.abha)).toBe(true);

            const without = PersonRegisterActions.onAbhaChoice(state, {choice: "without"}, context);

            expect(without.abha.choice).toBe("without");
            expect(PersonRegisterActions.abhaOptionsShown(without.abha)).toBe(false);
            expect(without.individual.observations).toHaveLength(0);
        });

        it("shows no options with ABHA off, or for a patient already linked", () => {
            expect(PersonRegisterActions.abhaOptionsShown(load(contextWith({abhaOn: false, hipId: "hip-1"})).abha)).toBe(false);
            expect(PersonRegisterActions.abhaOptionsShown(undefined)).toBe(false);
            const linked = savedPerson([Observation.create(abhaAddressConcept, new PrimitiveValue("asha@sbx"))]);
            expect(PersonRegisterActions.abhaOptionsShown(loaded(linked).abha)).toBe(false);
        });

        it("prefillCallsNameDobGenderHandlers, so validation runs as if typed", () => {
            const handlers = ["enterFirstName", "enterMiddleName", "enterLastName", "enterIndividualDOB", "enterIndividualGender"]
                .map((name) => jest.spyOn(PersonRegisterActions, name));
            const context = contextWith({abhaOn: true, hipId: "hip-1"});

            const state = onAbhaProfile(load(context), {profile: PROFILE, choice: "create"}, context);

            handlers.forEach((handler) => expect(handler).toHaveBeenCalledTimes(1));
            expect(PersonRegisterActions.enterFirstName.mock.calls[0][1]).toEqual({value: "Asha"});
            expect(PersonRegisterActions.enterIndividualDOB.mock.calls[0][1]).toEqual({value: PROFILE.dateOfBirth});
            expect(state.individual).toMatchObject({firstName: "Asha", middleName: "K", lastName: "Rao", dateOfBirth: PROFILE.dateOfBirth});
            expect(state.individual.gender.name).toBe("Female");
        });

        it("prefillWritesBothAnswersWithAutoSource, the number as Eka writes it", () => {
            const context = contextWith({abhaOn: true, hipId: "hip-1"});
            const state = onAbhaProfile(load(context), {profile: PROFILE, choice: "link"}, context);

            expect(answer(state, "ABHA Number").getValue()).toBe("91-1234-5678-9012");
            expect(answer(state, "ABHA Address").getValue()).toBe("asha.rao@sbx");
            expect(answer(state, "ABHA Number").getValueWrapper().answerSource).toBe(Observation.AnswerSource.Auto);
            expect(answer(state, "ABHA Address").getValueWrapper().answerSource).toBe(Observation.AnswerSource.Auto);
            expect(state.abha).toMatchObject({linked: true, choice: "link"});
            expect(PersonRegisterActions.abhaOptionsShown(state.abha)).toBe(false);
        });

        it("fills nothing into a patient other than the one whose screen asked, since the registration store is shared", () => {
            const context = contextWith({abhaOn: true, hipId: "hip-1"});
            const other = load(context);
            const otherPatient = other.individual.uuid;

            [{subjectUUID: "patient-on-a-closed-screen"}, {}].forEach((naming) => {
                const after = PersonRegisterActions.onAbhaProfile(other, {profile: PROFILE, choice: "create", ...naming}, context);
                expect(after === other).toBe(true);
                expect(after.individual.uuid).toBe(otherPatient);
                expect(after.individual.firstName).not.toBe("Asha");
                expect(answer(after, "ABHA Number")).toBeUndefined();
                expect(after.abha).toMatchObject({linked: false, locked: false, choice: null});
            });
        });

        it("an ABHA with an address only removes an ABHA number the patient had", () => {
            const person = savedPerson([Observation.create(abhaNumberConcept, new PrimitiveValue("11-1111-1111-1111"))]);
            const context = contextWith({abhaOn: true, hipId: "hip-1", saved: person});
            const state = onAbhaProfile(load(context, person.uuid),
                {profile: {...PROFILE, abhaNumber: null, abhaAddress: "asha@sbx"}, choice: "link"}, context);

            expect(answer(state, "ABHA Number")).toBeUndefined();
            expect(answer(state, "ABHA Address").getValue()).toBe("asha@sbx");
        });

        it("unknownGenderLeftBlank, for the worker to pick", () => {
            const context = contextWith({abhaOn: true, hipId: "hip-1"});
            const genderHandler = jest.spyOn(PersonRegisterActions, "enterIndividualGender");

            const other = onAbhaProfile(load(context), {profile: {...PROFILE, genderName: "Other"}}, context);
            const none = onAbhaProfile(load(context), {profile: {...PROFILE, genderName: null}}, context);

            expect(genderHandler).not.toHaveBeenCalled();
            expect(other.individual.gender).toBeNull();
            expect(none.individual.gender).toBeNull();
            expect(other.individual.firstName).toBe("Asha");
        });

        it("fills only what the ABHA gives, keeping the rest as it was", () => {
            const context = contextWith({abhaOn: true, hipId: "hip-1"});
            const typed = PersonRegisterActions.enterLastName(load(context), {value: "Typed"}, context);
            const state = onAbhaProfile(typed, {profile: {...PROFILE, lastName: null, dateOfBirth: null}}, context);
            expect(state.individual.lastName).toBe("Typed");
            expect(state.individual.firstName).toBe("Asha");
        });

        it("removeLinkClearsBothAnswers, and the options show again", () => {
            const person = savedPerson([
                Observation.create(otherConcept, new PrimitiveValue("Farmer")),
                Observation.create(abhaNumberConcept, new PrimitiveValue("91-1234-5678-9012")),
                Observation.create(abhaAddressConcept, new PrimitiveValue("asha.rao@sbx")),
            ]);
            const context = contextWith({abhaOn: true, hipId: "hip-1", saved: person});
            const state = PersonRegisterActions.onAbhaLinkRemoved(load(context, person.uuid), {}, context);

            expect(answer(state, "ABHA Number")).toBeUndefined();
            expect(answer(state, "ABHA Address")).toBeUndefined();
            expect(answer(state, "Occupation").getValue()).toBe("Farmer");
            expect(state.abha).toMatchObject({linked: false, choice: null});
            expect(PersonRegisterActions.abhaOptionsShown(state.abha)).toBe(true);
        });
    });

    describe("the lock on the details an ABHA verified", () => {
        const PROFILE = {
            firstName: "Asha", lastName: "Rao", genderName: "Female", dateOfBirth: new Date(1990, 3, 23),
            abhaNumber: "91-1234-5678-9012", abhaAddress: "asha.rao@sbx", route: "aadhaar", action: "linked",
        };
        const MOBILE_ONLY = {...PROFILE, abhaNumber: null, route: "mobile"};
        const withNumber = () => savedPerson([Observation.create(abhaNumberConcept, new PrimitiveValue("91-1234-5678-9012"))]);
        const lockedOnLoad = (saved, options = {}) =>
            load(contextWith({abhaOn: true, hipId: "hip-1", saved, ...options}), saved && saved.uuid).abha.locked;

        it("lockedWhenAbhaNumberPresent: a saved ABHA number locks on every later edit, the lock coming from the answer", () => {
            expect(lockedOnLoad(withNumber())).toBe(true);
        });

        it("notLockedForAddressOnly, for a new patient, and for a patient with no ABHA", () => {
            expect(lockedOnLoad(savedPerson([Observation.create(abhaAddressConcept, new PrimitiveValue("asha@sbx"))]))).toBe(false);
            expect(lockedOnLoad(savedPerson())).toBe(false);
            expect(lockedOnLoad(null)).toBe(false);
        });

        it("with ABHA off for the user, nothing locks even if the patient has a number, as before", () => {
            expect(lockedOnLoad(withNumber(), {abhaOn: false})).toBe(false);
            expect(lockedOnLoad(withNumber(), {hipId: null})).toBe(false);
        });

        it("locks straight after an ABHA with a number fills the details, and not for the mobile route", () => {
            const context = contextWith({abhaOn: true, hipId: "hip-1"});
            expect(onAbhaProfile(load(context), {profile: PROFILE}, context).abha.locked).toBe(true);
            expect(onAbhaProfile(load(context), {profile: MOBILE_ONLY}, context).abha.locked).toBe(false);
        });

        it("a mobile-only ABHA replacing a verified one unlocks", () => {
            const person = withNumber();
            const context = contextWith({abhaOn: true, hipId: "hip-1", saved: person});
            const state = onAbhaProfile(load(context, person.uuid), {profile: MOBILE_ONLY}, context);
            expect(state.abha.locked).toBe(false);
        });

        it("unlockedAfterRemoveLink", () => {
            const person = withNumber();
            const context = contextWith({abhaOn: true, hipId: "hip-1", saved: person});
            const state = load(context, person.uuid);
            expect(state.abha.locked).toBe(true);
            expect(PersonRegisterActions.onAbhaLinkRemoved(state, {}, context).abha.locked).toBe(false);
        });

        it("dobVerifiedSetWhenAbhaNumberPresent, even when the ABHA gives no date, and left alone for the mobile route", () => {
            // Typing a date of birth already ticks "verified" in the model; an ABHA with no date must still tick it.
            const context = contextWith({abhaOn: true, hipId: "hip-1"});
            const noDate = {...PROFILE, dateOfBirth: null};
            expect(onAbhaProfile(load(context), {profile: noDate}, context).individual.dateOfBirthVerified).toBe(true);
            expect(onAbhaProfile(load(context), {profile: {...noDate, abhaNumber: null}}, context).individual.dateOfBirthVerified).toBeFalsy();
        });

        it("the lock survives a clone", () => {
            expect(load(contextWith({abhaOn: true, hipId: "hip-1", saved: withNumber()}), "x").clone().abha.locked).toBe(true);
        });
    });

    describe("locking only what the ABHA filled", () => {
        const FULL = {
            firstName: "Asha", middleName: "K", lastName: "Rao", genderName: "Female", dateOfBirth: new Date(1990, 3, 23),
            abhaNumber: "91-1234-5678-9012", abhaAddress: "asha.rao@sbx", route: "aadhaar", action: "linked",
        };
        const MOBILE = {...FULL, abhaNumber: null, route: "mobile"};
        const context = () => contextWith({abhaOn: true, hipId: "hip-1"});
        const fill = (profile, from) => onAbhaProfile(from || load(context()), {profile}, context());

        it("locks each name part on its own: a verified profile with no last name leaves the last name editable", () => {
            expect(fill({...FULL, lastName: null}).abha.lockedFields).toEqual({firstName: true, middleName: true, lastName: false, dateOfBirth: true, gender: true});
        });

        it("a verified profile with no date of birth leaves it editable, and a gender the organisation does not use stays editable", () => {
            expect(fill({...FULL, dateOfBirth: null}).abha.lockedFields.dateOfBirth).toBe(false);
            expect(fill({...FULL, genderName: "Other"}).abha.lockedFields.gender).toBe(false);
            expect(fill(FULL).abha.lockedFields).toEqual({firstName: true, middleName: true, lastName: true, dateOfBirth: true, gender: true});
        });

        it("the mobile route locks nothing", () => {
            expect(fill(MOBILE).abha.lockedFields).toEqual(NO_LOCKS);
        });

        it("on edit, locks the parts the saved patient has, and only with an ABHA number", () => {
            const person = savedPerson([Observation.create(abhaNumberConcept, new PrimitiveValue("91-1234-5678-9012"))]);
            person.firstName = "Asha";
            person.dateOfBirth = new Date(1990, 3, 23);
            const state = load(contextWith({abhaOn: true, hipId: "hip-1", saved: person}), person.uuid);
            expect(state.abha.lockedFields).toEqual({firstName: true, middleName: false, lastName: false, dateOfBirth: true, gender: false});
            const addressOnly = savedPerson([Observation.create(abhaAddressConcept, new PrimitiveValue("a@sbx"))]);
            addressOnly.firstName = "Asha";
            expect(load(contextWith({abhaOn: true, hipId: "hip-1", saved: addressOnly}), addressOnly.uuid).abha.lockedFields).toEqual(NO_LOCKS);
        });

        it("a last name typed after a single-name ABHA fill does not lock the box under the worker", () => {
            const state = PersonRegisterActions.enterLastName(fill({...FULL, lastName: null}), {value: "Rao"}, context());
            expect(state.abha.lockedFields.lastName).toBe(false);
        });

        it("replacing a verified ABHA with a mobile one, or removing the link, unticks verified when the ABHA ticked it", () => {
            const verified = fill({...FULL, dateOfBirth: null});
            expect(verified.individual.dateOfBirthVerified).toBe(true);
            expect(fill(MOBILE, verified).individual.dateOfBirthVerified).toBe(false);
            expect(PersonRegisterActions.onAbhaLinkRemoved(verified, {}, context()).individual.dateOfBirthVerified).toBe(false);
            expect(PersonRegisterActions.onAbhaLinkRemoved(verified, {}, context()).abha.dobVerifiedByAbha).toBe(false);
        });

        it("an ABHA that gives a date of birth, on a patient with no tick yet, still counts the tick as its own", () => {
            const verified = fill(FULL);
            expect(verified.abha.dobVerifiedByAbha).toBe(true);
            expect(PersonRegisterActions.onAbhaLinkRemoved(verified, {}, context()).individual.dateOfBirthVerified).toBe(false);
        });

        it("a tick the worker gave before the ABHA stays when the ABHA is replaced or removed", () => {
            const ticked = PersonRegisterActions.enterIndividualDOBVerified(load(context()), {value: true}, context());
            const verified = fill({...FULL, dateOfBirth: null}, ticked);
            expect(verified.abha.dobVerifiedByAbha).toBe(false);
            expect(fill(MOBILE, verified).individual.dateOfBirthVerified).toBe(true);
            expect(PersonRegisterActions.onAbhaLinkRemoved(verified, {}, context()).individual.dateOfBirthVerified).toBe(true);
        });

        it("a verified ABHA replacing a verified one keeps knowing the tick is the ABHA's", () => {
            const again = fill({...FULL, dateOfBirth: null}, fill({...FULL, dateOfBirth: null}));
            expect(again.abha.dobVerifiedByAbha).toBe(true);
        });
    });

    describe("on save", () => {
        it("with ABHA on, saves without sending anything: unsent ABHA records go from the screen once saved, and with sync", () => {
            const context = contextWith({abhaOn: true, hipId: "hip-1"});
            const cb = jest.fn();
            PersonRegisterActions.onSave(load(context), {cb}, context);
            expect(context.get(IndividualService).register).toHaveBeenCalledTimes(1);
            expect(context.get(AbhaService).resendUnsentEvents).not.toHaveBeenCalled();
            expect(cb).toHaveBeenCalledTimes(1);
        });

        it("with ABHA off, saves as before and never touches ABHA", () => {
            const context = contextWith({abhaOn: false, hipId: "hip-1"});
            const cb = jest.fn();
            PersonRegisterActions.onSave(load(context), {cb}, context);
            expect(context.get(IndividualService).register).toHaveBeenCalledTimes(1);
            expect(context.get(AbhaService).resendUnsentEvents).not.toHaveBeenCalled();
            expect(cb).toHaveBeenCalledTimes(1);
        });
    });
});
