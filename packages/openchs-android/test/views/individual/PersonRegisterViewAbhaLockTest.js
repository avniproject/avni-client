import React from "react";

jest.mock("react-native-zip-archive", () => ({unzip: jest.fn(), zip: jest.fn()}));
jest.mock("react-native-randombytes", () => ({randomBytes: jest.fn()}));
jest.mock("react-native-keychain", () => ({getGenericPassword: jest.fn()}));
jest.mock("react-native-geolocation-service", () => ({}));
jest.mock("react-native-webview", () => ({WebView: () => null}));
jest.mock("../../../src/views/common/SecureTextInput", () => ({SecureTextInput: () => null}));
// The registration screen's imports reach native modules. The test reads the elements renderLoaded returns and draws
// none of them, so everything the screen composes except the three locked elements is swapped for a stub.
jest.mock("../../../src/views/common/AddressLevels", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/common/WizardButtons", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/common/CHSContainer", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/common/CHSContent", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/common/AvniAlert", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/common/BackgroundDraftSaver", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/form/formElement/SingleSelectMediaFormElement", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/form/formElement/GeolocationFormElement", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/form/formElement/RegistrationDateFormElement", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/subject/SubjectRegisterView", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/individual/PersonRegisterViewsMixin", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/abha/AbhaRegistrationFlow", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/abha/AbhaRegistrationOptions", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/abha/AbhaConsentDialog", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/abha/AbhaReplaceDetailsDialog", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/views/form/ValidationErrorMessage", () => ({__esModule: true, default: () => null, AvniAlert: () => null}));
jest.mock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/views/form/formElement/IndividualNameFormElement", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/form/formElement/DateOfBirthAndAgeFormElement", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/form/formElement/GenderFormElement", () => ({__esModule: true, default: () => null}));

import {WorkItem, WorkList, WorkLists} from "avni-models";
import PersonRegisterView from "../../../src/views/individual/PersonRegisterView";
import IndividualNameFormElement from "../../../src/views/form/formElement/IndividualNameFormElement";
import DateOfBirthAndAgeFormElement from "../../../src/views/form/formElement/DateOfBirthAndAgeFormElement";
import GenderFormElement from "../../../src/views/form/formElement/GenderFormElement";

const lockPassedTo = (element, type) => {
    const found = [];
    const walk = (node) => {
        if (!node || typeof node !== "object") return;
        if (node.type === type) found.push(node.props.locked);
        React.Children.forEach(node.props && node.props.children, walk);
    };
    walk(element);
    return found;
};

// renderLoaded reads only state, props and I18n, so it runs on a bare instance without mounting the screen.
const drawn = (abha) => {
    const view = Object.create(PersonRegisterView.prototype);
    view.props = {params: {editing: true, workLists: new WorkLists(new WorkList("Registration", [new WorkItem("w-1", WorkItem.type.REGISTRATION, {subjectTypeName: "Person"})]))}};
    view.state = {abha, individual: {registrationLocation: null, registrationDate: new Date()}, isAllowedProfilePicture: false, wizard: {}};
    Object.defineProperty(view, "I18n", {value: {t: (key) => key}});
    view.formRow = {};
    view.displayMessage = () => {};
    view.dispatchAction = () => {};
    view.scrollRef = React.createRef();
    return view.renderLoaded();
};

describe("PersonRegisterView, locking what an ABHA verified", () => {
    it("passes the lock to the name, date of birth and gender", () => {
        const tree = drawn({enabledForUser: true, locked: true});
        [IndividualNameFormElement, DateOfBirthAndAgeFormElement, GenderFormElement].forEach((type) =>
            expect(lockPassedTo(tree, type)).toEqual([true]));
    });

    it("passes no lock when ABHA is off or the patient has no ABHA, so registration is as before", () => {
        [{enabledForUser: false, locked: false}, {enabledForUser: true, locked: false}, undefined].forEach((abha) => {
            const tree = drawn(abha);
            [IndividualNameFormElement, DateOfBirthAndAgeFormElement, GenderFormElement].forEach((type) =>
                expect(lockPassedTo(tree, type)).toEqual([false]));
        });
    });
});
