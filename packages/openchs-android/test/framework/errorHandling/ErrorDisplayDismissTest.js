import {assert} from "chai";
import React from "react";
import TestRenderer, {act} from "react-test-renderer";
import {Alert} from "react-native";
jest.mock("react-native-restart", () => ({Restart: jest.fn()}));
jest.mock("../../../src/service/AppInfoUploadService", () => ({__esModule: true, default: class {}}));
jest.mock("../../../src/views/ProgressBarView", () => () => null);
jest.mock("../../../src/framework/Config", () => ({allowServerURLConfig: false}));
import RNRestart from "react-native-restart";
import {ErrorDisplay} from "../../../src/framework/errorHandling/ErrorDisplay";

// #2188: the "App will restart now" dialog must not leave the user on the bare logo screen.
describe('ErrorDisplay dialog (#2188)', () => {
    let alerts;
    beforeEach(() => {
        alerts = [];
        Alert.alert = (...args) => alerts.push(args);
        RNRestart.Restart.mockReset();
    });

    const show = () => {
        act(() => { TestRenderer.create(<ErrorDisplay avniError={{getDisplayMessage: () => "boom"}} context={null}/>); });
        assert.isAtLeast(alerts.length, 1);
        const [title, , buttons, options] = alerts[0];
        assert.equal(title, "App will restart now");
        return {buttons, options};
    };

    it('cannot be dismissed with Back or a tap outside', () => {
        const {options} = show();
        assert.isFalse(options.cancelable);
    });

    it('restarts the app whichever button is pressed, apart from upload which restarts when it finishes', () => {
        const {buttons} = show();
        buttons.filter(b => b.text !== "Upload issue info").forEach(b => {
            RNRestart.Restart.mockReset();
            act(() => b.onPress());
            assert.equal(RNRestart.Restart.mock.calls.length, 1, `${b.text} should restart`);
        });
    });
});
