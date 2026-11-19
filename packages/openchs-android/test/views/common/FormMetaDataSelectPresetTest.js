import React from "react";
import TestRenderer from "react-test-renderer";

jest.doMock("../../../src/views/common/formMetaData/SubjectTypeSelect", () => {
    const React = require("react");
    const {View} = require("react-native");
    return {__esModule: true, default: (props) => React.createElement(View, {testID: "subjectTypeSelect", ...props})};
});
jest.doMock("../../../src/views/common/formMetaData/ProgramSelect", () => {
    const React = require("react");
    const {View} = require("react-native");
    return {__esModule: true, default: (props) => React.createElement(View, {testID: "programSelect", ...props})};
});
jest.doMock("../../../src/views/common/formMetaData/EncounterTypeSelect", () => {
    const React = require("react");
    const {View} = require("react-native");
    return {__esModule: true, default: (props) => React.createElement(View, {testID: "encounterTypeSelect", ...props})};
});
const FormMetaDataSelect = require("../../../src/views/common/formMetaData/FormMetaDataSelect").default;
const ServiceContext = require("../../../src/framework/context/ServiceContext").default;

const render = (selections, extraProps = {}) => {
    const context = {getService: () => ({getAllowedViewPrograms: () => [], getAllowedViewEncounterTypes: () => []})};
    return TestRenderer.create(
        <ServiceContext.Provider value={context}>
            <FormMetaDataSelect formMetaDataSelections={selections} onChange={() => {}} isMulti={true} {...extraProps}/>
        </ServiceContext.Provider>
    ).root;
};
const find = (root, id) => root.findAll((n) => n.props.testID === id && typeof n.type === "string");
const sel = (subjectTypes, programs, encounterTypes) => ({subjectTypes, programs, encounterTypes});

describe("FormMetaDataSelect presets", () => {
    it("hides the subject type step for a preset subject type", () => {
        const root = render(sel([{uuid: "st-1"}], [], []), {hideSubjectType: true});
        expect(find(root, "subjectTypeSelect")).toHaveLength(0);
        expect(find(root, "programSelect")).toHaveLength(1);
        expect(find(root, "programSelect")[0].props.subjectTypes).toEqual([{uuid: "st-1"}]);
        expect(find(root, "encounterTypeSelect")).toHaveLength(1);
    });

    it("hides the program step too for a preset program", () => {
        const root = render(sel([{uuid: "st-1"}], [{uuid: "p-1"}], []), {hideSubjectType: true, hideProgram: true});
        expect(find(root, "subjectTypeSelect")).toHaveLength(0);
        expect(find(root, "programSelect")).toHaveLength(0);
        expect(find(root, "encounterTypeSelect")).toHaveLength(1);
        expect(find(root, "encounterTypeSelect")[0].props.programs).toEqual([{uuid: "p-1"}]);
    });

    it("shows every step without a preset, as today", () => {
        const root = render(sel([{uuid: "st-1"}], [], []));
        expect(find(root, "subjectTypeSelect")).toHaveLength(1);
        expect(find(root, "programSelect")).toHaveLength(1);
        expect(find(root, "encounterTypeSelect")).toHaveLength(1);
    });

    it("shows only the subject type step when nothing is chosen and there is no preset", () => {
        const root = render(sel([], [], []));
        expect(find(root, "subjectTypeSelect")).toHaveLength(1);
        expect(find(root, "programSelect")).toHaveLength(0);
        expect(find(root, "encounterTypeSelect")).toHaveLength(0);
    });
});
