import React from "react";
import TestRenderer, {act} from "react-test-renderer";

// native-base components need its theme provider, which the screen supplies and this test does not.
jest.mock("native-base", () => ({Text: require("react-native").Text}));
jest.mock("react-native-vector-icons/MaterialCommunityIcons", () => ({__esModule: true, default: () => null}));
// SelectableItem is the one that greys out and ignores taps when handed `disabled`; here it only records what it was handed.
jest.mock("../../../../src/views/primitives/SelectableItem", () => ({__esModule: true, default: () => null}));
jest.mock("../../../../src/views/common/MediaContent", () => ({__esModule: true, default: () => null}));
jest.mock("../../../../src/views/common/SubjectInfoCard", () => ({__esModule: true, default: () => null}));
jest.mock("../../../../src/views/form/ValidationErrorMessage", () => ({__esModule: true, default: () => null}));

import ServiceContext from "../../../../src/framework/context/ServiceContext";
import SelectableItem from "../../../../src/views/primitives/SelectableItem";
import GenderFormElement from "../../../../src/views/form/formElement/GenderFormElement";
import UserInfoService from "../../../../src/service/UserInfoService";
import {Gender} from "avni-models";

const female = Object.assign(Gender.create("Female"), {uuid: "g-f"});
const male = Object.assign(Gender.create("Male"), {uuid: "g-m"});
const state = {individual: {gender: female}, genders: [female, male], validationResults: []};

function draw(props) {
    const dispatch = jest.fn();
    const services = new Map([[UserInfoService, {getUserSettings: () => ({locale: "en"})}]]);
    const context = {getService: (serviceClass) => services.get(serviceClass) || {getI18n: () => ({t: (key) => key})}, getStore: () => ({dispatch})};
    let renderer;
    act(() => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}><GenderFormElement state={state} {...props}/></ServiceContext.Provider>);
    });
    return {renderer, dispatch};
}

describe("GenderFormElement, locked by a verified ABHA", () => {
    const options = (renderer) => renderer.root.findAllByType(SelectableItem);

    it("cannot be changed by tapping when locked", () => {
        const {renderer, dispatch} = draw({locked: true});
        expect(options(renderer).length).toBeGreaterThan(0);
        options(renderer).forEach((option) => expect(option.props.disabled).toBe(true));
        expect(dispatch).not.toHaveBeenCalled();
    });

    it("can be changed by tapping when not locked, and when no lock is passed", () => {
        [{locked: false}, {}].forEach((props) =>
            options(draw(props).renderer).forEach((option) => expect(option.props.disabled).toBeFalsy()));
    });
});
