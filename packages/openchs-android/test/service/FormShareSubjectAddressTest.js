jest.doMock("react-native-share", () => ({__esModule: true, default: {open: jest.fn()}}));
jest.doMock("../../src/service/PDFGenerationService", () => ({__esModule: true, default: class {}, PAGE: {}}));

const {assert} = require("chai");
const FormPDFService = require("../../src/service/FormPDFService").default;
const FormShareService = require("../../src/service/FormShareService").default;
const {AddressLevel, Individual, SubjectType} = require("openchs-models");

const i18n = {t: (key) => key};
const service = (Service) => {
    const s = new Service(null, {getService: () => ({getI18n: () => i18n})});
    s.I18n = i18n;
    return s;
};
const household = (lowestAddressLevel) => {
    const individual = Individual.createEmptyInstance();
    individual.firstName = "Foxtrot";
    individual.subjectType = SubjectType.create("House", false, false, SubjectType.types.Household);
    individual.lowestAddressLevel = lowestAddressLevel;
    return individual;
};
const village = () => AddressLevel.create({uuid: "v", title: "Kotpad", level: 1, typeString: "Village"});

// A patient shared through the camp hub can carry a village the hub phone does not have.
describe("the subject line of a shared form", () => {
    it("shows the name alone when the village is not on this phone", () => {
        assert.equal(service(FormShareService)._subjectHeaderText(household(null)), "Foxtrot");
        const html = service(FormPDFService)._buildSubjectHeaderHtml(household(null));
        assert.include(html, "Foxtrot");
        assert.notInclude(html, "subject-details");
    });

    it("shows the village when it is on this phone", () => {
        assert.equal(service(FormShareService)._subjectHeaderText(household(village())), "Foxtrot, Kotpad");
        assert.include(service(FormPDFService)._buildSubjectHeaderHtml(household(village())), "Kotpad");
    });
});
