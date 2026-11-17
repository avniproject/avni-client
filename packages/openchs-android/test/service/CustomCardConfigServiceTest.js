// A Custom Design Card's page: the rule and the fill in one call, the template cache shared by the card's own screen
// and a full-page dashboard, and the download that only replaces the page file with a good response.

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("../../src/model/FileSystem", () => ({__esModule: true, default: {getCustomCardConfigsDir: () => "/cards"}}));
jest.mock("react-native-fs", () => ({
    exists: jest.fn(),
    readFile: jest.fn(),
    moveFile: jest.fn(() => Promise.resolve()),
    unlink: jest.fn(() => Promise.resolve()),
}));

import fs from "react-native-fs";
import RNFetchBlob from "react-native-blob-util";
import CustomCardConfigService, {
    clearCaches,
    lastFullPages,
    subscribeTemplateChange
} from "../../src/service/CustomCardConfigService";
import RuleEvaluationService from "../../src/service/RuleEvaluationService";
import MessageService from "../../src/service/MessageService";
import SettingsService from "../../src/service/SettingsService";
import AuthService from "../../src/service/AuthService";
import General from "../../src/utility/General";

const config = {uuid: "c1", htmlFileS3Key: "c1.html", getTranslations: () => ({greeting: "Hello"})};

const build = ({rule = () => ({data: {n: 1}})} = {}) => {
    const executeCustomCardDataRule = jest.fn(rule);
    const services = new Map([
        [RuleEvaluationService, {executeCustomCardDataRule}],
        [MessageService, {getI18n: () => ({t: (key) => key})}],
        [SettingsService, {getSettings: () => ({serverURL: "http://server", idpType: "none"})}],
        [AuthService, {getAuthProviderService: () => ({getAuthToken: () => Promise.resolve("token")})}],
    ]);
    const service = new CustomCardConfigService(null, {getService: (Class) => services.get(Class)});
    return {service, executeCustomCardDataRule};
};

const settle = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
};

describe("CustomCardConfigService.renderPage", () => {
    beforeEach(() => jest.spyOn(General, "logError").mockImplementation(() => {}));
    afterEach(() => jest.restoreAllMocks());

    it("fills the page from data, and does not call the deferred function when data is there", () => {
        const deferred = jest.fn(() => ({n: 2}));
        const {service} = build({rule: () => ({data: {n: 1}, deferredDataFunction: deferred})});
        expect(service.renderPage(config, [], "<p>${data.n}</p>")).toEqual({html: "<p>1</p>"});
        expect(deferred).not.toHaveBeenCalled();
    });

    it("calls the deferred function once when there is no data", () => {
        const deferred = jest.fn(() => ({n: 2}));
        const {service} = build({rule: () => ({deferredDataFunction: deferred})});
        expect(service.renderPage(config, [], "<p>${data.n}</p>")).toEqual({html: "<p>2</p>"});
        expect(deferred).toHaveBeenCalledTimes(1);
    });

    it("gives the rule's error, or the fallback text", () => {
        expect(build({rule: () => ({hasErrorMsg: true, errorMsg: "rule failed"})}).service.renderPage(config, [], "x")).toEqual({error: "rule failed"});
        expect(build({rule: () => ({hasErrorMsg: true})}).service.renderPage(config, [], "x")).toEqual({error: "Data rule failed"});
    });

    it("gives an error, never a throw, when the deferred function or the fill throws", () => {
        const throwing = build({rule: () => ({deferredDataFunction: () => {
            throw new Error("deferred threw");
        }})});
        expect(throwing.service.renderPage(config, [], "x")).toEqual({error: "deferred threw"});
        expect(build().service.renderPage(config, [], "${data.missing.x}").error).toMatch(/undefined/);
    });

    it("resolves translations in the page", () => {
        const {service} = build();
        expect(service.renderPage(config, [], "${translations.greeting} ${translations.other}")).toEqual({html: "Hello other"});
    });

    it("an empty template fills to an empty page", () => {
        expect(build().service.renderPage(config, [], "")).toEqual({html: ""});
    });

    it("gives only strings, never the rule's data", () => {
        const result = build().service.renderPage(config, [ {x: 1} ], "<p>${data.n}</p>");
        expect(Object.keys(result)).toEqual(["html"]);
        expect(typeof result.html).toBe("string");
    });

    it("passes the rule input to the rule", () => {
        const {service, executeCustomCardDataRule} = build();
        const input = [{type: "Address"}];
        service.renderPage(config, input, "x");
        expect(executeCustomCardDataRule).toHaveBeenCalledWith(config, input);
    });
});

