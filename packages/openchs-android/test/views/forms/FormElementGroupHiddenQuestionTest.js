import React from "react";
import {Text} from "react-native";
import TestRenderer, {act} from "react-test-renderer";
import _ from "lodash";

// Every input a page or a question group can hand a question to is swapped for a marker naming the
// question and its row, so a test reads exactly what was drawn, in what order, and in which row.
const QUESTION_INPUTS = [
    "AudioFormElement", "DateFormElement", "DurationDateFormElement", "DurationFormElement", "GroupAffiliationFormElement",
    "IdFormElement", "LocationHierarchyFormElement", "MediaV2FormElement", "MultiSelectEncounterFormElement",
    "MultiSelectFileFormElement", "MultiSelectFormElement", "MultiSelectMediaFormElement",
    "MultiSelectSubjectLandingFormElement", "NumericFormElement", "PhoneNumberFormElement",
    "SingleSelectEncounterFormElement", "SingleSelectFileFormElement", "SingleSelectFormElement",
    "SingleSelectMediaFormElement", "SingleSelectSubjectLandingFormElement", "TextFormElement", "TimeFormElement",
];
const drawnMarker = () => ({
    __esModule: true,
    default: ({element, questionGroupIndex}) => React.createElement(Text,
        {testID: _.isNil(questionGroupIndex) ? `drawn:${element.uuid}` : `drawn:${element.uuid}:${questionGroupIndex}`}, element.name),
});
QUESTION_INPUTS.forEach((input) => jest.doMock(`../../../src/views/form/formElement/${input}`, drawnMarker));
jest.doMock("../../../src/views/common/FormElementLabelWithDocumentation", () => ({
    __esModule: true,
    default: ({element}) => React.createElement(Text, {testID: `label:${element.uuid}`}, element.name),
}));
jest.doMock("../../../src/views/form/ValidationErrorMessage", () => ({__esModule: true, default: () => null}));

const FormElementGroup = require("../../../src/views/form/FormElementGroup").default;
const ServiceContext = require("../../../src/framework/context/ServiceContext").default;
const {Concept, KeyValue, Observation, ObservationsHolder, QuestionGroup, RepeatableQuestionGroup} = require("openchs-models");
const TestConceptFactory = require("../../model/TestConceptFactory").default;
const TestFormElementFactory = require("../../model/form/TestFormElementFactory").default;
const TestFormElementGroupFactory = require("../../model/form/TestFormElementGroupFactory").default;
const TestFormFactory = require("../../model/form/TestFormFactory").default;

// The marker as the server sends it.
const HIDDEN = [{key: "hidden", value: true}];
const REPEATABLE = KeyValue.fromResource({key: "repeatable", value: true});

const concept = (dataType, keyValues = []) => TestConceptFactory.createWithDefaults({dataType, keyValues});

const page = () => TestFormElementGroupFactory.create({name: "Photo page", form: TestFormFactory.createWithDefaults({formType: "Encounter"})});

const question = (formElementGroup, uuid, displayOrder, questionConcept, {group, keyValues} = {}) => {
    const formElement = TestFormElementFactory.create({uuid, name: uuid, displayOrder, concept: questionConcept, formElementGroup, keyValues});
    if (group) formElement.groupUuid = group.uuid;
    return formElement;
};

const repeatingBlock = (formElementGroup, uuid, displayOrder, blockConcept) =>
    question(formElementGroup, uuid, displayOrder, blockConcept, {keyValues: [REPEATABLE]});

const twoRowsOf = (blockConcept) =>
    Observation.create(blockConcept, new RepeatableQuestionGroup([new QuestionGroup(), new QuestionGroup()]));

// When a block's questions have rules, the rules hand it one copy of each question per row, stamped with the row.
const copyForRow = (formElement, row) => {
    const copy = formElement.clone();
    copy.questionGroupIndex = row;
    return copy;
};

const context = {getService: () => ({getI18n: () => ({t: (key) => key})})};
const actions = {
    GROUP_QUESTION_VALUE_CHANGE: "GROUP_QUESTION_VALUE_CHANGE",
    REPEATABLE_GROUP_QUESTION_VALUE_CHANGE: "REPEATABLE_GROUP_QUESTION_VALUE_CHANGE",
};

