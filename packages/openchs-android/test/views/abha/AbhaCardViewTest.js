import React from "react";
import {Button, Image, Modal, Text, ToastAndroid, TouchableNativeFeedback} from "react-native";
import TestRenderer, {act} from "react-test-renderer";
import {ImageViewer} from "react-native-image-zoom-viewer";

const mockCopyFile = jest.fn(() => Promise.resolve());
const mockUnlink = jest.fn(() => Promise.resolve());
jest.mock("react-native-fs", () => ({
    DownloadDirectoryPath: "/storage/Download",
    copyFile: (...args) => mockCopyFile(...args),
    unlink: (...args) => mockUnlink(...args),
}));
const mockShareOpen = jest.fn(() => Promise.resolve({success: true}));
jest.mock("react-native-share", () => ({__esModule: true, default: {open: (...args) => mockShareOpen(...args)}}));
jest.mock("react-native-device-info", () => ({getApiLevel: jest.fn(() => Promise.resolve(34))}));
jest.mock("react-native-blob-util", () => ({fs: {dirs: {CacheDir: "/cache"}}}));
jest.mock("../../../src/service/AuthAwareDownload", () => ({downloadWithAuth: jest.fn()}));
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
// native-base primitives need a NativeBaseProvider above them, which this test has no use for.
jest.mock("native-base", () => ({__esModule: true, Button: () => null, Icon: () => null}));
// The zoom viewer starts an animation timer this Jest cannot run; what it is handed is all the test needs.
jest.mock("react-native-image-zoom-viewer", () => ({ImageViewer: () => null}));
const mockConnection = {isConnected: true};
jest.mock("../../../src/utility/ConnectionInfo", () => ({getConnectionInfo: () => Promise.resolve(mockConnection)}));
jest.mock("../../../src/utility/CHSNavigator", () => ({__esModule: true, default: {navigateToAbhaView: jest.fn()}}));
jest.mock("../../../src/views/common/CHSContainer", () => ({
    __esModule: true,
    default: ({children}) => require("react").createElement(require("react-native").View, null, children),
}));

import ServiceContext from "../../../src/framework/context/ServiceContext";
import TypedTransition from "../../../src/framework/routing/TypedTransition";
import CHSNavigator from "../../../src/utility/CHSNavigator";
import AbhaCardView from "../../../src/views/abha/AbhaCardView";
import AbhaConsentDialog from "../../../src/views/abha/AbhaConsentDialog";
import {ABHA_SDK_METHOD} from "../../../src/views/abha/AbhaRegistrationFlow";
import AbhaService from "../../../src/service/AbhaService";
import IndividualService from "../../../src/service/IndividualService";
import AbhaError from "../../../src/service/AbhaError";
import General from "../../../src/utility/General";
import en from "../../../translations/en.json";

const CARD_PATH = "/cache/abha-card-1.png";
const LAST_FOUR = "9012";

let mounted = [];

// translations are the organisation's own strings, such as its consent wording; patient is the subject as the phone
// holds it, null for a registration not saved yet.
async function show({getCardFile = () => Promise.resolve(CARD_PATH), abhaLastFour = LAST_FOUR, abhaAddress, abha = {}, translations = {}, patient = null} = {}) {
    const navigator = {pop: jest.fn(), getCurrentRoutes: () => []};
    const abhaService = {getCardFile: jest.fn(getCardFile), ...abha};
    const individualService = {findByUUID: jest.fn(() => patient && {getObservationValue: (name) => ({"ABHA Number": patient.number, "ABHA Address": patient.address}[name])})};
    const i18n = {t: (key, params) => translations[key] || (params ? `${key} ${JSON.stringify(params)}` : key)};
    const context = {
        getService: (type) => (type === AbhaService ? abhaService : type === IndividualService ? individualService : {getI18n: () => i18n}),
        navigator: () => navigator,
    };
    let renderer;
    await act(async () => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}>
            <AbhaCardView subjectUUID="s-1" subjectTypeUUID="st-1" abhaLastFour={abhaLastFour} abhaAddress={abhaAddress}/>
        </ServiceContext.Provider>);
    });
    mounted.push(renderer);
    const titles = () => renderer.root.findAllByType(Button).map((button) => button.props.title);
    const press = async (title) => act(async () => { renderer.root.findAllByType(Button).find((button) => button.props.title === title).props.onPress(); });
    const lines = () => renderer.root.findAllByType(Text).map((text) => [].concat(text.props.children).join(""));
    return {renderer, abhaService, navigator, titles, press, lines};
}

