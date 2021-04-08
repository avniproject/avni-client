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
        },
        getBrand: function () {
            return 1;
        },
        getManufacturerSync: function () {
            return 1;
        },
        getDeviceType: function () {
            return 1;
        },
        getCarrierSync: function () {
            return 1;
        },
        isEmulatorSync: function () {
            return 1;
        },
        getPowerStateSync: function () {
            return 1;
        },
        getFreeDiskStorageSync: function () {
            return 1;
        },
        getTotalMemorySync: function () {
            return 1;
        },
        getMaxMemorySync: function () {
            return 1;
        },
        isPinOrFingerprintSetSync: function () {
            return 1;
        },
        isLocationEnabledSync: function () {
            return 1;
        },
        getFirstInstallTimeSync: function () {
            return 1;
        },
        getLastUpdateTimeSync: function () {
            return 1;
        }
    };
});

jest.mock("react-native-zip-archive", () => {
    return {
        getVersion: function () {
            return 1;
        },
        getSystemVersion: function () {
            return 1;
        },
        getDeviceId: function () {
            return 1;
        },
        getBrand: function () {
            return 1;
        },
        getManufacturerSync: function () {
            return 1;
        },
        getDeviceType: function () {
            return 1;
        },
        getCarrierSync: function () {
            return 1;
        },
        isEmulatorSync: function () {
            return 1;
        },
        getPowerStateSync: function () {
            return 1;
        },
        getFreeDiskStorageSync: function () {
            return 1;
        },
        getTotalMemorySync: function () {
            return 1;
        },
        getMaxMemorySync: function () {
            return 1;
        },
        isPinOrFingerprintSetSync: function () {
            return 1;
        },
        isLocationEnabledSync: function () {
            return 1;
        },
        getFirstInstallTimeSync: function () {
            return 1;
        },
        getLastUpdateTimeSync: function () {
            return 1;
        }
    };
});

jest.mock("../../../src/utility/Analytics", () => {
    return {
        logEvent: function () {
        }
    }
});


describe("ReducerDefinitionTest", () => {
    it("wiring", () => {
        const testContext = new TestContext();
        Reducers.createReducers(testContext);
    });
});
