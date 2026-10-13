import {WorkItem, WorkList, WorkLists} from "openchs-models";
import {canReopenRegistration, canSaveRegistrationDraft} from "../../src/state/RegistrationDraft";
import WorkListState from "../../src/state/WorkListState";

describe("RegistrationDraft", () => {
    const subject = (overrides) => ({firstName: "Asha", registrationDate: new Date(), lowestAddressLevel: {uuid: "village"}, ...overrides});
    const stateFor = (workItemType, group) => ({
        group,
        workListState: new WorkListState(new WorkLists(new WorkList("Registration", [new WorkItem("w1", workItemType, {subjectTypeName: "Individual"})])), () => ({}))
    });

    it("saves a draft once the name, registration date and lowest address are filled", () => {
        expect(canSaveRegistrationDraft(subject())).toBe(true);
    });

    it("does not save a draft while the address is only partly picked", () => {
        expect(canSaveRegistrationDraft(subject({lowestAddressLevel: undefined}))).toBe(false);
    });

    it("does not save a draft without a registration date or a name", () => {
        expect(canSaveRegistrationDraft(subject({registrationDate: null}))).toBe(false);
        expect(canSaveRegistrationDraft(subject({firstName: ""}))).toBe(false);
    });

    it("reopens a plain registration", () => {
        expect(canReopenRegistration(stateFor(WorkItem.type.REGISTRATION))).toBe(true);
    });

    it("does not reopen a registration started from Add member or a household", () => {
        expect(canReopenRegistration(stateFor(WorkItem.type.ADD_MEMBER))).toBe(false);
        expect(canReopenRegistration(stateFor(WorkItem.type.HOUSEHOLD))).toBe(false);
    });

    it("does not reopen a registration started from a group", () => {
        expect(canReopenRegistration(stateFor(WorkItem.type.REGISTRATION, {uuid: "group"}))).toBe(false);
    });
});
