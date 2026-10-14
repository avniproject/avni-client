import React from "react";
import TestRenderer, {act} from "react-test-renderer";

let scannerConfig;
let hasPermission = true;
const requestPermission = jest.fn();
jest.doMock("react-native-vision-camera", () => {
    const React = require("react");
    const {View} = require("react-native");
    return {
        Camera: (props) => React.createElement(View, {testID: "camera", ...props}),
        useCameraDevice: () => ({id: "0", position: "back"}),
        useCameraPermission: () => ({hasPermission, requestPermission}),
        useCodeScanner: (config) => { scannerConfig = config; return {config}; },
    };
});
const ClinicHubScanner = require("../../../src/views/clinicsharing/ClinicHubScanner").default;

const KEY = "q83vEjRWeJ-rze8SNFZ4kKvN7xI0VniQq83vEjRWeJA";
const CODE = JSON.stringify({v: 1, ssid: "AndroidShare_4821", passphrase: "x7k2m9q4w1e8", hubId: "h1", epoch: "e1", key: KEY});
const see = (value) => act(() => scannerConfig.onCodeScanned([{type: "qr", value}]));
// Inside act, so the component's effects have run before the test looks.
const render = (element) => {
    let renderer;
    act(() => { renderer = TestRenderer.create(element); });
    return renderer;
};

describe("ClinicHubScanner", () => {
    beforeEach(() => { hasPermission = true; requestPermission.mockClear(); });

    it("scans QR codes only, with the bundled scanner's camera", () => {
        const renderer = render(<ClinicHubScanner onScanned={jest.fn()}/>);
        expect(scannerConfig.codeTypes).toEqual(["qr"]);
        expect(renderer.root.findByProps({testID: "camera"}).props.isActive).toBe(true);
    });

    it("reports a code once, though the camera sees it on every frame", () => {
        const onScanned = jest.fn();
        render(<ClinicHubScanner onScanned={onScanned}/>);
        see(CODE);
        see(CODE);
        expect(onScanned).toHaveBeenCalledTimes(1);
        expect(onScanned.mock.calls[0][0].ok).toBe(true);
        expect(onScanned.mock.calls[0][1]).toBe(CODE);
    });

    it("reports a code that is not a hub's, so the screen can say so", () => {
        const onScanned = jest.fn();
        render(<ClinicHubScanner onScanned={onScanned}/>);
        see("https://example.org");
        expect(onScanned).toHaveBeenCalledWith({ok: false, error: "notJson"}, "https://example.org");
    });

    it("reports the same code again after a failed join, once it is active again", () => {
        const onScanned = jest.fn();
        const renderer = render(<ClinicHubScanner onScanned={onScanned} isActive={true}/>);
        see(CODE);
        act(() => renderer.update(<ClinicHubScanner onScanned={onScanned} isActive={false}/>));
        act(() => renderer.update(<ClinicHubScanner onScanned={onScanned} isActive={true}/>));
        see(CODE);
        expect(onScanned).toHaveBeenCalledTimes(2);
    });

    it("asks for the camera, and shows no camera until it may", () => {
        hasPermission = false;
        const renderer = render(<ClinicHubScanner onScanned={jest.fn()}/>);
        expect(requestPermission).toHaveBeenCalled();
        expect(renderer.root.findAllByProps({testID: "camera"})).toHaveLength(0);
    });
});
