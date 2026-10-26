import React from "react";
import {Alert, Button, Modal, Text, TouchableOpacity} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

jest.mock("react-native-vector-icons/MaterialIcons", () => {
    const mockReact = require("react");
    const {Text: MockText} = require("react-native");
    return {__esModule: true, default: ({name}) => mockReact.createElement(MockText, null, `icon:${name}`)};
});

import ServiceContext from "../../../src/framework/context/ServiceContext";
import AbhaRegistrationOptions from "../../../src/views/abha/AbhaRegistrationOptions";
import AbhaConsentDialog from "../../../src/views/abha/AbhaConsentDialog";
import AbhaReplaceDetailsDialog from "../../../src/views/abha/AbhaReplaceDetailsDialog";
import en from "../../../translations/en.json";

let mounted = [];

async function show(element) {
    const context = {getService: () => ({getI18n: () => ({t: (key) => key})})};
    let renderer;
    await act(async () => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}>{element}</ServiceContext.Provider>);
    });
    mounted.push(renderer);
    const texts = () => renderer.root.findAllByType(Text).map((text) => [].concat(text.props.children).join(""));
    const touchable = (label) => renderer.root.findAllByType(TouchableOpacity)
        .find((node) => node.findAllByType(Text).some((text) => [].concat(text.props.children).join("") === label));
    const press = async (label) => act(async () => touchable(label).props.onPress());
    return {renderer, texts, touchable, press};
}

