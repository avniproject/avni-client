import {expect} from "chai";
import Reducers from "../../../src/reducer/index";
import TestContext from "../views/testframework/TestContext";

jest.mock("NativeModules", () => {
    return {
        DeviceInfo: {}
    };
});

describe("ReducerDefinitionTest", () => {
    it("wiring", () => {
        const testContext = new TestContext();
        Reducers.createReducers(testContext);
    });
});