import React from "react";
import {Text} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

// The tab imports most of the view layer; these are the native modules it reaches that jest has no bridge for.
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
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
// Native Base's Text needs its theme provider, which a screen test has no use for.
jest.mock("native-base", () => ({__esModule: true, Text: require("react-native").Text}));
jest.mock("react-native-vector-icons/MaterialIcons", () => ({__esModule: true, default: () => null}));

import ServiceContext from "../../../src/framework/context/ServiceContext";
import SubjectDashboardProfileTab from "../../../src/views/individual/SubjectDashboardProfileTab";
import OrganisationConfigService from "../../../src/service/OrganisationConfigService";
import UserInfoService from "../../../src/service/UserInfoService";
import {Actions as ProfileActions} from "../../../src/action/individual/IndividualRegistrationDetailsActions";
import en from "../../../translations/en.json";

const context = {getService: () => ({getI18n: () => ({t: (key) => key})})};

const individualWith = ({number, address, person = true, voided = false} = {}) => ({
    uuid: "subject-1",
    voided,
    isPerson: () => person,
    getObservationValue: (name) => ({"ABHA Number": number, "ABHA Address": address}[name]),
});

// The profile tab's ABHA part, on a tab whose services and subject the test sets.
function tabWith({individual, abhaOn = true, hipId = "hip-1"}) {
    const tab = Object.create(SubjectDashboardProfileTab.prototype);
    const services = new Map([
        [OrganisationConfigService, {isAbhaEnabled: () => abhaOn}],
        [UserInfoService, {getUserSettings: () => (hipId ? {abhaHipId: hipId} : {})}],
    ]);
    Object.assign(tab, {
        context,
        props: {params: {individualUUID: "subject-1"}},
        state: {individual},
        getService: (type) => services.get(type),
        dispatchAction: jest.fn(),
        editProfile: jest.fn(),
    });
    Object.defineProperty(tab, "I18n", {value: {t: (key) => key}});
    return tab;
}

let mounted = [];

function render(element) {
    let renderer;
    act(() => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}>{element}</ServiceContext.Provider>);
    });
    mounted.push(renderer);
    return renderer;
}

const texts = (renderer) => renderer.root.findAllByType(Text).map((text) => [].concat(text.props.children).join(""));

describe("SubjectDashboardProfileTab, ABHA section", () => {
    afterEach(() => {
        mounted.forEach((renderer) => act(() => renderer.unmount()));
        mounted = [];
    });

    it("shows nothing when ABHA is off for the organisation, whatever the patient holds", () => {
        expect(tabWith({individual: individualWith({number: "91-1234-5678-1234"}), abhaOn: false}).renderAbha()).toBeNull();
        expect(tabWith({individual: individualWith(), abhaOn: false}).renderAbha()).toBeNull();
    });

    it("shows nothing, and no actions, to a user without a health centre", () => {
        expect(tabWith({individual: individualWith(), hipId: null}).renderAbha()).toBeNull();
        expect(tabWith({individual: individualWith({number: "91-1234-5678-1234"}), hipId: ""}).renderAbha()).toBeNull();
    });

    it("shows nothing on a subject that is not a person, or on a voided one", () => {
        expect(tabWith({individual: individualWith({person: false})}).renderAbha()).toBeNull();
        expect(tabWith({individual: individualWith({voided: true})}).renderAbha()).toBeNull();
    });

    it("shows Not linked with Create ABHA and Link existing ABHA for a patient with neither answer", () => {
        const tab = tabWith({individual: individualWith()});
        const shown = texts(render(tab.renderAbha()));
        expect(shown).toEqual(expect.arrayContaining(["abhaSectionTitle", "abhaNotLinked", "abhaCreate", "abhaLinkExisting"]));
        expect(shown).not.toContain("abhaViewCard");
    });

    it("Create ABHA and Link existing ABHA both open the subject's edit screen", () => {
        const tab = tabWith({individual: individualWith()});
        const renderer = render(tab.renderAbha());
        const press = (label) => renderer.root.findAll((node) => typeof node.props.onPress === "function"
            && node.findAllByType(Text).some((text) => [].concat(text.props.children).join("") === label))[0].props.onPress();
        act(() => press("abhaCreate"));
        act(() => press("abhaLinkExisting"));
        expect(tab.editProfile).toHaveBeenCalledTimes(2);
    });

    it("shows Linked, the number masked to its last four digits, and the address", () => {
        const tab = tabWith({individual: individualWith({number: "91-1234-5678-9012", address: "asha@sbx"})});
        const shown = texts(render(tab.renderAbha()));
        expect(shown).toContain("abhaLinked");
        expect(shown.join("|")).toContain("xx-xxxx-xxxx-9012");
        expect(shown.join("|")).toContain("asha@sbx");
        expect(shown.join("|")).not.toContain("5678");
        expect(shown).not.toContain("abhaCreate");
        expect(shown).not.toContain("abhaLinkExisting");
    });

    it("shows a patient linked through the mobile route, an address and no number, as Linked with the address only", () => {
        const tab = tabWith({individual: individualWith({address: "asha@sbx"})});
        const shown = texts(render(tab.renderAbha()));
        expect(shown).toContain("abhaLinked");
        expect(shown.join("|")).toContain("asha@sbx");
        expect(shown.join("|")).not.toContain("xx-xxxx");
        expect(shown).not.toContain("abhaNotLinked");
    });

    it("leaves one named place for story 15's View ABHA card, empty until it is built", () => {
        const tab = tabWith({individual: individualWith({number: "91-1234-5678-9012"})});
        expect(tab.abhaLinkedActions()).toEqual([]);
    });

    it("adds its labels to the platform translations", () => {
        ["abhaSectionTitle", "abhaLinked", "abhaNotLinked", "abhaCreate", "abhaLinkExisting", "abhaNumberLabel", "abhaAddressLabel"]
            .forEach((key) => expect(en.translations[key]).toBeTruthy());
    });
});
