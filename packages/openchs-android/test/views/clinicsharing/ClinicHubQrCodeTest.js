import React from "react";
import {Text} from "react-native";
import TestRenderer from "react-test-renderer";

jest.doMock("react-native-qrcode-svg", () => {
    const React = require("react");
    const {View} = require("react-native");
    return {__esModule: true, default: (props) => React.createElement(View, {testID: "qr", ...props})};
});
const ClinicHubQrCode = require("../../../src/views/clinicsharing/ClinicHubQrCode").default;

describe("ClinicHubQrCode", () => {
    it("draws the code and writes the network name and password underneath", () => {
        const renderer = TestRenderer.create(
            <ClinicHubQrCode qrValue='{"v":1}' ssid="AndroidShare_4821" passphrase="x7k2m9q4w1e8" networkLabel="Network" passwordLabel="Password"/>
        );
        const qr = renderer.root.findByProps({testID: "qr"});
        expect(qr.props.value).toBe('{"v":1}');
        expect(qr.props.size).toBe(240);
        const lines = renderer.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));
        expect(lines).toEqual(["Network: AndroidShare_4821", "Password: x7k2m9q4w1e8"]);
    });
});
