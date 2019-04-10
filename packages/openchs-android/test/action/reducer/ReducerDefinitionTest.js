import {expect} from "chai";
import Reducers from "../../../src/reducer/index";
import TestContext from "../views/testframework/TestContext";

jest.mock("react-native-device-info", () => {
    return {
        getVersion: function () {
            return 1;
        },
        getSystemVersion: function () {
            return 1;
        },
        getDeviceId: function () {
            return 1;
        }
    };
});

describe("ReducerDefinitionTest", () => {
    it("wiring", () => {
        const testContext = new TestContext();
        Reducers.createReducers(testContext);
    });
});