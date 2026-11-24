import React from "react";
import TestRenderer, {act} from "react-test-renderer";
import _ from "lodash";

jest.doMock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {}}));
jest.doMock("../../../src/views/common/ExpandableMedia", () => ({__esModule: true, default: () => null}));
jest.doMock("react-native-immediate-phone-call", () => ({}));
jest.doMock("../../../src/utility/Analytics", () => ({firebaseEvents: {}, logEvent: () => {}}));
jest.doMock("../../../src/model/PhoneCall", () => ({__esModule: true, default: {}}));
jest.doMock("../../../src/action/task/TaskActions", () => ({TaskActionNames: {}}));
jest.doMock("../../../src/views/CustomActivityIndicator", () => ({__esModule: true, default: () => null}));

const Observations = require("../../../src/views/common/Observations").default;
const ServiceContext = require("../../../src/framework/context/ServiceContext").default;
const {Concept, Observation, PrimitiveValue, QuestionGroup, RepeatableQuestionGroup} = require("openchs-models");
const TestConceptFactory = require("../../model/TestConceptFactory").default;
const TestFormElementFactory = require("../../model/form/TestFormElementFactory").default;
const TestFormElementGroupFactory = require("../../model/form/TestFormElementGroupFactory").default;
const TestFormFactory = require("../../model/form/TestFormFactory").default;

const HIDDEN = [{key: "hidden", value: true}];
const text = (name, keyValues = []) => TestConceptFactory.createWithDefaults({name, dataType: Concept.dataType.Text, keyValues});
const answer = (concept, value) => Observation.create(concept, new PrimitiveValue(value));

const seen = text("Seen answer");
const other = text("Other answer");
const verdict = text("AI verdict", HIDDEN);
const groupConcept = TestConceptFactory.createWithDefaults({name: "Group question", dataType: Concept.dataType.QuestionGroup});

const servicesFor = (currentConcepts) => ({
    getI18n: () => ({t: (key) => key}),
    getConceptByUUID: (uuid) => _.find(currentConcepts, (c) => c.uuid === uuid),
});
const draw = (props, currentConcepts = [seen, other, verdict, groupConcept]) => {
    let renderer;
    act(() => {
        renderer = TestRenderer.create(
            <ServiceContext.Provider value={{getService: () => servicesFor(currentConcepts)}}>
                <Observations {...props}/>
            </ServiceContext.Provider>);
    });
    return renderer;
};
const textsOf = (renderer) => {
    const texts = [];
    const walk = (node) => {
        if (_.isNil(node)) return;
        if (_.isString(node)) return texts.push(node);
        if (_.isArray(node)) return node.forEach(walk);
        walk(node.children);
    };
    walk(renderer.toJSON());
    return texts;
};
const onePageFormWith = (build) => {
    const form = TestFormFactory.createWithDefaults({formType: "Encounter"});
    const page = TestFormElementGroupFactory.create({name: "Page one", displayOrder: 1, form});
    build(page);
    return form;
};
const question = (page, uuid, displayOrder, concept, group) => {
    const formElement = TestFormElementFactory.create({uuid, name: uuid, displayOrder, concept, formElementGroup: page});
    if (group) formElement.groupUuid = group.uuid;
    return formElement;
};

describe("Observations with hidden values", () => {
    it("draws no value recorded against a hidden concept", () => {
        const texts = textsOf(draw({observations: [answer(seen, "shown-1"), answer(verdict, "SECRET")]}));

        expect(texts).toContain("shown-1");
        expect(texts).not.toContain("SECRET");
        expect(texts).not.toContain("AI verdict");
    });

    it("draws no hidden answer inside a question group, and still draws the group and its other answers", () => {
        const qg = Observation.create(groupConcept, new QuestionGroup([answer(seen, "child-shown"), answer(verdict, "SECRET")]));

        const texts = textsOf(draw({observations: [qg]}));

        expect(texts).toEqual(expect.arrayContaining(["Group question", "child-shown"]));
        expect(texts).not.toContain("SECRET");
    });

    it("draws no hidden answer in any repeat of a repeating group", () => {
        const rqg = Observation.create(groupConcept, new RepeatableQuestionGroup([
            new QuestionGroup([answer(seen, "repeat-1"), answer(verdict, "SECRET-1")]),
            new QuestionGroup([answer(seen, "repeat-2"), answer(verdict, "SECRET-2")])]));

        const texts = textsOf(draw({observations: [rqg]}));

        expect(texts).toEqual(expect.arrayContaining(["repeat-1", "repeat-2"]));
        expect(texts.filter((t) => _.startsWith(t, "SECRET"))).toEqual([]);
    });

    it("draws no hidden group answer on a screen grouped by form page, where the answers are rebuilt", () => {
        const form = onePageFormWith((page) => {
            const block = question(page, "fe-group", 1, groupConcept);
            question(page, "fe-seen", 2, seen, block);
            question(page, "fe-verdict", 3, verdict, block);
        });
        const qg = Observation.create(groupConcept, new QuestionGroup([answer(seen, "child-shown"), answer(verdict, "SECRET")]));

        const texts = textsOf(draw({observations: [qg], form}));

        expect(texts).toContain("child-shown");
        expect(texts).not.toContain("SECRET");
    });

    it("draws no group answer whose concept was marked hidden after the answer was saved", () => {
        const verdictAsStored = text("Later verdict");
        const verdictNow = TestConceptFactory.create({uuid: verdictAsStored.uuid, name: "Later verdict", dataType: Concept.dataType.Text, keyValues: HIDDEN});
        const qg = Observation.create(groupConcept, new QuestionGroup([answer(seen, "child-shown"), answer(verdictAsStored, "SECRET")]));

        const texts = textsOf(draw({observations: [qg]}, [seen, verdictNow, groupConcept]));

        expect(texts).toContain("child-shown");
        expect(texts).not.toContain("SECRET");
    });

    it("draws nothing, not even its title, when every value is hidden", () => {
        const qg = Observation.create(groupConcept, new QuestionGroup([answer(verdict, "SECRET-child")]));

        const renderer = draw({observations: [answer(verdict, "SECRET"), qg], title: "systemRecommendations"});

        expect(textsOf(renderer)).toEqual([]);
    });

    it("adds no decisions section for a hidden value that is not on the form", () => {
        const form = onePageFormWith((page) => question(page, "fe-seen", 1, seen));

        const texts = textsOf(draw({observations: [answer(seen, "shown-1"), answer(verdict, "SECRET")], form}));

        expect(texts).not.toContain("decisions");
        expect(texts).not.toContain("SECRET");
    });

    it("draws values that are not hidden exactly as it would with no hidden values at all", () => {
        const form = onePageFormWith((page) => {
            question(page, "fe-other", 1, other);
            question(page, "fe-verdict", 2, verdict);
            question(page, "fe-seen", 3, seen);
        });
        const visibleOnly = [answer(seen, "shown-1"), answer(other, "shown-2")];

        const without = JSON.stringify(draw({observations: visibleOnly, form}).toJSON());
        const withHidden = JSON.stringify(draw({observations: [...visibleOnly, answer(verdict, "SECRET")], form}).toJSON());

        expect(withHidden).toEqual(without);
    });

    it("leaves the recorded values it was given untouched", () => {
        const hiddenValue = answer(verdict, "SECRET");
        const observations = [answer(seen, "shown-1"), hiddenValue];

        draw({observations});

        expect(observations).toHaveLength(2);
        expect(observations[1]).toBe(hiddenValue);
    });
});
