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
import AbhaCardView from "../../src/views/abha/AbhaCardView";
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

describe("CHSNavigator.navigateToAbhaCardView", () => {
    afterEach(() => jest.restoreAllMocks());

    const ABHA_NUMBER = "91-1234-5678-9012";

    it("hands the card screen only the subject, its type and the number's last four digits, which name a download", () => {
        const navigator = {getCurrentRoutes: () => [], push: jest.fn()};

        CHSNavigator.navigateToAbhaCardView({context: {navigator: () => navigator}}, {subjectUUID: "s-1", subjectTypeUUID: "st-1", abhaNumber: ABHA_NUMBER});

        expect(navigator.push).toHaveBeenCalledWith({path: AbhaCardView.path(), isTyped: true, queryParams: {subjectUUID: "s-1", subjectTypeUUID: "st-1", abhaLastFour: "9012"}});
        CHSNavigator.navigateToAbhaCardView({context: {navigator: () => navigator}}, {subjectUUID: "s-2"});
        expect(navigator.push.mock.calls[1][0].queryParams).toEqual({subjectUUID: "s-2", abhaLastFour: null});
    });

    it("logs neither the ABHA number nor an ABHA address when navigation logs its parameters, as release builds do", () => {
        const logged = [];
        jest.spyOn(General, "isDebugEnabled").mockReturnValue(true);
        jest.spyOn(General, "logDebug").mockImplementation((...args) => logged.push(args.join(" ")));
        const source = {context: {navigator: () => ({getCurrentRoutes: () => [], push: () => {}})}};

        CHSNavigator.navigateToAbhaCardView(source, {subjectUUID: "s-1", abhaNumber: ABHA_NUMBER});
        CHSNavigator.navigateToAbhaView(source, {accessToken: EKA_KEY, environment: "sandbox", hipId: "hip-1"},
            {method: "login_or_create_abha", prefillAbhaAddress: "asha.rao@sbx"}, () => {}, () => {});

        expect(logged.some((line) => line.includes("/abhaCard"))).toBe(true);
        logged.forEach((line) => ["91-1234-5678-9012", "91123456789012", "asha.rao@sbx"].forEach((detail) =>
            expect(line).not.toContain(detail)));
    });
});
