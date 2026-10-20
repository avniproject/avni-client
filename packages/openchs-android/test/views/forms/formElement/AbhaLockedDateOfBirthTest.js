import React from "react";
import {Text, TextInput} from "react-native";
import TestRenderer, {act} from "react-test-renderer";
import {DateTimePickerAndroid} from "@react-native-community/datetimepicker";

// native-base components need its theme provider, which the screen supplies and this test does not. Each one
// here only records the props it was handed.
jest.mock("native-base", () => {
    const mockReact = require("react");
    const marker = (testID) => (props) => mockReact.createElement(require("react-native").View, {testID, ...props});
    const Radio = marker("radio");
    Radio.Group = marker("radioGroup");  // disabling the group disables each radio in it
    return {Checkbox: marker("checkbox"), Radio};
});
jest.mock("@react-native-community/datetimepicker", () => ({DateTimePickerAndroid: {open: jest.fn()}}));
jest.mock("../../../../src/views/form/ValidationErrorMessage", () => ({__esModule: true, default: () => null}));

import ServiceContext from "../../../../src/framework/context/ServiceContext";
import DateOfBirthAndAgeFormElement from "../../../../src/views/form/formElement/DateOfBirthAndAgeFormElement";
import UserInfoService from "../../../../src/service/UserInfoService";

const state = {individual: {dateOfBirth: new Date(1990, 3, 23), dateOfBirthVerified: true}, age: "36", ageProvidedInYears: true, validationResults: []};

function draw(props) {
    const dispatch = jest.fn();
    const services = new Map([[UserInfoService, {getUserSettingsObject: () => ({datePickerMode: "calendar"})}]]);
    const context = {getService: (serviceClass) => services.get(serviceClass) || {getI18n: () => ({t: (key) => key})}, getStore: () => ({dispatch})};
    let renderer;
    act(() => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}><DateOfBirthAndAgeFormElement state={state} {...props}/></ServiceContext.Provider>);
    });
    const byId = (testID) => renderer.root.findAll((node) => node.props.testID === testID && typeof node.type !== "string");
    return {renderer, dispatch, byId};
}

describe("DateOfBirthAndAgeFormElement, locked by a verified ABHA", () => {
    beforeEach(() => DateTimePickerAndroid.open.mockClear());

    it("opens no date picker when the date is tapped", () => {
        const {renderer} = draw({locked: true});
        const tappable = renderer.root.findAllByType(Text).filter((text) => text.props.onPress);
        tappable.forEach((text) => text.props.onPress());
        expect(DateTimePickerAndroid.open).not.toHaveBeenCalled();
    });

    it("cannot change the verified tick, the age box or the years/months choice", () => {
        const {byId, renderer} = draw({locked: true});
        expect(byId("checkbox")[0].props.isDisabled).toBe(true);
        expect(renderer.root.findByType(TextInput).props.editable).toBe(false);
        expect(byId("radioGroup")[0].props.isDisabled).toBe(true);
    });

    it("still shows the date, the tick and the age while locked", () => {
        const {renderer, byId} = draw({locked: true});
        expect(byId("checkbox")[0].props.isChecked).toBe(true);
        expect(renderer.root.findByType(TextInput).props.value).toBe("36");
        expect(renderer.root.findAllByType(Text).map((text) => [].concat(text.props.children).join("")).join(" ")).toMatch(/1990/);
    });

    it("works as before when not locked, and when no lock is passed", () => {
        [{locked: false}, {}].forEach((props) => {
            const {renderer, byId, dispatch} = draw(props);
            renderer.root.findAllByType(Text).filter((text) => text.props.onPress).forEach((text) => text.props.onPress());
            expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
            DateTimePickerAndroid.open.mockClear();
            expect(byId("checkbox")[0].props.isDisabled).toBeFalsy();
            expect(renderer.root.findByType(TextInput).props.editable).not.toBe(false);
            expect(byId("radioGroup")[0].props.isDisabled).toBeFalsy();
            byId("checkbox")[0].props.onPress();
            expect(dispatch).toHaveBeenCalledTimes(1);
        });
    });
});
