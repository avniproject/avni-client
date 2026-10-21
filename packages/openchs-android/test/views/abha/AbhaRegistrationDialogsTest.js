import React from "react";
import {Alert, Button, Text, TouchableOpacity} from "react-native";
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

    describe("the three options", () => {
        it("offers Create ABHA & Register, Link Existing ABHA & Register and Register Without ABHA, each doing its own thing", async () => {
            const handlers = {onCreate: jest.fn(), onLink: jest.fn(), onWithout: jest.fn()};
            const {renderer} = await show(<AbhaRegistrationOptions {...handlers}/>);

            const buttons = renderer.root.findAllByType(Button);
            expect(buttons.map((button) => button.props.title)).toEqual(["abhaOptionCreate", "abhaOptionLink", "abhaOptionWithout"]);
            await act(async () => buttons.forEach((button) => button.props.onPress()));
            Object.values(handlers).forEach((handler) => expect(handler).toHaveBeenCalledTimes(1));
        });

        it("opens each option's help text from its info icon", async () => {
            const {renderer} = await show(<AbhaRegistrationOptions onCreate={() => {}} onLink={() => {}} onWithout={() => {}}/>);
            const infoIcons = renderer.root.findAllByType(TouchableOpacity)
                .filter((node) => node.findAllByType(Text).some((text) => text.props.children === "icon:info-outline"));

            await act(async () => infoIcons.forEach((icon) => icon.props.onPress()));

            expect(Alert.alert.mock.calls.map(([title, message]) => [title, message])).toEqual([
                ["abhaOptionCreate", "abhaOptionCreateHelp"],
                ["abhaOptionLink", "abhaOptionLinkHelp"],
                ["abhaOptionWithout", "abhaOptionWithoutHelp"],
            ]);
        });

        it("Link's help text points the worker to Other add options", () => {
            expect(en.translations.abhaOptionLinkHelp).toContain("Other add options");
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
    });

    it("has English wording for every message the ABHA registration step shows, and none for the consent key", () => {
        ["abhaOptionCreate", "abhaOptionLink", "abhaOptionWithout", "abhaOptionCreateHelp", "abhaOptionLinkHelp", "abhaOptionWithoutHelp",
            "abhaFormNotSetUp", "abhaDuplicateOpen", "abhaDuplicateOpenAction", "abhaDuplicateElsewhere", "abhaReplaceDetails",
            "abhaCurrentDetails", "abhaProfileDetails", "abhaRemoveLink", "abhaRemoveLinkConfirm",
            "abhaConsentAgree", "abhaConsentContinue", "abhaConsentDecline", "abhaTitle", "abhaNeedsInternet", "abhaTryAgain",
            "cancel", "ok", "apply", "name", "gender", "dateOfBirth"].forEach((key) =>
            expect([key, typeof en.translations[key]]).toEqual([key, "string"]));
        expect(en.translations.abhaDuplicateOpen).toContain("{{name}}");
        expect(en.translations).not.toHaveProperty("abhaRegistrationConsent");
    });
});
