import {Individual} from "openchs-models";
import {canSaveRegistrationDraft} from "../../src/state/RegistrationDraft";

describe("RegistrationDraft", () => {
    const subject = (overrides) => ({firstName: "Asha", registrationDate: new Date(), lowestAddressLevel: {uuid: "village"}, ...overrides});

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

    it("does not save a draft while the address is still the placeholder a new subject starts with", () => {
        expect(canSaveRegistrationDraft(subject({lowestAddressLevel: {uuid: Individual.getAddressLevelDummyUUID()}}))).toBe(false);
    });
});
