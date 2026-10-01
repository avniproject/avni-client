jest.doMock("react-native-share", () => ({__esModule: true, default: {open: jest.fn()}}));
jest.doMock("../../src/service/PDFGenerationService", () => ({__esModule: true, default: class {}, PAGE: {}}));

const _ = require("lodash");
const FormPDFService = require("../../src/service/FormPDFService").default;
const FormShareService = require("../../src/service/FormShareService").default;
const {Concept, Observation, PrimitiveValue, QuestionGroup, RepeatableQuestionGroup} = require("openchs-models");
const TestConceptFactory = require("../model/TestConceptFactory").default;
const TestFormElementFactory = require("../model/form/TestFormElementFactory").default;
const TestFormElementGroupFactory = require("../model/form/TestFormElementGroupFactory").default;
const TestFormFactory = require("../model/form/TestFormFactory").default;

const HIDDEN = [{key: "hidden", value: true}];
const i18n = {t: (key) => key};
const text = (name, keyValues = []) => TestConceptFactory.createWithDefaults({name, dataType: Concept.dataType.Text, keyValues});
const answer = (concept, value) => Observation.create(concept, new PrimitiveValue(value));
const seen = text("Seen answer");
const verdict = text("AI verdict", HIDDEN);
const groupConcept = TestConceptFactory.createWithDefaults({name: "Group question", dataType: Concept.dataType.QuestionGroup});

const withConcepts = (Service, currentConcepts = [seen, verdict, groupConcept]) => {
    const service = new Service(null, {getService: () => ({
        getI18n: () => i18n,
        getConceptByUUID: (uuid) => _.find(currentConcepts, (c) => c.uuid === uuid),
    })});
    service.I18n = i18n;
    return service;
};
const pdf = (observations, form, concepts) => withConcepts(FormPDFService, concepts)._buildObservationRowsHtml(observations, form);
const plainText = (observations, form, concepts) => withConcepts(FormShareService, concepts)._observationsText(observations, form);

const everyShape = [
    ["PDF", pdf],
    ["text", plainText],
];

describe.each(everyShape)("a %s share of a form with hidden values", (_label, build) => {
    it("includes no hidden value, at the top level or inside a group", () => {
        const qg = Observation.create(groupConcept, new QuestionGroup([answer(seen, "child-shown"), answer(verdict, "SECRET-child")]));

        const out = build([answer(seen, "shown-1"), answer(verdict, "SECRET"), qg]);

        expect(out).toContain("shown-1");
        expect(out).toContain("child-shown");
        expect(out).not.toContain("SECRET");
    });

    it("includes no heading for a group whose every answer is hidden", () => {
        const qg = Observation.create(groupConcept, new QuestionGroup([answer(verdict, "SECRET-child")]));

        const out = build([answer(seen, "shown-1"), qg]);

        expect(out).not.toContain("Group question");
    });

    it("includes no repeat whose every answer is hidden", () => {
        const rqg = Observation.create(groupConcept, new RepeatableQuestionGroup([
            new QuestionGroup([answer(verdict, "SECRET-1")]), new QuestionGroup([answer(seen, "repeat-2")])]));

        const out = build([rqg]);

        expect(out).toContain("repeat-2");
        expect(out).not.toContain("SECRET");
    });

    it("includes no page heading for a form page whose only value is hidden", () => {
        const form = TestFormFactory.createWithDefaults({formType: "Encounter"});
        const hiddenPage = TestFormElementGroupFactory.create({name: "Hidden page", displayOrder: 1, form});
        TestFormElementFactory.create({uuid: "fe-verdict", name: "fe-verdict", displayOrder: 1, concept: verdict, formElementGroup: hiddenPage});
        const shownPage = TestFormElementGroupFactory.create({name: "Shown page", displayOrder: 2, form});
        TestFormElementFactory.create({uuid: "fe-seen", name: "fe-seen", displayOrder: 1, concept: seen, formElementGroup: shownPage});

        const out = build([answer(verdict, "SECRET"), answer(seen, "shown-1")], form);

        expect(out).toContain("Shown page");
        expect(out).not.toContain("Hidden page");
        expect(out).not.toContain("SECRET");
    });

    it("includes no group answer whose concept was marked hidden after the answer was saved", () => {
        const verdictAsStored = text("Later verdict");
        const verdictNow = TestConceptFactory.create({uuid: verdictAsStored.uuid, name: "Later verdict", dataType: Concept.dataType.Text, keyValues: HIDDEN});
        const qg = Observation.create(groupConcept, new QuestionGroup([answer(seen, "child-shown"), answer(verdictAsStored, "SECRET")]));

        const out = build([qg], undefined, [seen, verdictNow, groupConcept]);

        expect(out).toContain("child-shown");
        expect(out).not.toContain("SECRET");
    });

    it("shares values that are not hidden exactly as it would with no hidden values at all", () => {
        const visibleOnly = [answer(seen, "shown-1")];

        expect(build([...visibleOnly, answer(verdict, "SECRET")])).toEqual(build(visibleOnly));
    });
});
