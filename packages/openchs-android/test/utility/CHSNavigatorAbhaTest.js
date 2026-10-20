// CHSNavigator imports most of the view layer; these are the native modules it reaches that jest has no bridge for.
jest.mock("../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("react-native-zip-archive", () => ({zip: jest.fn(), unzip: jest.fn(), subscribe: jest.fn(() => ({remove: jest.fn()}))}));
jest.mock("react-native-randombytes", () => ({randomBytes: (n) => new Uint8Array(n || 16)}));
jest.mock("react-native-geolocation-service", () => ({}));
jest.mock("react-native-tcp-socket", () => ({}));
jest.mock("react-native-background-timer", () => ({}));
jest.mock("@react-native-documents/picker", () => ({}));
jest.mock("react-native-vision-camera", () => ({}));
jest.mock("@react-native-clipboard/clipboard", () => ({}));
jest.mock("react-native-share", () => ({}));
jest.mock("react-native-file-viewer", () => ({}));

import CHSNavigator from "../../src/utility/CHSNavigator";
import AbhaView from "../../src/views/abha/AbhaView";
import General from "../../src/utility/General";

const EKA_KEY = "eka-access-key-7f3a";

describe("CHSNavigator.navigateToAbhaView", () => {
    afterEach(() => jest.restoreAllMocks());

    it("opens the ABHA screen with the session and callbacks, bookmarking the screen it came from", () => {
        const navigator = {getCurrentRoutes: () => [{}, {}], push: jest.fn()};
        const source = {context: {navigator: () => navigator}};
        const session = {accessToken: EKA_KEY, expiresAt: "2026-10-20T10:30:00Z", environment: "sandbox", hipId: "hip-1"};
        const onProfile = () => {};
        const onSkip = () => {};

        CHSNavigator.navigateToAbhaView(source, session, {method: "login_or_create_abha", prefillAbhaAddress: "asha@sbx"}, onProfile, onSkip);

        expect(navigator.countOfRoutes).toBe(2);
        expect(navigator.push).toHaveBeenCalledWith({
            path: AbhaView.path(), isTyped: true,
            queryParams: {session, method: "login_or_create_abha", prefillAbhaAddress: "asha@sbx", onProfile, onSkip},
        });
    });

    it("does not log the key when navigation logs its parameters", () => {
        const logged = [];
        jest.spyOn(General, "isDebugEnabled").mockReturnValue(true);
        jest.spyOn(General, "logDebug").mockImplementation((...args) => logged.push(args.join(" ")));
        const navigator = {getCurrentRoutes: () => [], push: () => {}};

        CHSNavigator.navigateToAbhaView({context: {navigator: () => navigator}},
            {accessToken: EKA_KEY, environment: "sandbox", hipId: "hip-1"}, {method: "login_or_create_abha"}, () => {}, () => {});

        expect(logged.some((line) => line.includes("/abhaView"))).toBe(true);
        logged.forEach((line) => expect(line).not.toContain(EKA_KEY));
    });
});
