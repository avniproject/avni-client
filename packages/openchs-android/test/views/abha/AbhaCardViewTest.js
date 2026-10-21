import React from "react";
import {Button, Image, Text, ToastAndroid} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

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
jest.mock("../../../src/views/common/CHSContainer", () => ({
    __esModule: true,
    default: ({children}) => require("react").createElement(require("react-native").View, null, children),
}));

import ServiceContext from "../../../src/framework/context/ServiceContext";
import AbhaCardView from "../../../src/views/abha/AbhaCardView";
import AbhaService from "../../../src/service/AbhaService";
import AbhaError from "../../../src/service/AbhaError";
import General from "../../../src/utility/General";
import en from "../../../translations/en.json";

const CARD_PATH = "/cache/abha-card-1.png";
const LAST_FOUR = "9012";

let mounted = [];

async function show({getCardFile = () => Promise.resolve(CARD_PATH), abhaLastFour = LAST_FOUR} = {}) {
    const navigator = {pop: jest.fn(), getCurrentRoutes: () => []};
    const abhaService = {getCardFile: jest.fn(getCardFile)};
    const context = {
        getService: (type) => (type === AbhaService ? abhaService : {getI18n: () => ({t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key)})}),
        navigator: () => navigator,
    };
    let renderer;
    await act(async () => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}>
            <AbhaCardView subjectUUID="s-1" abhaLastFour={abhaLastFour}/>
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

    it("fetches the card for the subject and shows it with Download, Share and Close", async () => {
        const view = await show();

        expect(view.abhaService.getCardFile).toHaveBeenCalledWith("s-1");
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
            "abhaCardFailed", "abhaCardNeedsInternet", "abhaCardDownloadFailed", "abhaCardShareFailed", "abhaViewCard"]
            .forEach((key) => expect(en.translations[key]).toBeTruthy());
    });
});
