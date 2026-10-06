import React from "react";
import {Text, TouchableNativeFeedback, TouchableOpacity} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

// The guided camera is drawn for real; only the native layer under it is stubbed. Each test picks the
// phone's back camera: one with a flash, or one without.
const takePhoto = jest.fn();
let backCamera;
const phone = ({hasFlash}) => ({
    id: "0", position: "back", name: "Back camera", physicalDevices: ["wide-angle-camera"],
    hasFlash, hasTorch: hasFlash,
    formats: [{photoWidth: 1600, photoHeight: 1200, videoWidth: 1600, videoHeight: 1200}]
});
jest.doMock("react-native-vision-camera", () => {
    const React = require("react");
    const {View} = require("react-native");
    return {
        Camera: React.forwardRef((props, ref) => {
            React.useImperativeHandle(ref, () => ({takePhoto: (options) => takePhoto(options)}));
            return React.createElement(View, {testID: "viewfinder"});
        }),
        useCameraDevice: () => backCamera,
        useCameraFormat: (device) => device && device.formats[0],
        useCameraPermission: () => ({hasPermission: true, requestPermission: jest.fn()}),
    };
});
jest.doMock("react-native-image-picker", () => ({launchCamera: jest.fn(), launchImageLibrary: jest.fn()}));
jest.doMock("react-native-fs", () => ({
    ExternalDirectoryPath: "/mock/external",
    DocumentDirectoryPath: "/mock/document",
    exists: jest.fn(() => Promise.resolve(true)),
    moveFile: jest.fn(() => Promise.resolve()),
    copyFile: jest.fn(() => Promise.resolve()),
    unlink: jest.fn(() => Promise.resolve()),
}));
jest.doMock("react-native-vector-icons/MaterialCommunityIcons", () => ({
    __esModule: true,
    default: ({name}) => require("react").createElement(require("react-native").Text, {testID: `icon:${name}`}, name),
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
const GuidedCameraModal = require("../../../../src/views/form/formElement/GuidedCameraModal").default;
const ServiceContext = require("../../../../src/framework/context/ServiceContext").default;
const {KeyValue} = require("openchs-models");
const TestConceptFactory = require("../../../model/TestConceptFactory").default;
const TestFormElementFactory = require("../../../model/form/TestFormElementFactory").default;
const TestFormElementGroupFactory = require("../../../model/form/TestFormElementGroupFactory").default;
const TestFormFactory = require("../../../model/form/TestFormFactory").default;

// Guided camera ticked in App Designer; captureGuidance is whatever the form rule stamps on the row.
const guidedPhotoQuestion = (captureGuidance) => {
    const page = TestFormElementGroupFactory.create({name: "Oral screening", form: TestFormFactory.createWithDefaults({formType: "Encounter"})});
    const element = TestFormElementFactory.create({
        name: "Oral Image", displayOrder: 1, formElementGroup: page,
        keyValues: [KeyValue.fromResource({key: "guidedCamera", value: true})],
        concept: TestConceptFactory.createWithDefaults({name: "Oral Image", dataType: "Image"}),
    });
    element.captureGuidance = captureGuidance;
    return element;
};

const context = {
    getService: () => ({getI18n: () => ({t: (key) => key})}),
    getStore: () => ({getState: () => ({}), subscribe: () => () => {}, dispatch: () => {}}),
};

const flush = () => new Promise((resolve) => setImmediate(resolve));
const render = async (component) => {
    let renderer;
    await act(async () => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}>{component}</ServiceContext.Provider>);
        await flush();
    });
    return renderer;
};
const press = async (touchable) => { await act(async () => { touchable.props.onPress(); await flush(); }); };
const cameraButton = (renderer) => renderer.root.findAllByType(TouchableNativeFeedback)
    .find((touchable) => touchable.findAll((n) => n.props.testID === "icon:camera").length > 0);
// The shutter is the one camera control that carries no text.
const shutter = (renderer) => renderer.root.findAllByType(TouchableOpacity)
    .find((touchable) => touchable.findAllByType(Text).length === 0);
const showsText = (renderer, text) => renderer.root.findAllByType(Text).some((n) => n.props.children === text);
const viewfinderShown = (renderer) => renderer.root.findAll((n) => n.props.testID === "viewfinder").length > 0;

beforeEach(() => {
    takePhoto.mockReset().mockImplementation(() => Promise.resolve(
        {path: "/mock/photo.jpg", width: 1600, height: 1200, isRawPhoto: false, orientation: "portrait", isMirrored: false}));
});

describe("A guided photo question shoots with the flash on unless its rule says otherwise (#2166)", () => {
    const openCamera = async (captureGuidance) => {
        const renderer = await render(<SingleSelectMediaFormElement element={guidedPhotoQuestion(captureGuidance)} actionName="PHOTO_CHANGED"/>);
        await press(cameraButton(renderer));
        return renderer;
    };

    it("no flash policy from the rule: the photo is taken with the flash on", async () => {
        backCamera = phone({hasFlash: true});
        const renderer = await openCamera(undefined);
        await press(shutter(renderer));
        expect(takePhoto).toHaveBeenCalledWith({flash: "on"});
    });

    it("no flash policy from the rule, phone without a flash: the camera shows the flash error instead of the viewfinder", async () => {
        backCamera = phone({hasFlash: false});
        const renderer = await openCamera(undefined);
        expect(showsText(renderer, "guidedCameraFlashRequired")).toBe(true);
        expect(viewfinderShown(renderer)).toBe(false);
    });

    it("the rule asks for auto flash: the photo is taken with auto flash", async () => {
        backCamera = phone({hasFlash: true});
        const renderer = await openCamera({flash: "auto"});
        await press(shutter(renderer));
        expect(takePhoto).toHaveBeenCalledWith({flash: "auto"});
    });

    it("the rule lifts the flash block: a phone without a flash still opens the camera and shoots without flash", async () => {
        backCamera = phone({hasFlash: false});
        const renderer = await openCamera({blockOnNoFlash: false});
        expect(showsText(renderer, "guidedCameraFlashRequired")).toBe(false);
        await press(shutter(renderer));
        expect(takePhoto).toHaveBeenCalledWith({flash: "off"});
    });
});

describe("The guided camera opened with no flash policy at all", () => {
    const labels = {
        noBackCamera: "noBackCamera", flashRequired: "flashRequired", captureFailed: "captureFailed",
        permissionRequired: "permissionRequired", continueWithoutPhoto: "continueWithoutPhoto",
        openSettings: "openSettings", close: "close", retake: "retake", usePhoto: "usePhoto"
    };
    const openBare = () => render(<GuidedCameraModal visible={true} labels={labels} onClose={jest.fn()} onCapture={jest.fn()}/>);

    it("takes the photo with the flash on", async () => {
        backCamera = phone({hasFlash: true});
        const renderer = await openBare();
        await press(shutter(renderer));
        expect(takePhoto).toHaveBeenCalledWith({flash: "on"});
    });

    it("blocks a phone without a flash", async () => {
        backCamera = phone({hasFlash: false});
        const renderer = await openBare();
        expect(showsText(renderer, "flashRequired")).toBe(true);
        expect(viewfinderShown(renderer)).toBe(false);
    });
});
