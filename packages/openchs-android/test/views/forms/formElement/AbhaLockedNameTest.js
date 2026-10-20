import React from "react";
import {Text, TextInput} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

jest.mock("../../../../src/views/common/FormElementLabelWithDocumentation", () => ({
    __esModule: true,
    default: ({element}) => require("react").createElement(require("react-native").Text, null, element.name),
}));
// native-base components need its theme provider, which the screen supplies and this test does not.
jest.mock("native-base", () => ({Text: require("react-native").Text}));
// The secure input pulls in the clipboard native module, which has no bridge under jest.
jest.mock("../../../../src/views/common/SecureTextInput", () => ({SecureTextInput: () => null}));
jest.mock("../../../../src/views/form/ValidationErrorMessage", () => ({__esModule: true, default: () => null}));

import ServiceContext from "../../../../src/framework/context/ServiceContext";
import IndividualNameFormElement from "../../../../src/views/form/formElement/IndividualNameFormElement";

const state = (subjectTypeOverrides = {}) => ({
    individual: {firstName: "Asha", middleName: "K", lastName: "Rao", subjectType: {allowMiddleName: true, lastNameOptional: false, ...subjectTypeOverrides}},
    validationResults: [],
});

function draw(props) {
    const context = {getService: () => ({getI18n: () => ({t: (key) => key})}), getStore: () => ({dispatch: jest.fn()})};
    let renderer;
    act(() => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}><IndividualNameFormElement {...props}/></ServiceContext.Provider>);
    });
    return renderer;
}

describe("IndividualNameFormElement, locked by a verified ABHA", () => {
    it("shows every name part as plain text, with no input box, when locked", () => {
        const renderer = draw({state: state(), locked: true});
        expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
        const shown = renderer.root.findAllByType(Text).map((text) => [].concat(text.props.children).join(""));
        expect(shown).toEqual(expect.arrayContaining(["Asha", "K", "Rao"]));
    });

    it("still draws an input box for each name part when not locked, and when no lock is passed", () => {
        expect(draw({state: state(), locked: false}).root.findAllByType(TextInput)).toHaveLength(3);
        expect(draw({state: state()}).root.findAllByType(TextInput)).toHaveLength(3);
        expect(draw({state: state({allowMiddleName: false}), locked: false}).root.findAllByType(TextInput)).toHaveLength(2);
    });

    it("keeps each part's required mark when locked", () => {
        const renderer = draw({state: state({lastNameOptional: true}), locked: true});
        const parts = renderer.root.findAll((node) => node.props.element && node.props.element.name);
        const mandatory = (name) => parts.find((node) => node.props.element.name === name).props.element.mandatory;
        expect([mandatory("firstName"), mandatory("lastName")]).toEqual([true, false]);
    });
});
