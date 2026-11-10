import React from "react";
import {Button, Text, TextInput} from "react-native";
import TestRenderer, {act} from "react-test-renderer";

jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/common/CHSContainer", () => ({
    __esModule: true,
    default: ({children}) => require("react").createElement(require("react-native").View, null, children),
}));
jest.mock("react-native-smooth-pincode-input", () => (props) => require("react").createElement(require("react-native").View, {testID: "pin", ...props}));

import ServiceContext from "../../../src/framework/context/ServiceContext";
import AbhaVerifyView from "../../../src/views/abha/verify/AbhaVerifyView";
import enFile from "../../../translations/en.json";

const en = enFile.translations;

const SESSION = {accessToken: "eka-key", expiresInSeconds: 1800, environment: "sandbox", hipId: "TANUH"};
const MOBILE = "9876501234";
const AADHAAR = "234123412346";

let mounted = [];

async function show(client) {
    const navigator = {pop: jest.fn(), getCurrentRoutes: () => []};
    const context = {getService: () => ({getI18n: () => ({t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key)})}), navigator: () => navigator};
    const props = {onProfile: jest.fn(), onCreate: jest.fn(), onWithout: jest.fn()};
    let renderer;
    await act(async () => {
        renderer = TestRenderer.create(<ServiceContext.Provider value={context}>
            <AbhaVerifyView session={SESSION} client={client} {...props}/>
        </ServiceContext.Provider>);
    });
    mounted.push(renderer);
    const texts = () => renderer.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));
    const press = async (title) => act(async () => renderer.root.findAllByType(Button).find((b) => b.props.title === title).props.onPress());
    const type = async (value) => act(async () => renderer.root.findByType(TextInput).props.onChangeText(value));
    return {renderer, props, texts, press, type};
}

const client = (replies = {}) => ({
    search: jest.fn(() => Promise.resolve({profiles: [], txn_id: "s"})),
    methods: jest.fn(), loginVerify: jest.fn(), loginPhr: jest.fn(),
    loginInit: jest.fn(() => Promise.resolve({txn_id: "t", hint: "OTP sent to Aadhaar registered mobile number ending with ******1234"})),
    ...replies,
});

describe("AbhaVerifyView", () => {
    afterEach(() => {
        mounted.forEach((r) => act(() => r.unmount()));
        mounted = [];
    });

    it("has every key it shows in the translations", () => {
        ["abhaVerifyChooseMethod", "abhaVerifyMethodMobile", "abhaVerifyMethodAbhaNumber", "abhaVerifyMethodAbhaAddress", "abhaVerifyMethodAadhaar",
            "abhaVerifyEnterMobile", "abhaVerifyEnterAadhaar", "abhaVerifyContinue", "abhaVerifyAadhaarOtp", "abhaVerifyMobileOtp",
            "abhaVerifyChooseProfile", "abhaVerifySendOtp", "abhaVerifyEnterOtp", "abhaVerifyVerify", "abhaVerifyResend", "abhaVerifyResendIn",
            "abhaVerifyResendLimit", "abhaVerifyMobileNotFound", "abhaVerifyAadhaarNotFound", "abhaVerifyCreate", "abhaVerifyAadhaarInvalid",
            "abhaOptionVerify", "abhaOptionCreate", "abhaOptionVerifyHelp", "abhaOptionCreateHelp"]
            .forEach((key) => expect(en[key]).toBeTruthy());
        expect(en.abhaVerifyMobileNotFound).toBe("ABHA details not found. We did not find any ABHA number linked to this mobile number. Please use an ABHA-linked mobile number.");
        expect(en.abhaVerifyAadhaarInvalid).toBe("Aadhaar Number is not valid");
    });

    it("opens on the choice of how to verify", async () => {
        const {renderer} = await show(client());
        expect(renderer.root.findAllByType(Button).map((b) => b.props.title))
            .toEqual(["abhaVerifyMethodMobile", "abhaVerifyMethodAbhaNumber", "abhaVerifyMethodAbhaAddress", "abhaVerifyMethodAadhaar"]);
    });

    it("VRFY_ABHA_303 on screen: a mobile with no ABHA shows NHA's message, Create ABHA and Register without ABHA, and no OTP box", async () => {
        const c = client();
        const {renderer, props, texts, press, type} = await show(c);
        await press("abhaVerifyMethodMobile");
        await type(MOBILE);
        await press("abhaVerifyContinue");
        expect(texts()).toContain("abhaVerifyMobileNotFound");
        expect(renderer.root.findAll((n) => n.props.testID === "pin")).toHaveLength(0);
        expect(c.loginInit).not.toHaveBeenCalled();
        await press("abhaVerifyCreate");
        expect(props.onCreate).toHaveBeenCalledWith(null);
        await press("abhaOptionWithout");
        expect(props.onWithout).toHaveBeenCalledTimes(1);
    });

    it("hides the Aadhaar number as it is typed, and clears it from the screen once sent", async () => {
        const {renderer, press, type} = await show(client());
        await press("abhaVerifyMethodAadhaar");
        expect(renderer.root.findByType(TextInput).props.secureTextEntry).toBe(true);
        await type(AADHAAR);
        await press("abhaVerifyContinue");
        expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
        expect(JSON.stringify(renderer.toJSON())).not.toContain(AADHAAR);
    });

    it("shows Eka's masked hint on the OTP step, a masked OTP box, and Verify only once six digits are in", async () => {
        const {renderer, texts, press, type} = await show(client());
        await press("abhaVerifyMethodAbhaNumber");
        await type("91111122223333");
        await press("abhaVerifyAadhaarOtp");
        expect(texts()).toContain("OTP sent to Aadhaar registered mobile number ending with ******1234");
        const pin = renderer.root.find((n) => n.props.testID === "pin");
        expect(pin.props.password).toBe(true);
        const verify = () => renderer.root.findAllByType(Button).find((b) => b.props.title === "abhaVerifyVerify");
        expect(verify().props.disabled).toBe(true);
        await act(async () => pin.props.onTextChange("482913"));
        expect(verify().props.disabled).toBe(false);
        expect(texts().some((t) => t.startsWith("abhaVerifyResendIn"))).toBe(true);
    });
});