describe("CustomCardConfigService template cache", () => {
    beforeEach(() => {
        clearCaches();
        jest.spyOn(General, "logError").mockImplementation(() => {});
        jest.spyOn(General, "logDebug").mockImplementation(() => {});
    });
    afterEach(() => jest.restoreAllMocks());

    it("two loads at once read the file once", async () => {
        const {service} = build();
        const read = jest.spyOn(service, "readHtmlTemplate").mockImplementation(() => Promise.resolve("<p/>"));
        const [a, b] = await Promise.all([service.loadTemplate(config), service.loadTemplate(config)]);
        expect([a, b]).toEqual(["<p/>", "<p/>"]);
        expect(read).toHaveBeenCalledTimes(1);
        expect(service.getCachedTemplate(config)).toEqual({template: "<p/>"});
        await service.loadTemplate(config);
        expect(read).toHaveBeenCalledTimes(1);
    });

    it("keeps a failed read as an error, and a later load tries again", async () => {
        const {service} = build();
        const read = jest.spyOn(service, "readHtmlTemplate").mockImplementationOnce(() => Promise.reject(new Error("offline")));
        await expect(service.loadTemplate(config)).rejects.toThrow("offline");
        expect(service.getCachedTemplate(config).error.message).toBe("offline");
        read.mockImplementation(() => Promise.resolve("<p/>"));
        await expect(service.loadTemplate(config)).resolves.toBe("<p/>");
    });

    it("a read still running when the file settles does not overwrite the cache", async () => {
        const {service} = build();
        let release;
        jest.spyOn(service, "readHtmlTemplate").mockImplementation(() => new Promise((resolve) => {
            release = resolve;
        }));
        const old = service.loadTemplate(config);
        jest.spyOn(service, "getAllNonVoided").mockReturnValue([config]);
        jest.spyOn(service, "downloadFromUrl").mockImplementation(() => Promise.resolve());
        fs.readFile.mockImplementation(() => Promise.resolve("<p>new</p>"));
        service.downloadHtmlFiles();
        await settle();
        expect(service.getCachedTemplate(config)).toBeUndefined();
        release("<p>old</p>");
        await old;
        expect(service.getCachedTemplate(config)).toBeUndefined();
    });

    it("drops the entry when a download settles, success or failure, and logs the failure", async () => {
        const {service} = build();
        jest.spyOn(service, "readHtmlTemplate").mockImplementation(() => Promise.resolve("<p/>"));
        jest.spyOn(service, "getAllNonVoided").mockReturnValue([config]);
        fs.readFile.mockImplementation(() => Promise.resolve("<p>changed</p>"));
        const download = jest.spyOn(service, "downloadFromUrl").mockImplementation(() => Promise.resolve());
        await service.loadTemplate(config);
        service.downloadHtmlFiles();
        await settle();
        expect(service.getCachedTemplate(config)).toBeUndefined();

        await service.loadTemplate(config);
        download.mockImplementation(() => Promise.reject(new Error("503")));
        service.downloadHtmlFiles();
        await settle();
        expect(service.getCachedTemplate(config)).toBeUndefined();
        expect(General.logError).toHaveBeenCalledWith("CustomCardConfigService", expect.stringContaining("503"));
    });

    it("tells listeners only when the page shown is now stale", async () => {
        const {service} = build();
        const listener = jest.fn();
        const unsubscribe = subscribeTemplateChange(listener);
        jest.spyOn(service, "getAllNonVoided").mockReturnValue([config]);
        jest.spyOn(service, "downloadFromUrl").mockImplementation(() => Promise.resolve());
        const read = jest.spyOn(service, "readHtmlTemplate").mockImplementation(() => Promise.resolve("<p>same</p>"));

        // Nothing cached: no page uses it yet.
        fs.readFile.mockImplementation(() => Promise.resolve("<p>same</p>"));
        service.downloadHtmlFiles();
        await settle();
        // The same content, as every full sync downloads every file again. The cached page is kept.
        await service.loadTemplate(config);
        service.downloadHtmlFiles();
        await settle();
        expect(listener).not.toHaveBeenCalled();
        expect(service.getCachedTemplate(config)).toEqual({template: "<p>same</p>"});
        expect(read).toHaveBeenCalledTimes(1);

        // New content.
        await service.loadTemplate(config);
        fs.readFile.mockImplementation(() => Promise.resolve("<p>new</p>"));
        service.downloadHtmlFiles();
        await settle();
        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith("c1");
        // Every kept page built from it is stale, shown or not; a page of another card is not.
        lastFullPages.set("d1", {html: "<p>1</p>", configUUID: "c1"});
        lastFullPages.set("d2", {html: "<p>2</p>", configUUID: "c2"});
        await service.loadTemplate(config);
        fs.readFile.mockImplementation(() => Promise.resolve("<p>newer</p>"));
        service.downloadHtmlFiles();
        await settle();
        expect(lastFullPages.get("d1").stale).toBe(true);
        expect(lastFullPages.get("d2").stale).toBeUndefined();
        expect(listener).toHaveBeenCalledTimes(2);
        lastFullPages.clear();

        // A file that had not downloaded now has.
        read.mockImplementation(() => Promise.reject(new Error("offline")));
        await service.loadTemplate(config).catch(() => {});
        service.downloadHtmlFiles();
        await settle();
        expect(listener).toHaveBeenCalledTimes(3);
        unsubscribe();
    });

    it("clearCaches empties the template cache and the last pages", async () => {
        const {service} = build();
        jest.spyOn(service, "readHtmlTemplate").mockImplementation(() => Promise.resolve("<p/>"));
        await service.loadTemplate(config);
        lastFullPages.set("d1", {html: "<p/>", filterKey: "{}", calculatedAt: new Date()});
        clearCaches();
        expect(service.getCachedTemplate(config)).toBeUndefined();
        expect(lastFullPages.size).toBe(0);
    });
});

