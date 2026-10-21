import React from "react";
import {ActivityIndicator, Alert, Button, View} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

// PersonRegisterView imports most of the view layer; these are the native modules it reaches that jest has no bridge for.
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("react-native-zip-archive", () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock("react-native-randombytes", () => ({randomBytes: (n) => new Uint8Array(n || 16)}));
jest.mock("react-native-geolocation-service", () => ({}));
jest.mock("react-native-tcp-socket", () => ({}));
jest.mock("react-native-background-timer", () => ({}));
jest.mock("@react-native-documents/picker", () => ({}));
jest.mock("react-native-vision-camera", () => ({}));
jest.mock("@react-native-clipboard/clipboard", () => ({}));
jest.mock("react-native-share", () => ({}));
jest.mock("react-native-file-viewer", () => ({}));
jest.mock("react-native-vector-icons/MaterialIcons", () => ({__esModule: true, default: () => null}));

import ServiceContext from "../../../src/framework/context/ServiceContext";
import PersonRegisterView from "../../../src/views/individual/PersonRegisterView";
import AbhaRegistrationOptions from "../../../src/views/abha/AbhaRegistrationOptions";
import AbhaConsentDialog from "../../../src/views/abha/AbhaConsentDialog";
import AbhaReplaceDetailsDialog from "../../../src/views/abha/AbhaReplaceDetailsDialog";
import {Actions} from "../../../src/action/individual/PersonRegisterActions";

const context = {getService: () => ({getI18n: () => ({t: (key) => key})})};
const ON = {enabledForUser: true, formHasConcepts: true, linked: false, choice: null};
const OFF = {enabledForUser: false, formHasConcepts: false, linked: false, choice: null};

// The registration screen's ABHA part, on a screen whose state the test sets.
function screenWith({abha, editing = false}) {
    const view = Object.create(PersonRegisterView.prototype);
    Object.assign(view, {
        context,
        props: {params: {editing}},
        state: {abha},
        formRow: {},
        dispatchAction: jest.fn(),
        setState: jest.fn((change) => Object.assign(view.state, change)),
        abhaFlow: {open: jest.fn(), chooseWithout: jest.fn()},
    });
    return view;
}

let mounted = [];

function render(view) {
    const element = view.renderAbha();
    if (element === null) return null;
    let renderer;
    act(() => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}>{element}</ServiceContext.Provider>);
    });
    mounted.push(renderer);
    return renderer;
}

const buttonTitles = (renderer) => renderer.root.findAllByType(Button).map((button) => button.props.title);

