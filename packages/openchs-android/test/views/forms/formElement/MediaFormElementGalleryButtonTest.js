import React from "react";
import {StyleSheet, TouchableNativeFeedback} from "react-native";
import TestRenderer, {act} from "react-test-renderer";
import _ from "lodash";

// MediaFormElement reaches native modules this test has no use for: the two pickers, the filesystem,
// the vision camera behind GuidedCameraModal, the image resizer. Each is swapped for the smallest
// stub that lets the row draw and lets a tap be observed.
const launchCamera = jest.fn();
const launchImageLibrary = jest.fn();
const fsExists = jest.fn(() => Promise.resolve(true));
jest.doMock("react-native-image-picker", () => ({
    launchCamera: (...args) => launchCamera(...args),
    launchImageLibrary: (...args) => launchImageLibrary(...args),
}));
jest.doMock("react-native-fs", () => ({
    ExternalDirectoryPath: "/mock/external",
    DocumentDirectoryPath: "/mock/document",
    exists: (path) => fsExists(path),
    moveFile: jest.fn(() => Promise.resolve()),
    copyFile: jest.fn(() => Promise.resolve()),
    unlink: jest.fn(() => Promise.resolve()),
}));
jest.doMock("react-native-vector-icons/MaterialCommunityIcons", () => ({
    __esModule: true,
    default: ({name}) => require("react").createElement(require("react-native").Text, {testID: `icon:${name}`}, name),
}));
jest.doMock("../../../../src/views/form/formElement/GuidedCameraModal", () => ({
    __esModule: true,
    default: ({visible}) => require("react").createElement(require("react-native").Text, {testID: `guided-camera:${visible}`}, "guided camera"),
}));
jest.doMock("@bam.tech/react-native-image-resizer", () => ({__esModule: true, default: {createResizedImage: jest.fn()}}));
jest.doMock("../../../../src/utility/DevicePermissions", () => ({__esModule: true, default: {request: () => Promise.resolve(true)}}));
jest.doMock("../../../../src/views/common/ExpandableMedia", () => ({__esModule: true, default: () => null}));
jest.doMock("../../../../src/views/common/FormElementLabelWithDocumentation", () => ({__esModule: true, default: () => null}));
jest.doMock("../../../../src/views/form/ValidationErrorMessage", () => ({__esModule: true, default: () => null}));
// native-base primitives need a NativeBaseProvider above them, which this test has no use for.
jest.doMock("native-base", () => {
    const RN = require("react-native");
    return {__esModule: true, View: RN.View, Text: RN.Text};
});

const SingleSelectMediaFormElement = require("../../../../src/views/form/formElement/SingleSelectMediaFormElement").default;
const ServiceContext = require("../../../../src/framework/context/ServiceContext").default;
const FileSystem = require("../../../../src/model/FileSystem").default;
const {clearGuidanceBlobCache} = require("../../../../src/model/CaptureGuidance");
const {KeyValue} = require("openchs-models");
const TestConceptFactory = require("../../../model/TestConceptFactory").default;
const TestFormElementFactory = require("../../../model/form/TestFormElementFactory").default;
const TestFormElementGroupFactory = require("../../../model/form/TestFormElementGroupFactory").default;
const TestFormFactory = require("../../../model/form/TestFormFactory").default;

// The two App Designer checkboxes, as the server sends them: key-values with string values.
const photoQuestion = ({guidedCamera, restrictGalleryUpload, captureGuidance, imageQuality} = {}) => {
    const page = TestFormElementGroupFactory.create({name: "Oral screening", form: TestFormFactory.createWithDefaults({formType: "Encounter"})});
    const keyValues = [];
    if (!_.isNil(guidedCamera)) keyValues.push(KeyValue.fromResource({key: "guidedCamera", value: guidedCamera}));
    if (!_.isNil(restrictGalleryUpload)) keyValues.push(KeyValue.fromResource({key: "restrictGalleryUpload", value: restrictGalleryUpload}));
    if (!_.isNil(imageQuality)) keyValues.push(KeyValue.fromResource({key: "imageQuality", value: imageQuality}));
    const element = TestFormElementFactory.create({
        name: "Oral Image", displayOrder: 1, formElementGroup: page, keyValues,
        concept: TestConceptFactory.createWithDefaults({name: "Oral Image", dataType: "Image"}),
    });
    element.captureGuidance = captureGuidance; // what the rule engine stamps on the row
    return element;
};