describe("ABHA registration dialogs", () => {
    beforeEach(() => jest.spyOn(Alert, "alert").mockImplementation(() => {}));
    afterEach(() => {
        mounted.forEach((renderer) => act(() => renderer.unmount()));
        mounted = [];
        jest.restoreAllMocks();
    });

    describe("the options", () => {
        // Eka's screens find an ABHA the patient already has, or create one, so one option starts both.
        it("offers Find or Create ABHA & Register and Register Without ABHA, each doing its own thing", async () => {
            const handlers = {onFindOrCreate: jest.fn(), onWithout: jest.fn()};
            const {renderer} = await show(<AbhaRegistrationOptions {...handlers}/>);

            const buttons = renderer.root.findAllByType(Button);
            expect(buttons.map((button) => button.props.title)).toEqual(["abhaOptionFindOrCreate", "abhaOptionWithout"]);
            await act(async () => buttons.forEach((button) => button.props.onPress()));
            Object.values(handlers).forEach((handler) => expect(handler).toHaveBeenCalledTimes(1));
        });

        it("opens each option's help text from its info icon", async () => {
            const {renderer} = await show(<AbhaRegistrationOptions onFindOrCreate={() => {}} onWithout={() => {}}/>);
            const infoIcons = renderer.root.findAllByType(TouchableOpacity)
                .filter((node) => node.findAllByType(Text).some((text) => text.props.children === "icon:info-outline"));

            await act(async () => infoIcons.forEach((icon) => icon.props.onPress()));

            expect(Alert.alert.mock.calls.map(([title, message]) => [title, message])).toEqual([
                ["abhaOptionFindOrCreate", "abhaOptionFindOrCreateHelp"],
                ["abhaOptionWithout", "abhaOptionWithoutHelp"],
            ]);
        });

        it("Find or Create's help text points the worker to Other add options for an ABHA number or address", () => {
            expect(en.translations.abhaOptionFindOrCreateHelp).toContain("Other add options");
        });
    });

    describe("the consent step", () => {
        it("shows the organisation's wording, with Continue off until the patient agrees", async () => {
            const onContinue = jest.fn();
            const screen = await show(<AbhaConsentDialog text="The patient agrees to ..." onContinue={onContinue} onDecline={() => {}}/>);

            expect(screen.texts()).toContain("The patient agrees to ...");
            expect(screen.touchable("abhaConsentContinue").props.disabled).toBe(true);
            await screen.press("abhaConsentContinue");
            expect(onContinue).not.toHaveBeenCalled();

            await screen.press("abhaConsentAgree");
            expect(screen.touchable("abhaConsentContinue").props.disabled).toBe(false);
            await screen.press("abhaConsentContinue");
            expect(onContinue).toHaveBeenCalledTimes(1);
            expect(onContinue.mock.calls[0][0]).toBeInstanceOf(Date);
        });

        it("turns Continue off again when the tick is taken back", async () => {
            const screen = await show(<AbhaConsentDialog text="..." onContinue={() => {}} onDecline={() => {}}/>);
            await screen.press("abhaConsentAgree");
            await screen.press("abhaConsentAgree");
            expect(screen.touchable("abhaConsentContinue").props.disabled).toBe(true);
        });

        it("Back closes the consent step without an answer; it is not Does not agree", async () => {
            const onDecline = jest.fn();
            const onCancel = jest.fn();
            const screen = await show(<AbhaConsentDialog text="..." onContinue={() => {}} onDecline={onDecline} onCancel={onCancel}/>);
            await act(async () => screen.renderer.root.findByType(Modal).props.onRequestClose());
            expect(onCancel).toHaveBeenCalledTimes(1);
            expect(onDecline).not.toHaveBeenCalled();
        });

        it("Does not agree declines", async () => {
            const onDecline = jest.fn();
            const screen = await show(<AbhaConsentDialog text="..." onContinue={() => {}} onDecline={onDecline}/>);
            await screen.press("abhaConsentDecline");
            expect(onDecline).toHaveBeenCalledTimes(1);
        });
    });

    describe("the side-by-side step when editing", () => {
        const rows = [
            {label: "name", current: "Asa Rao", abha: "Asha Rao"},
            {label: "gender", current: "Male", abha: "Female"},
            {label: "dateOfBirth", current: "01 Jan 1991", abha: "23 Apr 1990"},
        ];

        it("shows the current and the ABHA's details side by side", async () => {
            const screen = await show(<AbhaReplaceDetailsDialog rows={rows} onApply={() => {}} onCancel={() => {}}/>);
            ["abhaReplaceDetails", "abhaCurrentDetails", "abhaProfileDetails", "Asa Rao", "Asha Rao", "Male", "Female", "01 Jan 1991", "23 Apr 1990"]
                .forEach((text) => expect(screen.texts()).toContain(text));
        });

        it("applies or cancels", async () => {
            const onApply = jest.fn();
            const onCancel = jest.fn();
            const screen = await show(<AbhaReplaceDetailsDialog rows={rows} onApply={onApply} onCancel={onCancel}/>);
            await screen.press("apply");
            await screen.press("cancel");
            expect(onApply).toHaveBeenCalledTimes(1);
            expect(onCancel).toHaveBeenCalledTimes(1);
        });

        // The same side-by-side step when the ABHA already belongs to another patient (NHA's M1 case VRFY_ABHA_308).
        it("can carry its own title and action, for a patient who already holds the ABHA", async () => {
            const onApply = jest.fn();
            const screen = await show(<AbhaReplaceDetailsDialog rows={rows} title="This ABHA is already linked to Ravi Kumar."
                                                                applyLabel="abhaDuplicateOpenAction" onApply={onApply} onCancel={() => {}}/>);
            expect(screen.texts()).toContain("This ABHA is already linked to Ravi Kumar.");
            expect(screen.texts()).not.toContain("abhaReplaceDetails");
            await screen.press("abhaDuplicateOpenAction");
            expect(onApply).toHaveBeenCalledTimes(1);
        });
    });

    it("has English wording for every message the ABHA registration step shows, the consent included", () => {
        ["abhaOptionFindOrCreate", "abhaOptionWithout", "abhaOptionFindOrCreateHelp", "abhaOptionWithoutHelp",
            "abhaFormNotSetUp", "abhaDuplicateOpen", "abhaDuplicateOpenAction", "abhaDuplicateElsewhere", "abhaReplaceDetails",
            "abhaCurrentDetails", "abhaProfileDetails", "abhaRemoveLink", "abhaRemoveLinkConfirm",
            "abhaConsentAgree", "abhaConsentContinue", "abhaConsentDecline", "abhaTitle", "abhaNeedsInternet", "abhaTryAgain",
            "cancel", "ok", "apply", "name", "gender", "dateOfBirth"].forEach((key) =>
            expect([key, typeof en.translations[key]]).toEqual([key, "string"]));
        expect(en.translations.abhaDuplicateOpen).toContain("{{name}}");
        // A default, so every organisation with ABHA on asks for consent (NHA's CRT_ABHA_102); its own wording wins.
        expect(typeof en.translations.abhaRegistrationConsent).toBe("string");
    });
});