const draw = (formElementGroup, filteredFormElements, observations = []) => {
    let renderer;
    act(() => {
        renderer = TestRenderer.create(
            <ServiceContext.Provider value={context}>
                <FormElementGroup group={formElementGroup} filteredFormElements={filteredFormElements}
                                  observationHolder={new ObservationsHolder(observations)} actions={actions}
                                  validationResults={[]} formElementsUserState={{}}/>
            </ServiceContext.Provider>);
    });
    return renderer;
};

const hostNodes = (json) => {
    if (_.isNil(json) || _.isString(json)) return [];
    if (_.isArray(json)) return _.flatMap(json, hostNodes);
    return [json, ...hostNodes(json.children)];
};
const testIDs = (renderer) => hostNodes(renderer.toJSON()).map((node) => node.props.testID).filter(_.identity);
const drawn = (renderer) => testIDs(renderer).filter((id) => _.startsWith(id, "drawn:")).map((id) => id.substring("drawn:".length));

// A page draws its heading, then the update-the-app notice, then one spaced row per question it draws.
const pageParts = (renderer) => {
    const [heading, notice, ...rows] = renderer.toJSON().children;
    return {heading, notice, rows};
};
const headingOf = (renderer) => {
    const {heading} = pageParts(renderer);
    return heading.type === "Text" ? heading.children.join("") : null;
};
const propsDrawnBy = (renderer, input) =>
    renderer.root.findAllByType(require(`../../../src/views/form/formElement/${input}`).default).map((instance) => instance.props);

