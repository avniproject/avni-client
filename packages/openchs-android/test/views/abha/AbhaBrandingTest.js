import nodeFs from "fs";
import path from "path";

// The build's assets, by file name: what react-native-fs would read from android/app/src/<flavour>/assets.
let mockAssets = {};
jest.mock("react-native-fs", () => ({
    existsAssets: jest.fn((name) => Promise.resolve(Object.prototype.hasOwnProperty.call(mockAssets, name))),
    readFileAssets: jest.fn((name, encoding) => Object.prototype.hasOwnProperty.call(mockAssets, name)
        ? Promise.resolve(mockAssets[name][encoding]) : Promise.reject(new Error(`no asset ${name}`))),
}));

import fs from "react-native-fs";
import AbhaBranding, {ABHA_BRANDING_FILE} from "../../../src/views/abha/AbhaBranding";
import General from "../../../src/utility/General";

const TANUH_ASSETS = path.join(__dirname, "../../../android/app/src/tanuh/assets");
const asset = (text, base64) => ({utf8: text, base64});
const brandingFile = (config) => asset(JSON.stringify(config));

function captureWarnings() {
    const warnings = [];
    jest.spyOn(General, "logWarn").mockImplementation((...args) => warnings.push(args.join(" ")));
    return warnings;
}

describe("AbhaBrandingTest", () => {
    beforeEach(() => {
        mockAssets = {};
        AbhaBranding.reset();
        jest.clearAllMocks();
    });
    afterEach(() => jest.restoreAllMocks());

    it("gives nothing, and says nothing, for a build that ships no branding", async () => {
        const warnings = captureWarnings();
        expect(await AbhaBranding.load()).toBeNull();
        expect(AbhaBranding.current()).toBeNull();
        expect(warnings).toEqual([]);
    });

    it("reads the Tanuh build's file as shipped, with every value kept", async () => {
        const warnings = captureWarnings();
        const config = JSON.parse(nodeFs.readFileSync(path.join(TANUH_ASSETS, ABHA_BRANDING_FILE), "utf8"));
        mockAssets[ABHA_BRANDING_FILE] = asset(JSON.stringify(config));
        mockAssets[config.orgIcon] = asset(null, nodeFs.readFileSync(path.join(TANUH_ASSETS, config.orgIcon)).toString("base64"));

        const branding = await AbhaBranding.load();

        expect(warnings).toEqual([]);
        expect(branding.theme).toEqual(config.theme);
        expect(branding.brandColour).toBe("#00767D");
        expect(branding.fontFamily).toBe("Roboto, sans-serif");
        expect(branding.textReplacements).toEqual(config.textReplacements);
        expect(branding.imageTopCrops).toEqual({cmj9r: 14});
        expect(branding.logoInPlaceOfAbdm).toBe(true);
        expect(branding.logoUrl).toMatch(/^data:image\/png;base64,iVBORw0KGgo/);
        expect(AbhaBranding.current()).toBe(branding);
    });

    it("words Eka's lines in the Tanuh file without naming any company", () => {
        const config = JSON.parse(nodeFs.readFileSync(path.join(TANUH_ASSETS, ABHA_BRANDING_FILE), "utf8"));
        const shown = [
            "Allow Eka Care to create ABHA locker and link health data", "Allow Eka Care to  link health data",
            "Create Eka Profile", "Select Eka Profile", "Choose an Eka Profile", "Unable to open Eka App",
        ].map((line) => config.textReplacements.reduce((text, {find, replace}) => text.replace(new RegExp(find, "g"), () => replace), line));
        shown.forEach((line) => expect(line).not.toMatch(/Eka|TANUH|Tanuh/));
        expect(shown[0]).toBe("Allow creation of an ABHA locker and linking of health data");
        expect(shown[1]).toBe("Allow linking of health data");
    });

    it("reads the file once, however often it is asked for", async () => {
        mockAssets[ABHA_BRANDING_FILE] = brandingFile({fontFamily: "Roboto"});
        await Promise.all([AbhaBranding.load(), AbhaBranding.load()]);
        await AbhaBranding.load();
        expect(fs.readFileAssets.mock.calls.filter(([name]) => name === ABHA_BRANDING_FILE)).toHaveLength(1);
    });

    it("gives nothing, with a warning, for a file that is not JSON or not an object", async () => {
        for (const text of ["{not json", "[1, 2]", "null"]) {
            AbhaBranding.reset();
            const warnings = captureWarnings();
            mockAssets[ABHA_BRANDING_FILE] = asset(text);
            expect(await AbhaBranding.load()).toBeNull();
            expect(warnings).toHaveLength(1);
            jest.restoreAllMocks();
        }
    });

    it("leaves out every value that could break out of the page, and keeps the rest", async () => {
        const warnings = captureWarnings();
        mockAssets[ABHA_BRANDING_FILE] = brandingFile({
            theme: {primary: {brand: "#00767D", accent: "red"}, surface: {base: "#FFF;}</style><script>"}, content: "#111827"},
            fontFamily: "Roboto}</style>",
            textReplacements: [{find: "Create Eka Profile", replace: "Create Profile"}, {find: "(", replace: "x"},
                {find: "Eka", replace: "Eka Care"}, {find: "Eka", replace: 7}, "Eka"],
            imageTopCrops: {cmj9r: 14, 'x"]{}*{': 10, cm6agrs: 90, cm4ml: 2.5},
            logoInPlaceOfAbdm: "yes",
        });

        const branding = await AbhaBranding.load();

        expect(branding.theme).toEqual({primary: {brand: "#00767D"}});
        expect(branding.fontFamily).toBeNull();
        expect(branding.textReplacements).toEqual([{find: "Create Eka Profile", replace: "Create Profile"}]);
        expect(branding.imageTopCrops).toEqual({cmj9r: 14});
        expect(branding.logoInPlaceOfAbdm).toBe(false);
        expect(warnings).toHaveLength(5);
    });

    it("keeps the rest of the branding when the logo cannot be had", async () => {
        for (const [orgIcon, logo] of [["missing.png", null], ["../../secret.png", "AAAA"], ["logo.svg", "AAAA"]]) {
            AbhaBranding.reset();
            const warnings = captureWarnings();
            mockAssets = {[ABHA_BRANDING_FILE]: brandingFile({fontFamily: "Roboto", orgIcon})};
            if (logo) mockAssets[orgIcon] = asset(null, logo);
            const branding = await AbhaBranding.load();
            expect(branding.fontFamily).toBe("Roboto");
            expect(branding.logoUrl).toBeNull();
            expect(warnings).toHaveLength(1);
            jest.restoreAllMocks();
        }
    });
});