describe("CustomCardConfigService.downloadFromUrl", () => {
    const fetchWith = (status) => {
        const fetch = jest.fn(() => Promise.resolve({info: () => ({status})}));
        RNFetchBlob.config.mockImplementation(() => ({fetch}));
        return fetch;
    };

    beforeEach(() => {
        fs.moveFile.mockClear();
        fs.unlink.mockClear();
        RNFetchBlob.config.mockClear();
    });

    it("downloads to a temp file and moves it into place on a good response", async () => {
        fetchWith(200);
        await build().service.downloadFromUrl("http://server/f", "/cards/c1.html");
        const tempPath = RNFetchBlob.config.mock.calls[0][0].path;
        expect(tempPath).toMatch(/^\/cards\/c1\.html\..+\.tmp$/);
        expect(fs.moveFile).toHaveBeenCalledWith(tempPath, "/cards/c1.html");
    });

    // A read on first open and a sync can download the same file at once.
    it("two downloads of the same file use their own temp files", async () => {
        fetchWith(200);
        const {service} = build();
        await Promise.all([service.downloadFromUrl("http://server/f", "/cards/c1.html"), service.downloadFromUrl("http://server/f", "/cards/c1.html")]);
        const [a, b] = RNFetchBlob.config.mock.calls.map(([options]) => options.path);
        expect(a).not.toBe(b);
    });

    it("leaves the old file on a response that is not 2xx", async () => {
        fetchWith(404);
        await expect(build().service.downloadFromUrl("http://server/f", "/cards/c1.html")).rejects.toThrow("404");
        expect(fs.moveFile).not.toHaveBeenCalled();
        expect(fs.unlink).toHaveBeenCalledWith(RNFetchBlob.config.mock.calls[0][0].path);
    });
});