describe("FormElementGroup drawing a page that holds a hidden question", () => {
    it("draws it in no row of a repeating block, and draws the other questions of every row in order", () => {
        const photoPage = page();
        question(photoPage, "fe-notes", 1, concept(Concept.dataType.Text));
        const blockConcept = concept(Concept.dataType.QuestionGroup);
        const block = repeatingBlock(photoPage, "fe-assessment", 2, blockConcept);
        question(photoPage, "fe-image", 3, concept(Concept.dataType.Image), {group: block});
        question(photoPage, "fe-verdict", 4, concept(Concept.dataType.Coded, HIDDEN), {group: block});
        question(photoPage, "fe-remarks", 5, concept(Concept.dataType.Text), {group: block});

        const renderer = draw(photoPage, photoPage.getFormElements(), [twoRowsOf(blockConcept)]);

        expect(drawn(renderer)).toEqual(["fe-notes", "fe-image:0", "fe-remarks:0", "fe-image:1", "fe-remarks:1"]);
    });

    it("draws it in no row when the rules have handed the block one copy of each question per row", () => {
        const photoPage = page();
        const blockConcept = concept(Concept.dataType.QuestionGroup);
        const block = repeatingBlock(photoPage, "fe-assessment", 1, blockConcept);
        const image = question(photoPage, "fe-image", 2, concept(Concept.dataType.Image), {group: block});
        const verdict = question(photoPage, "fe-verdict", 3, concept(Concept.dataType.Coded, HIDDEN), {group: block});
        const filteredFormElements = [block, copyForRow(image, 0), copyForRow(verdict, 0), copyForRow(image, 1), copyForRow(verdict, 1)];

        const renderer = draw(photoPage, filteredFormElements, [twoRowsOf(blockConcept)]);

        expect(drawn(renderer)).toEqual(["fe-image:0", "fe-image:1"]);
    });

    it("lays out a repeating block from the questions it draws, as if the hidden one had never been added", () => {
        // A block holding only text and number questions draws as a table.
        const photoPage = page();
        const blockConcept = concept(Concept.dataType.QuestionGroup);
        const block = repeatingBlock(photoPage, "fe-assessment", 1, blockConcept);
        question(photoPage, "fe-remarks", 2, concept(Concept.dataType.Text), {group: block});
        question(photoPage, "fe-verdict", 3, concept(Concept.dataType.Coded, HIDDEN), {group: block});

        const renderer = draw(photoPage, photoPage.getFormElements(), [twoRowsOf(blockConcept)]);

        expect(propsDrawnBy(renderer, "TextFormElement").map((props) => props.isTableView)).toEqual([true, true]);
    });

    it("draws it nowhere on the page, leaving no empty row or spacing where it would have been", () => {
        const photoPage = page();
        question(photoPage, "fe-name", 1, concept(Concept.dataType.Text));
        question(photoPage, "fe-verdict", 2, concept(Concept.dataType.Coded, HIDDEN));
        question(photoPage, "fe-age", 3, concept(Concept.dataType.Numeric));

        const renderer = draw(photoPage, photoPage.getFormElements());

        expect(drawn(renderer)).toEqual(["fe-name", "fe-age"]);
        expect(pageParts(renderer).rows).toHaveLength(2);
        expect(headingOf(renderer)).toEqual("Photo page");
    });

    it("draws it nowhere on a page drawn without a list worked out by the rules", () => {
        const photoPage = page();
        question(photoPage, "fe-name", 1, concept(Concept.dataType.Text));
        question(photoPage, "fe-verdict", 2, concept(Concept.dataType.Coded, HIDDEN));

        const renderer = draw(photoPage, null);

        expect(drawn(renderer)).toEqual(["fe-name"]);
    });

    it("leaves the page blank, heading included, when every question on it is hidden", () => {
        const photoPage = page();
        question(photoPage, "fe-verdict", 1, concept(Concept.dataType.Coded, HIDDEN));
        question(photoPage, "fe-score", 2, concept(Concept.dataType.Numeric, HIDDEN));

        const renderer = draw(photoPage, photoPage.getFormElements());

        expect(drawn(renderer)).toEqual([]);
        expect(pageParts(renderer).rows).toHaveLength(0);
        expect(headingOf(renderer)).toBeNull();
    });

    it("draws no part of a repeating block whose own concept is hidden", () => {
        const photoPage = page();
        question(photoPage, "fe-name", 1, concept(Concept.dataType.Text));
        const blockConcept = concept(Concept.dataType.QuestionGroup, HIDDEN);
        const block = repeatingBlock(photoPage, "fe-assessment", 2, blockConcept);
        question(photoPage, "fe-image", 3, concept(Concept.dataType.Image), {group: block});

        const renderer = draw(photoPage, photoPage.getFormElements(), [twoRowsOf(blockConcept)]);

        expect(drawn(renderer)).toEqual(["fe-name"]);
        expect(testIDs(renderer)).not.toContain("label:fe-assessment");
        expect(pageParts(renderer).rows).toHaveLength(1);
    });

    it("leaves the hidden question in the list the form works from, which is what keeps its answer", () => {
        const photoPage = page();
        question(photoPage, "fe-name", 1, concept(Concept.dataType.Text));
        question(photoPage, "fe-verdict", 2, concept(Concept.dataType.Coded, HIDDEN));
        const filteredFormElements = photoPage.getFormElements();

        draw(photoPage, filteredFormElements);

        expect(filteredFormElements.map((formElement) => formElement.uuid)).toEqual(["fe-name", "fe-verdict"]);
    });
});

describe("FormElementGroup drawing a page with no hidden question", () => {
    it("draws its heading and every question in order, the same as before", () => {
        const photoPage = page();
        question(photoPage, "fe-name", 1, concept(Concept.dataType.Text));
        const blockConcept = concept(Concept.dataType.QuestionGroup);
        const block = repeatingBlock(photoPage, "fe-assessment", 2, blockConcept);
        question(photoPage, "fe-image", 3, concept(Concept.dataType.Image), {group: block});
        question(photoPage, "fe-remarks", 4, concept(Concept.dataType.Text), {group: block});
        question(photoPage, "fe-age", 5, concept(Concept.dataType.Numeric));

        const renderer = draw(photoPage, photoPage.getFormElements(), [twoRowsOf(blockConcept)]);

        expect(headingOf(renderer)).toEqual("Photo page");
        expect(drawn(renderer)).toEqual(["fe-name", "fe-image:0", "fe-remarks:0", "fe-image:1", "fe-remarks:1", "fe-age"]);
        expect(pageParts(renderer).rows).toHaveLength(3);
    });
});
