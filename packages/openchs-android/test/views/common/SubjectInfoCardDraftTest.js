jest.mock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {}}));

import SubjectInfoCard from "../../../src/views/common/SubjectInfoCard";

describe("SubjectInfoCard age and gender on a draft", () => {
    const i18n = {t: (key) => key};
    const shown = (individual) => SubjectInfoCard.prototype.renderAgeAndGender
        .call({props: {individual}}, i18n).props.children.filter(Boolean).map(text => text.props.children);
    const person = (overrides) => ({
        gender: {name: "Female"},
        dateOfBirth: new Date(),
        userProfileSubtext1: function () { return this.gender.name; },
        userProfileSubtext2: () => "0 days",
        ...overrides
    });

    it("shows gender and age when both are filled", () => {
        expect(shown(person())).toEqual(["Female", "0 days"]);
    });

    it("shows a draft saved without a gender instead of failing", () => {
        expect(shown(person({gender: null}))).toEqual(["0 days"]);
    });

    it("leaves out the age for a draft saved without a date of birth", () => {
        expect(shown(person({dateOfBirth: null}))).toEqual(["Female"]);
    });
});