const context = {
    getService: () => ({getI18n: () => ({t: (key) => key})}),
    getStore: () => ({getState: () => ({}), subscribe: () => () => {}, dispatch: () => {}}),
};

const draw = (element) => {
    let renderer;
    act(() => {
        renderer = TestRenderer.create(
            <ServiceContext.Provider value={context}>
                <SingleSelectMediaFormElement element={element} actionName="PHOTO_CHANGED"/>
            </ServiceContext.Provider>);
    });
    return renderer;
};

const flush = () => new Promise((resolve) => setImmediate(resolve));
const settle = async (renderer) => { await act(async () => { await flush(); }); return renderer; };
const hasIcon = (node, name) => node.findAll((n) => n.props.testID === `icon:${name}`).length > 0;
const buttons = (renderer) => renderer.root.findAllByType(TouchableNativeFeedback);
// The strip is the 40px-high row that holds the buttons. A row with no button must not draw an empty one.
const buttonStrips = (renderer) => renderer.root.findAll((n) => n.type === "View" && _.get(StyleSheet.flatten(n.props.style), "height") === 40);
const buttonHolding = (renderer, name) => buttons(renderer).find((touchable) => hasIcon(touchable, name));
const tap = async (touchable) => { await act(async () => { touchable.props.onPress(); await flush(); }); };
const guidedCameraOpen = (renderer) => renderer.root.findAll((n) => n.props.testID === "guided-camera:true").length > 0;

const BAD_RULE = {blockCapture: {reason: "misconfiguration"}};

beforeEach(() => {
    launchCamera.mockClear();
    launchImageLibrary.mockClear();
    fsExists.mockReset().mockImplementation(() => Promise.resolve(true));
    clearGuidanceBlobCache();
});