describe("AbhaCardViewTest", () => {
    beforeEach(() => {
        mockConnection.isConnected = true;
        CHSNavigator.navigateToAbhaView.mockClear();
        mockCopyFile.mockClear();
        mockUnlink.mockClear();
        mockShareOpen.mockClear();
        jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
        jest.spyOn(General, "logWarn").mockImplementation(() => {});
    });
    afterEach(() => {
        mounted.forEach((renderer) => { try { act(() => renderer.unmount()); } catch (e) { /* already unmounted */ } });
        mounted = [];
        jest.restoreAllMocks();
    });

    // The card asked for is the ABHA this screen was opened for: a later lookup of another ABHA, left unsaved, is not it.
    it("asks for the card of an ABHA with no number by its address", async () => {
        const view = await show({abhaLastFour: null, abhaAddress: "asha@sbx"});
        expect(view.abhaService.getCardFile).toHaveBeenCalledWith("s-1", null, "asha@sbx");
    });

    it("fetches the card for the subject and shows it with Download, Share and Close", async () => {
        const view = await show();

        expect(view.abhaService.getCardFile).toHaveBeenCalledWith("s-1", LAST_FOUR, undefined);
        expect(view.renderer.root.findByType(Image).props.source).toEqual({uri: `file://${CARD_PATH}`});
        expect(view.titles()).toEqual(["abhaCardDownload", "abhaCardShare", "abhaCardClose"]);
    });

    it("downloads to the phone's Downloads folder as abha-card with the last four digits and the time, and says where", async () => {
        const view = await show();

        await view.press("abhaCardDownload");

        const [from, to] = mockCopyFile.mock.calls[0];
        expect(from).toBe(CARD_PATH);
        expect(to).toMatch(/^\/storage\/Download\/abha-card-9012-\d{8}-\d{6}\.png$/);
        const fileName = to.replace("/storage/Download/", "");
        expect(view.lines().join("|")).toContain("abhaCardDownloaded");
        expect(view.lines().join("|")).toContain(fileName);
        expect(mockUnlink).not.toHaveBeenCalled();
    });

    it("names each download by the time it was saved, so another patient's card with the same last four digits is never overwritten", () => {
        const at = new Date(2026, 9, 21, 9, 5, 7);
        expect(AbhaCardView.downloadFileName("9012", at)).toBe("abha-card-9012-20261021-090507.png");
        expect(AbhaCardView.downloadFileName("9012", new Date(2026, 9, 21, 9, 5, 8))).not.toBe(AbhaCardView.downloadFileName("9012", at));
        expect(AbhaCardView.downloadFileName(null, at)).toBe("abha-card-20261021-090507.png");
    });

    it("logs only a fixed line when saving or sharing fails, never the error, which can carry the file's path", async () => {
        const view = await show();
        mockCopyFile.mockRejectedValueOnce(new Error(`EACCES: open failed ${CARD_PATH}`));
        await view.press("abhaCardDownload");
        mockShareOpen.mockRejectedValueOnce(new Error(`No app can open file://${CARD_PATH}`));
        await view.press("abhaCardShare");

        const logged = General.logWarn.mock.calls.map((args) => JSON.stringify(args)).join("|");
        expect(General.logWarn).toHaveBeenCalledTimes(2);
        ["EACCES", "/cache", "abha-card-1", "No app"].forEach((detail) => expect(logged).not.toContain(detail));
    });

    it("says when saving fails", async () => {
        const view = await show();
        mockCopyFile.mockRejectedValueOnce(new Error("EACCES"));

        await view.press("abhaCardDownload");

        expect(ToastAndroid.show).toHaveBeenCalledWith("abhaCardDownloadFailed", ToastAndroid.LONG);
        expect(view.lines().join("|")).not.toContain("abhaCardDownloaded");
    });

    it("shares the image through the phone's share sheet", async () => {
        const view = await show();

        await view.press("abhaCardShare");

        expect(mockShareOpen).toHaveBeenCalledTimes(1);
        const [options] = mockShareOpen.mock.calls[0];
        expect(options.url).toBe(`file://${CARD_PATH}`);
        expect(options.type).toBe("image/png");
        expect(mockCopyFile).not.toHaveBeenCalled();
    });

    it("treats closing the share sheet as nothing, and says when sharing fails", async () => {
        const view = await show();
        mockShareOpen.mockRejectedValueOnce(new Error("User did not share"));
        await view.press("abhaCardShare");
        expect(ToastAndroid.show).not.toHaveBeenCalled();

        mockShareOpen.mockRejectedValueOnce(new Error("no app"));
        await view.press("abhaCardShare");
        expect(ToastAndroid.show).toHaveBeenCalledWith("abhaCardShareFailed", ToastAndroid.LONG);
    });

    it("Close goes back", async () => {
        const view = await show();

        await view.press("abhaCardClose");

        expect(view.navigator.pop).toHaveBeenCalled();
    });

    it("tapping the card opens it full screen in the same zoomable viewer as a photo answer, and closing it stays on the card", async () => {
        const view = await show();
        expect(view.renderer.root.findAllByType(Modal)).toHaveLength(0);

        await act(async () => { view.renderer.root.findByType(TouchableNativeFeedback).props.onPress(); });

        const viewer = view.renderer.root.findByType(Modal);
        expect(viewer.findByType(ImageViewer).props.imageUrls).toEqual([{url: `file://${CARD_PATH}`}]);

        await act(async () => { viewer.props.onRequestClose(); });

        expect(view.renderer.root.findAllByType(Modal)).toHaveLength(0);
        expect(view.navigator.pop).not.toHaveBeenCalled();
        expect(view.titles()).toEqual(["abhaCardDownload", "abhaCardShare", "abhaCardClose"]);
    });

    it("deletesCacheFileOnUnmount", async () => {
        const view = await show();

        act(() => view.renderer.unmount());

        expect(mockUnlink).toHaveBeenCalledTimes(1);
        expect(mockUnlink).toHaveBeenCalledWith(CARD_PATH);
    });

    it("leaves a downloaded copy alone when it closes: only the fetched file is deleted", async () => {
        const view = await show();
        await view.press("abhaCardDownload");

        act(() => view.renderer.unmount());

        expect(mockUnlink.mock.calls.map(([path]) => path)).toEqual([CARD_PATH]);
    });

    it("deletes a card that arrives after the screen has closed", async () => {
        let arrive;
        const view = await show({getCardFile: () => new Promise((resolve) => { arrive = resolve; })});

        act(() => view.renderer.unmount());
        await act(async () => arrive(CARD_PATH));

        expect(mockUnlink).toHaveBeenCalledWith(CARD_PATH);
    });

    it("says the card could not be fetched, with Try again and Close, and Try again fetches once more", async () => {
        let attempt = 0;
        const view = await show({getCardFile: () => (++attempt === 1 ? Promise.reject(new Error("Network request failed")) : Promise.resolve(CARD_PATH))});

        expect(view.lines()).toContain("abhaCardFailed");
        expect(view.titles()).toEqual(["abhaCardTryAgain", "abhaCardClose"]);
        expect(view.renderer.root.findAllByType(Image)).toHaveLength(0);

        await view.press("abhaCardTryAgain");

        expect(view.abhaService.getCardFile).toHaveBeenCalledTimes(2);
        expect(view.renderer.root.findByType(Image).props.source).toEqual({uri: `file://${CARD_PATH}`});
    });

    it("gives each refusal the server named its own message", async () => {
        const cases = [[new AbhaError("ABHA_NOT_YOURS", 403), "abhaNotYours"], [new AbhaError("ABHA_NO_CARD", 404), "abhaNoCard"],
            [new AbhaError(null, 404), "abhaCardFailed"],
            [new AbhaError("ABHA_EKA_UNAVAILABLE", 502), "abhaEkaUnavailable"], [new AbhaError("ABHA_DISABLED", 403), "abhaDisabled"]];
        for (const [error, key] of cases) {
            const view = await show({getCardFile: () => Promise.reject(error)});
            expect(view.lines()).toContain(key);
            expect(view.titles()).toContain("abhaCardTryAgain");
        }
    });

    describe("once the patient's ABHA login at Eka has lapsed", () => {
        const SESSION = {accessToken: "key-1", hipId: "HIP-1", environment: "sandbox"};
        const SAME_ABHA = {abhaNumber: "91-1234-5678-9012", abhaAddress: "asha@sbx", ekaOid: "oid-2", ekaTxnId: "txn-2", route: "unknown", action: "linked"};
        const CONSENT = "The patient agrees to verify their ABHA.";
        let popToBookmark;

        // The first fetch finds the login lapsed; any later one gets the card.
        function lapsedThenCard() {
            let attempt = 0;
            return () => (++attempt === 1 ? Promise.reject(new AbhaError("ABHA_SESSION_EXPIRED", 409)) : Promise.resolve(CARD_PATH));
        }

        function showLapsed(options = {}) {
            return show({
                getCardFile: lapsedThenCard(),
                patient: {number: "91-1234-5678-9012", address: "asha@sbx"},
                translations: {abhaRegistrationConsent: CONSENT},
                abha: {
                    getSession: jest.fn(() => Promise.resolve(SESSION)),
                    keepEvent: jest.fn(() => Promise.resolve()),
                    recordEvent: jest.fn(() => Promise.resolve(true)),
                    resendUnsentEvents: jest.fn(() => Promise.resolve()),
                },
                ...options,
            });
        }

        // Verify ABHA, the patient agrees, and Eka's screens open. Gives what Eka's screens were opened with.
        async function verifyWithConsent(view, agreedAt = new Date("2026-10-21T07:00:00Z")) {
            await view.press("abhaCardVerify");
            await act(async () => { view.renderer.root.findByType(AbhaConsentDialog).props.onContinue(agreedAt); });
            const [, session, options, onProfile, onSkip] = CHSNavigator.navigateToAbhaView.mock.calls[0] || [];
            return {session, options, onProfile, onSkip};
        }

        beforeEach(() => {
            popToBookmark = jest.fn();
            jest.spyOn(TypedTransition, "from").mockReturnValue({popToBookmark});
        });

        it("says the ABHA must be verified again, with Verify ABHA and Close: another try would not help", async () => {
            const view = await showLapsed();

            expect(view.lines()).toContain("abhaCardSessionExpired");
            expect(view.titles()).toEqual(["abhaCardVerify", "abhaCardClose"]);
        });

        it("takes the organisation's consent, then opens Eka's screens with a fresh key, as registration does", async () => {
            const view = await showLapsed();

            await view.press("abhaCardVerify");

            expect(view.renderer.root.findByType(AbhaConsentDialog).props.text).toBe(CONSENT);
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();
            const opened = await verifyWithConsent(view);
            expect(view.abhaService.getSession).toHaveBeenCalledWith("st-1");
            expect(opened.session).toBe(SESSION);
            expect(opened.options).toEqual({method: ABHA_SDK_METHOD});
        });

        it("records the patient's own ABHA as verified, with the consent time, and then shows the card", async () => {
            const view = await showLapsed();
            const opened = await verifyWithConsent(view);

            await act(async () => { await opened.onProfile(SAME_ABHA); });

            expect(popToBookmark).toHaveBeenCalled();
            expect(view.abhaService.recordEvent).toHaveBeenCalledWith(expect.objectContaining({
                uuid: expect.any(String), subjectUUID: "s-1", subjectTypeUUID: "st-1", action: "verified",
                abhaNumber: "91-1234-5678-9012", ekaOid: "oid-2", ekaTxnId: "txn-2", consentGivenAt: "2026-10-21T07:00:00.000Z",
            }));
            expect(view.abhaService.getCardFile).toHaveBeenCalledTimes(2);
            expect(view.abhaService.getCardFile.mock.invocationCallOrder[1]).toBeGreaterThan(view.abhaService.recordEvent.mock.invocationCallOrder[0]);
            expect(view.renderer.root.findByType(Image).props.source).toEqual({uri: `file://${CARD_PATH}`});
        });

        it("records nothing and fetches nothing for an ABHA other than the patient's, and says so", async () => {
            const view = await showLapsed();
            const opened = await verifyWithConsent(view);

            await act(async () => { await opened.onProfile({...SAME_ABHA, abhaNumber: "91-1111-2222-3333"}); });

            expect(view.abhaService.keepEvent).not.toHaveBeenCalled();
            expect(view.abhaService.recordEvent).not.toHaveBeenCalled();
            expect(view.abhaService.getCardFile).toHaveBeenCalledTimes(1);
            expect(view.lines()).toContain("abhaCardDifferentAbha");
            expect(view.titles()).toEqual(["abhaCardVerify", "abhaCardClose"]);
        });

        it("matches a registration not saved yet by the last four digits it was opened with", async () => {
            const view = await showLapsed({patient: null});
            const opened = await verifyWithConsent(view);

            await act(async () => { await opened.onProfile(SAME_ABHA); });

            expect(view.abhaService.recordEvent).toHaveBeenCalledWith(expect.objectContaining({action: "verified"}));
        });

        it("matches a patient linked through the mobile route by the ABHA address, having no number", async () => {
            const view = await showLapsed({abhaLastFour: null, patient: {address: "Asha@sbx"}});
            const opened = await verifyWithConsent(view);

            await act(async () => { await opened.onProfile({...SAME_ABHA, abhaNumber: null}); });

            expect(view.abhaService.recordEvent).toHaveBeenCalledWith(expect.objectContaining({action: "verified", abhaAddress: "asha@sbx"}));
        });

        it("opens nothing when the patient does not agree, or the consent is closed", async () => {
            const view = await showLapsed();

            await view.press("abhaCardVerify");
            await act(async () => { view.renderer.root.findByType(AbhaConsentDialog).props.onDecline(); });
            await view.press("abhaCardVerify");
            await act(async () => { view.renderer.root.findByType(AbhaConsentDialog).props.onCancel(); });

            expect(view.abhaService.getSession).not.toHaveBeenCalled();
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();
            expect(view.renderer.root.findAllByType(AbhaConsentDialog)).toHaveLength(0);
        });

        it("says it needs internet, and opens nothing, without internet", async () => {
            const view = await showLapsed();
            mockConnection.isConnected = false;

            await view.press("abhaCardVerify");

            expect(ToastAndroid.show).toHaveBeenCalledWith("abhaCardNeedsInternet", ToastAndroid.LONG);
            expect(view.renderer.root.findAllByType(AbhaConsentDialog)).toHaveLength(0);
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();
        });

        it("says why when the server refuses the key, and opens nothing", async () => {
            const view = await showLapsed();
            view.abhaService.getSession.mockImplementation(() => Promise.reject(new AbhaError("ABHA_NO_HEALTH_CENTRE", 403)));

            await verifyWithConsent(view);

            expect(ToastAndroid.show).toHaveBeenCalledWith("abhaNoHealthCentre", ToastAndroid.LONG);
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();
        });

        it("leaves the card screen as it was when Eka's screens are closed without an ABHA", async () => {
            const view = await showLapsed();
            const opened = await verifyWithConsent(view);

            await act(async () => { opened.onSkip(); });

            expect(popToBookmark).toHaveBeenCalled();
            expect(view.abhaService.recordEvent).not.toHaveBeenCalled();
            expect(view.titles()).toEqual(["abhaCardVerify", "abhaCardClose"]);
        });
    });

    it("never logs the number, the file's path or anything else of the card", async () => {
        const view = await show({getCardFile: () => Promise.reject(new AbhaError("ABHA_EKA_UNAVAILABLE", 502))});
        await view.press("abhaCardTryAgain");
        await view.press("abhaCardTryAgain");
        const logged = General.logWarn.mock.calls.map((args) => JSON.stringify(args)).join("|");
        expect(logged).not.toContain("9012");
        expect(logged).not.toContain("1234");
        expect(logged).not.toContain("abha-card-1");
    });

    it("has all its strings in the platform translations", () => {
        ["abhaCardTitle", "abhaCardDownload", "abhaCardShare", "abhaCardClose", "abhaCardTryAgain", "abhaCardDownloaded",
            "abhaCardFailed", "abhaCardNeedsInternet", "abhaCardDownloadFailed", "abhaCardShareFailed", "abhaViewCard",
            "abhaCardSessionExpired", "abhaCardVerify", "abhaCardDifferentAbha"]
            .forEach((key) => expect(en.translations[key]).toBeTruthy());
    });
});
