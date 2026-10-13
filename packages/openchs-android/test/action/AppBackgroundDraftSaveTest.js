import {DraftSubject} from "avni-models";
import {EncounterActions} from "../../src/action/individual/EncounterActions";
import {ProgramEncounterActions} from "../../src/action/program/ProgramEncounterActions";
import {ProgramEnrolmentActions} from "../../src/action/program/ProgramEnrolmentActions";
import {PersonRegisterActions} from "../../src/action/individual/PersonRegisterActions";
import {SubjectRegisterActions} from "../../src/action/subject/SubjectRegisterActions";
import ProgramEnrolmentState from "../../src/state/ProgramEnrolmentState";
import EntityService from "../../src/service/EntityService";
import IndividualService from "../../src/service/IndividualService";
import ProgramEnrolmentService from "../../src/service/ProgramEnrolmentService";
import DraftEncounterService from "../../src/service/draft/DraftEncounterService";
import DraftProgramEncounterService from "../../src/service/draft/DraftProgramEncounterService";
import DraftEnrolmentService from "../../src/service/draft/DraftEnrolmentService";
import DraftSubjectService from "../../src/service/draft/DraftSubjectService";

const contextWith = ({saved = null, enrolmentExists = false} = {}) => {
    const services = new Map([
        [EntityService, {findByUUID: jest.fn(() => saved)}],
        [IndividualService, {findByUUID: jest.fn(() => saved)}],
        [ProgramEnrolmentService, {existsByUuid: jest.fn(() => enrolmentExists)}],
        [DraftEncounterService, {saveDraft: jest.fn()}],
        [DraftProgramEncounterService, {saveDraft: jest.fn()}],
        [DraftEnrolmentService, {saveDraft: jest.fn()}],
        [DraftSubjectService, {saveDraftSubject: jest.fn()}],
    ]);
    return {get: (serviceClass) => services.get(serviceClass)};
};
const wizard = {currentPage: 2};
const filledSubject = () => ({uuid: "s1", firstName: "Asha", registrationDate: new Date(), lowestAddressLevel: {uuid: "village"}});

const handlers = [
    {name: "general visit", handler: EncounterActions.onAppBackground, saver: DraftEncounterService, save: "saveDraft",
        state: (saveDrafts) => ({saveDrafts, wizard, encounter: {uuid: "e1"}})},
    {name: "program visit", handler: ProgramEncounterActions.onAppBackground, saver: DraftProgramEncounterService, save: "saveDraft",
        state: (saveDrafts) => ({saveDrafts, wizard, programEncounter: {uuid: "pe1"}})},
    {name: "enrolment", handler: ProgramEnrolmentActions.onAppBackground, saver: DraftEnrolmentService, save: "saveDraft",
        state: (saveDrafts) => ({saveDrafts, wizard, usage: ProgramEnrolmentState.UsageKeys.Enrol, enrolment: {uuid: "en1"}})},
    {name: "person registration", handler: PersonRegisterActions.onAppBackground, saver: DraftSubjectService, save: "saveDraftSubject",
        state: (saveDrafts) => ({saveDrafts, wizard, individual: filledSubject()})},
    {name: "subject registration", handler: SubjectRegisterActions.onAppBackground, saver: DraftSubjectService, save: "saveDraftSubject",
        state: (saveDrafts) => ({saveDrafts, wizard, subject: filledSubject(), household: {totalMembers: 1}})},
];
const alreadySaved = (name) => name === "enrolment" ? {enrolmentExists: true} : {saved: {uuid: "x", encounterDateTime: new Date()}};

describe("Saving a draft when the app goes to the background", () => {
    beforeEach(() => jest.spyOn(DraftSubject, "create").mockImplementation((subject) => ({uuid: subject.uuid})));
    afterEach(() => jest.restoreAllMocks());

    handlers.forEach(({name, handler, saver, save, state}) => {
        describe(name, () => {
            it("saves an unsaved form", () => {
                const context = contextWith();
                handler(state(true), {}, context);
                expect(context.get(saver)[save]).toHaveBeenCalledTimes(1);
            });

            it("saves nothing when the organisation has drafts turned off", () => {
                const context = contextWith();
                handler(state(false), {}, context);
                expect(context.get(saver)[save]).not.toHaveBeenCalled();
            });

            it("saves nothing once the record has been saved", () => {
                const context = contextWith(alreadySaved(name));
                handler(state(true), {}, context);
                expect(context.get(saver)[save]).not.toHaveBeenCalled();
            });

            it("returns the state unchanged", () => {
                const s = state(true);
                expect(handler(s, {}, contextWith())).toBe(s);
            });
        });
    });

    it("saves nothing for the program exit form", () => {
        const context = contextWith();
        ProgramEnrolmentActions.onAppBackground({saveDrafts: true, wizard, usage: ProgramEnrolmentState.UsageKeys.Exit, enrolment: {uuid: "en1"}}, {}, context);
        expect(context.get(DraftEnrolmentService).saveDraft).not.toHaveBeenCalled();
    });

    it("saves no registration while the address is still the placeholder", () => {
        const context = contextWith();
        const individual = {...filledSubject(), lowestAddressLevel: {uuid: require("avni-models").Individual.getAddressLevelDummyUUID()}};
        PersonRegisterActions.onAppBackground({saveDrafts: true, wizard, individual}, {}, context);
        expect(context.get(DraftSubjectService).saveDraftSubject).not.toHaveBeenCalled();
    });
});