describe("PersonRegisterView, ABHA", () => {
    beforeEach(() => jest.spyOn(Alert, "alert").mockImplementation(() => {}));
    afterEach(() => {
        mounted.forEach((renderer) => act(() => renderer.unmount()));
        mounted = [];
        jest.restoreAllMocks();
    });

    it("adds nothing to registration or edit when ABHA is off for the user, or before the screen has loaded", () => {
        expect(screenWith({abha: OFF}).renderAbha()).toBeNull();
        expect(screenWith({abha: {...OFF, linked: true}, editing: true}).renderAbha()).toBeNull();
        expect(screenWith({abha: undefined}).renderAbha()).toBeNull();
    });

    it("starts a new patient's registration with the three options, and no Remove ABHA link", () => {
        const renderer = render(screenWith({abha: ON}));
        expect(renderer.root.findAllByType(AbhaRegistrationOptions)).toHaveLength(1);
        expect(buttonTitles(renderer)).not.toContain("abhaRemoveLink");
    });

    it("shows the options when editing a patient with no ABHA", () => {
        expect(render(screenWith({abha: ON, editing: true})).root.findAllByType(AbhaRegistrationOptions)).toHaveLength(1);
    });

    it("Create and Link open the ABHA step on their route; Register Without ABHA goes straight on", () => {
        const view = screenWith({abha: ON});
        const options = render(view).root.findByType(AbhaRegistrationOptions).props;
        options.onCreate();
        options.onLink();
        options.onWithout();
        expect(view.abhaFlow.open.mock.calls).toEqual([[{route: "create"}], [{route: "link"}]]);
        expect(view.abhaFlow.chooseWithout).toHaveBeenCalledTimes(1);
    });

    it("shows progress instead of the options while an ABHA from Eka's screens is being checked", () => {
        const renderer = render(screenWith({abha: {...ON, busy: true}}));
        expect(renderer.root.findAllByType(AbhaRegistrationOptions)).toHaveLength(0);
        expect(renderer.root.findAllByType(ActivityIndicator)).toHaveLength(1);
        expect(render(screenWith({abha: ON})).root.findAllByType(ActivityIndicator)).toHaveLength(0);
    });

    it("never lets a second dialog replace one still open: the second gets no answer at once", async () => {
        const view = screenWith({abha: ON, editing: true});
        const consent = view.askAbhaConsent("I agree to ...");
        expect(await view.askAbhaReplace([{label: "name", current: "Asa", abha: "Asha"}])).toBeUndefined();
        expect(await view.askAbhaConsent("again")).toBeUndefined();

        const dialog = render(view).root.findByType(AbhaConsentDialog);
        expect(dialog.props.text).toBe("I agree to ...");
        const agreedAt = new Date();
        act(() => dialog.props.onContinue(agreedAt));
        expect(await consent).toBe(agreedAt);
    });

    it("hides the options once a choice is made", () => {
        expect(render(screenWith({abha: {...ON, choice: "without"}})).root.findAllByType(AbhaRegistrationOptions)).toHaveLength(0);
    });

    it("offers Remove ABHA link when editing a linked patient, and removes it only once the worker confirms", () => {
        const view = screenWith({abha: {...ON, linked: true}, editing: true});
        const renderer = render(view);
        expect(renderer.root.findAllByType(AbhaRegistrationOptions)).toHaveLength(0);

        act(() => renderer.root.findAllByType(Button).find((button) => button.props.title === "abhaRemoveLink").props.onPress());

        const [, message, buttons] = Alert.alert.mock.calls[0];
        expect(message).toBe("abhaRemoveLinkConfirm");
        expect(view.dispatchAction).not.toHaveBeenCalled();
        buttons.find((button) => button.text === "no").onPress();
        expect(view.dispatchAction).not.toHaveBeenCalled();
        buttons.find((button) => button.text === "yes").onPress();
        expect(view.dispatchAction).toHaveBeenCalledWith(Actions.ON_ABHA_LINK_REMOVED, {});
    });

    it("offers Remove ABHA link on a new registration once an ABHA has filled it in, so a wrong ABHA can be taken off", () => {
        const view = screenWith({abha: {...ON, linked: true, choice: "create"}});
        const renderer = render(view);
        expect(buttonTitles(renderer)).toContain("abhaRemoveLink");
        act(() => renderer.root.findAllByType(Button).find((button) => button.props.title === "abhaRemoveLink").props.onPress());
        Alert.alert.mock.calls[0][2].find((button) => button.text === "yes").onPress();
        expect(view.dispatchAction).toHaveBeenCalledWith(Actions.ON_ABHA_LINK_REMOVED, {});
    });

    it("asks for consent in a dialog and hands back the time the patient agreed", async () => {
        const view = screenWith({abha: ON});
        const answer = view.askAbhaConsent("I agree to ...");
        const dialog = render(view).root.findByType(AbhaConsentDialog);
        expect(dialog.props.text).toBe("I agree to ...");
        const agreedAt = new Date();
        act(() => dialog.props.onContinue(agreedAt));
        expect(await answer).toBe(agreedAt);
        expect(view.state.abhaDialog).toBeNull();
    });

    it("hands back no consent time when the patient does not agree", async () => {
        const view = screenWith({abha: ON});
        const answer = view.askAbhaConsent("I agree to ...");
        const dialog = render(view).root.findByType(AbhaConsentDialog);
        act(() => dialog.props.onDecline());
        expect(await answer).toBeNull();
    });

    it("shows the side-by-side dialog when editing and hands back the worker's choice", async () => {
        const rows = [{label: "name", current: "Asa", abha: "Asha"}];
        const view = screenWith({abha: ON, editing: true});
        const apply = view.askAbhaReplace(rows);
        const dialog = render(view).root.findByType(AbhaReplaceDetailsDialog);
        expect(dialog.props.rows).toBe(rows);
        act(() => dialog.props.onApply());
        expect(await apply).toBe(true);

        const cancel = view.askAbhaReplace(rows);
        const again = render(view).root.findByType(AbhaReplaceDetailsDialog);
        act(() => again.props.onCancel());
        expect(await cancel).toBe(false);
    });
});