describe("The gallery button on a photo question follows 'Do not allow upload from gallery' alone (#2166)", () => {
    it("plain question, gallery allowed: gallery and camera", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: false, restrictGalleryUpload: false})));
        expect(hasIcon(renderer.root, "folder-open")).toBe(true);
        expect(hasIcon(renderer.root, "camera")).toBe(true);
    });

    it("plain question, gallery not allowed: camera only", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: false, restrictGalleryUpload: true})));
        expect(hasIcon(renderer.root, "folder-open")).toBe(false);
        expect(hasIcon(renderer.root, "camera")).toBe(true);
    });

    it("guided question, gallery allowed: gallery and camera", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: true, restrictGalleryUpload: false})));
        expect(hasIcon(renderer.root, "folder-open")).toBe(true);
        expect(hasIcon(renderer.root, "camera")).toBe(true);
    });

    it("guided question with the gallery setting left unset: gallery shown, as on a plain question", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: true})));
        expect(hasIcon(renderer.root, "folder-open")).toBe(true);
    });

    it("guided question, gallery not allowed: camera only", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: true, restrictGalleryUpload: true})));
        expect(hasIcon(renderer.root, "folder-open")).toBe(false);
        expect(hasIcon(renderer.root, "camera")).toBe(true);
    });

    it("tapping the gallery on a guided question opens the gallery, never the guided camera", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: true, restrictGalleryUpload: false})));
        await tap(buttonHolding(renderer, "folder-open"));
        expect(launchImageLibrary).toHaveBeenCalledTimes(1);
        expect(launchCamera).not.toHaveBeenCalled();
        expect(guidedCameraOpen(renderer)).toBe(false);
    });

    it("tapping the camera on a guided question still opens the guided camera, not the system camera", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: true, restrictGalleryUpload: false})));
        await tap(buttonHolding(renderer, "camera"));
        expect(launchCamera).not.toHaveBeenCalled();
        expect(guidedCameraOpen(renderer)).toBe(true);
    });

    it("blocked by a bad rule, gallery allowed: red box, gallery, no camera", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: true, restrictGalleryUpload: false, captureGuidance: BAD_RULE})));
        expect(hasIcon(renderer.root, "alert-circle-outline")).toBe(true);
        expect(hasIcon(renderer.root, "folder-open")).toBe(true);
        expect(hasIcon(renderer.root, "camera")).toBe(false);
        expect(buttonStrips(renderer)).toHaveLength(1);
    });

    it("blocked by a bad rule, gallery not allowed: red box and no buttons", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: true, restrictGalleryUpload: true, captureGuidance: BAD_RULE})));
        expect(hasIcon(renderer.root, "alert-circle-outline")).toBe(true);
        expect(buttons(renderer)).toHaveLength(0);
        expect(buttonStrips(renderer)).toHaveLength(0);
    });

    it("blocked because a guidance image is missing on the device: gallery still shows, camera does not", async () => {
        fsExists.mockImplementation(() => Promise.resolve(false));
        const guidance = {reckoner: `${FileSystem.getGuidanceDir()}/missing.png`};
        const renderer = await settle(draw(photoQuestion({guidedCamera: true, restrictGalleryUpload: false, captureGuidance: guidance})));
        expect(hasIcon(renderer.root, "alert-circle-outline")).toBe(true);
        expect(hasIcon(renderer.root, "folder-open")).toBe(true);
        expect(hasIcon(renderer.root, "camera")).toBe(false);
    });

    it("while the row is probing its guidance images, the camera waits and the gallery does not", async () => {
        let foundOnDevice;
        fsExists.mockImplementation(() => new Promise((resolve) => { foundOnDevice = resolve; }));
        const guidance = {reckoner: `${FileSystem.getGuidanceDir()}/tooth.png`};
        const renderer = await settle(draw(photoQuestion({guidedCamera: true, restrictGalleryUpload: false, captureGuidance: guidance})));
        expect(buttonHolding(renderer, "camera").props.disabled).toBe(true);
        expect(buttonHolding(renderer, "folder-open").props.disabled).toBeFalsy();

        await act(async () => { foundOnDevice(true); await flush(); });
        expect(buttonHolding(renderer, "camera").props.disabled).toBe(false);
        expect(buttonHolding(renderer, "folder-open").props.disabled).toBeFalsy();
    });
});

// QA on #1996, 8 Oct 2026: a bad photo setting is a set-up problem, so the row says so before any photo
// is taken, instead of saving one at a quality nobody chose.
describe("A guided photo question with a bad photo setting (#1996)", () => {
    const showsText = (renderer, text) => renderer.root.findAll((n) => n.props.children === text).length > 0;

    // The gallery reads the same photo settings, and the photo picker crashes on a quality it cannot read
    // as a number, so this block, unlike a rule's or a missing picture's, takes the gallery with it.
    it("imageQuality 'abc': the set-up message, and neither camera nor gallery", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: true, restrictGalleryUpload: false, imageQuality: "abc"})));
        expect(showsText(renderer, "guidedCaptureMisconfigured")).toBe(true);
        expect(hasIcon(renderer.root, "camera")).toBe(false);
        expect(hasIcon(renderer.root, "folder-open")).toBe(false);
        expect(buttonStrips(renderer)).toHaveLength(0);
    });

    it("imageQuality 0.6, typed as text in App Designer: the camera works as usual", async () => {
        const renderer = await settle(draw(photoQuestion({guidedCamera: true, restrictGalleryUpload: false, imageQuality: "0.6"})));
        expect(showsText(renderer, "guidedCaptureMisconfigured")).toBe(false);
        expect(hasIcon(renderer.root, "camera")).toBe(true);
    });

    it("a plain photo question keeps today's behaviour, whatever its photo settings", async () => {
        const renderer = await settle(draw(photoQuestion({imageQuality: "abc"})));
        expect(showsText(renderer, "guidedCaptureMisconfigured")).toBe(false);
        expect(hasIcon(renderer.root, "camera")).toBe(true);
    });
});
