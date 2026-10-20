import {InteractionManager} from "react-native";
import {Concept, Individual, Observation, PrimitiveValue, SubjectType, WorkItem, WorkList, WorkLists} from "avni-models";
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

const subjectType = Object.assign(SubjectType.create("Person"), {uuid: "st-person", type: "Person"});
const abhaNumberConcept = EntityFactory.createConcept("ABHA Number", Concept.dataType.Text, "c-abha-number");
const abhaAddressConcept = EntityFactory.createConcept("ABHA Address", Concept.dataType.Text, "c-abha-address");
const otherConcept = EntityFactory.createConcept("Occupation", Concept.dataType.Text, "c-occupation");

function registrationForm(concepts) {
    const form = EntityFactory.createForm("Person registration");
    const group = EntityFactory.createFormElementGroup("Details", 1, form);
    concepts.forEach((concept, index) => group.addFormElement(EntityFactory.createFormElement(concept.name, false, concept, index + 1)));
    return form;
}

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
        [IndividualService, {findByUUID: () => saved && {cloneForEdit: () => saved}}],
        [UserInfoService, {getUserSettings: jest.fn(() => (hipId ? {abhaHipId: hipId, locale: "en"} : {locale: "en"}))}],
        [ConceptService, {getConceptByName: (name) => [abhaNumberConcept, abhaAddressConcept].find((c) => c.name === name)}],
    ]);
    return {get: (serviceClass) => services.get(serviceClass)};
}

const load = (context, individualUUID) => PersonRegisterActions.onLoad(
    PersonRegisterActions.getInitialState({get: () => ({getAll: () => []})}),
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
                {enabledForUser: true, formHasConcepts: true, linked: false, choice: null});
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
            expect(state.clone().abha).toEqual({enabledForUser: true, formHasConcepts: true, linked: false, choice: null});
        });

        it("with ABHA off, never reads the user's settings and leaves the rest of the load as it was", () => {
            const off = contextWith({abhaOn: false, hipId: "hip-1"});
            const state = load(off);
            expect(off.get(UserInfoService).getUserSettings).not.toHaveBeenCalled();
            expect(state.abha).toEqual({enabledForUser: false, formHasConcepts: false, linked: false, choice: null});
            const {abha, ...rest} = state;
            const {abha: abhaOn, ...restOn} = load(contextWith({abhaOn: true, hipId: "hip-1"}));
            expect(Object.keys(rest).sort()).toEqual(Object.keys(restOn).sort());
        });
    });
});
