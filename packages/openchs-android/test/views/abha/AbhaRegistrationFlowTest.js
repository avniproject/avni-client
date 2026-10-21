import {Alert, ToastAndroid} from "react-native";

const mockPopToBookmark = jest.fn();
jest.mock("../../../src/framework/routing/TypedTransition", () => ({
    __esModule: true,
    default: {from: jest.fn(() => ({popToBookmark: mockPopToBookmark}))},
}));
jest.mock("../../../src/utility/CHSNavigator", () => ({
    __esModule: true,
    default: {navigateToAbhaView: jest.fn(), navigateToAbhaCardView: jest.fn(), navigateToProgramEnrolmentDashboardView: jest.fn()},
}));
jest.mock("../../../src/utility/ConnectionInfo", () => ({getConnectionInfo: jest.fn()}));

import {Concept, Gender, Individual, Observation, PrimitiveValue, SubjectType} from "avni-models";
import EntityFactory from "../../EntityFactory";
import EntityQueueService from "../../../src/service/EntityQueueService";
import CHSNavigator from "../../../src/utility/CHSNavigator";
import {getConnectionInfo} from "../../../src/utility/ConnectionInfo";
import AbhaRegistrationFlow from "../../../src/views/abha/AbhaRegistrationFlow";
import AbhaService from "../../../src/service/AbhaService";
import AbhaError from "../../../src/service/AbhaError";
import IndividualService from "../../../src/service/IndividualService";
import {Actions} from "../../../src/action/individual/PersonRegisterActions";
import General from "../../../src/utility/General";

const SESSION = {accessToken: "eka-key", expiresAt: "2026-10-20T10:30:00Z", environment: "sandbox", hipId: "hip-1"};
const PROFILE = {
    firstName: "Asha", middleName: null, lastName: "Rao", genderName: "Female", dateOfBirth: new Date(1990, 3, 23),
    mobile: "9000000000", abhaNumber: "91-1234-5678-9012", abhaAddress: "asha.rao@sbx", kycVerified: true,
    ekaOid: "oid-1", ekaTxnId: "txn-1", route: "aadhaar", action: "linked",
};
const PATIENT_DETAILS = ["91-1234-5678-9012", "91123456789012", "asha.rao@sbx", "oid-1", "9000000000", "eka-key"];

function person({uuid = "s-new", firstName = "", genderName = null} = {}) {
    const individual = Individual.createEmptySubjectInstance();
    individual.uuid = uuid;
    individual.subjectType = Object.assign(SubjectType.create("Person"), {uuid: "st-person"});
    individual.firstName = firstName;
    individual.gender = genderName ? Gender.create(genderName) : null;
    return individual;
}

const abhaNumberConcept = EntityFactory.createConcept("ABHA Number", Concept.dataType.Text, "c-abha-number");
const withAbhaNumber = (individual, abhaNumber) => {
    individual.observations = [Observation.create(abhaNumberConcept, new PrimitiveValue(abhaNumber))];
    return individual;
};

function viewWith({editing = false, formHasConcepts = true, individual = person(), translations = {}, consent = null, replace = true,
                      session = Promise.resolve(SESSION), holders = Promise.resolve([]), onPhone = {}, unsynced = []} = {}) {
    const abhaService = {
        // A rejection is passed as a function, so it is made only when asked for and never left unhandled.
        getSession: jest.fn(() => (typeof session === "function" ? session() : session)),
        findSubjectUUIDs: jest.fn(() => (typeof holders === "function" ? holders() : holders)),
        keepEvent: jest.fn(() => Promise.resolve()),
        recordEvent: jest.fn(() => Promise.resolve(true)),
        resendUnsentEvents: jest.fn(() => Promise.resolve()),
    };
    const individualService = {findByUUID: jest.fn((uuid) => onPhone[uuid])};
    const entityQueueService = {getQueuedEntityUUIDs: jest.fn(() => unsynced)};
    const services = new Map([[AbhaService, abhaService], [IndividualService, individualService], [EntityQueueService, entityQueueService]]);
    return {
        state: {abha: {enabledForUser: true, formHasConcepts, linked: false, choice: null}, individual},
        props: {params: {editing}},
        I18n: {t: jest.fn((key) => (key in translations ? translations[key] : key))},
        getService: (serviceClass) => services.get(serviceClass),
        dispatchAction: jest.fn(),
        askAbhaConsent: jest.fn(() => Promise.resolve(consent)),
        askAbhaReplace: jest.fn(() => Promise.resolve(replace)),
        abhaService,
        individualService,
        entityQueueService,
    };
}

const opened = () => CHSNavigator.navigateToAbhaView.mock.calls[0];
// Every alert the flow shows is answered with the button of this text, when it has one.
const answerAlertsWith = (buttonText) => Alert.alert.mockImplementation((title, message, buttons = []) => {
    const button = buttons.find((b) => b.text === buttonText);
    if (button && button.onPress) button.onPress();
});
const dispatched = (view, type) => view.dispatchAction.mock.calls.filter(([action]) => action === type);
const flush = () => new Promise((resolve) => setImmediate(resolve));

// Opens Eka's screens and hands back the profile, as the ABHA screen would.
async function openAndReturn(view, profile = PROFILE, route = "create") {
    const flow = new AbhaRegistrationFlow(view);
    await flow.open({route});
    const [, , , onProfile] = opened();
    await onProfile(profile);
    return flow;
}

describe("AbhaRegistrationFlowTest", () => {
    beforeEach(() => {
        getConnectionInfo.mockResolvedValue({isConnected: true});
        jest.spyOn(Alert, "alert").mockImplementation(() => {});
        jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
    });
    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    describe("opening Eka's screens", () => {
        it("without internet, says the ABHA step needs it and offers Register Without ABHA", async () => {
            getConnectionInfo.mockResolvedValue({isConnected: false});
            const view = viewWith();

            await new AbhaRegistrationFlow(view).open({route: "create"});

            const [, message, buttons] = Alert.alert.mock.calls[0];
            expect(message).toBe("abhaNeedsInternet");
            buttons.find((button) => button.text === "abhaOptionWithout").onPress();
            expect(dispatched(view, Actions.ON_ABHA_CHOICE)).toEqual([[Actions.ON_ABHA_CHOICE, {choice: "without"}]]);
            expect(view.abhaService.getSession).not.toHaveBeenCalled();
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();
        });

        it("with a form lacking either ABHA question, says so and opens nothing", async () => {
            const view = viewWith({formHasConcepts: false});

            await new AbhaRegistrationFlow(view).open({route: "link"});

            expect(ToastAndroid.show.mock.calls[0][0]).toBe("abhaFormNotSetUp");
            expect(view.abhaService.getSession).not.toHaveBeenCalled();
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();
        });

        it("with no consent wording, has no consent step and opens Eka's screens on the server's session", async () => {
            const view = viewWith();

            await new AbhaRegistrationFlow(view).open({route: "create"});

            expect(view.askAbhaConsent).not.toHaveBeenCalled();
            expect(view.abhaService.getSession).toHaveBeenCalledWith("st-person");
            const [source, session, options, onProfile, onSkip] = opened();
            expect(source).toBe(view);
            expect(session).toBe(SESSION);
            expect(options).toEqual({method: "login_or_create_abha", prefillAbhaAddress: undefined});
            expect(typeof onProfile).toBe("function");
            expect(typeof onSkip).toBe("function");
        });

        it("treats blank consent wording as none", async () => {
            const view = viewWith({translations: {abhaRegistrationConsent: "  "}});
            await new AbhaRegistrationFlow(view).open({route: "create"});
            expect(view.askAbhaConsent).not.toHaveBeenCalled();
            expect(CHSNavigator.navigateToAbhaView).toHaveBeenCalledTimes(1);
        });

        it("shows the organisation's consent wording first, and a patient who does not agree goes to Register Without ABHA", async () => {
            const view = viewWith({translations: {abhaRegistrationConsent: "I agree to ..."}, consent: null});

            await new AbhaRegistrationFlow(view).open({route: "create"});

            expect(view.askAbhaConsent).toHaveBeenCalledWith("I agree to ...");
            expect(dispatched(view, Actions.ON_ABHA_CHOICE)).toEqual([[Actions.ON_ABHA_CHOICE, {choice: "without"}]]);
            expect(view.abhaService.getSession).not.toHaveBeenCalled();
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();
        });

        it("a consent step closed with Back chooses nothing: the options stay, and Eka's screens do not open", async () => {
            const view = viewWith({translations: {abhaRegistrationConsent: "I agree to ..."}});
            view.askAbhaConsent.mockImplementation(() => Promise.resolve(undefined));

            await new AbhaRegistrationFlow(view).open({route: "create"});

            expect(view.dispatchAction).not.toHaveBeenCalled();
            expect(view.abhaService.getSession).not.toHaveBeenCalled();
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();
        });

        it("opens Eka's screens once the patient agrees", async () => {
            const view = viewWith({translations: {abhaRegistrationConsent: "I agree to ..."}, consent: new Date()});
            await new AbhaRegistrationFlow(view).open({route: "link"});
            expect(CHSNavigator.navigateToAbhaView).toHaveBeenCalledTimes(1);
        });

        it("shows the message for the server's refusal, or the general one, and opens nothing", async () => {
            const refused = viewWith({session: () => Promise.reject(new AbhaError("ABHA_NOT_CONFIGURED", 409))});
            await new AbhaRegistrationFlow(refused).open({route: "create"});
            const failed = viewWith({session: () => Promise.reject(new TypeError("Network request failed"))});
            await new AbhaRegistrationFlow(failed).open({route: "create"});

            expect(ToastAndroid.show.mock.calls.map(([message]) => message)).toEqual(["abhaNotConfigured", "abhaError"]);
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();
        });

        it("passes on an ABHA address to prefill, for Checked in today", async () => {
            await new AbhaRegistrationFlow(viewWith()).open({route: "link", prefillAbhaAddress: "asha@sbx"});
            expect(opened()[2]).toEqual({method: "login_or_create_abha", prefillAbhaAddress: "asha@sbx"});
        });

        it("ignores a second tap while the first is still opening", async () => {
            const flow = new AbhaRegistrationFlow(viewWith());
            await Promise.all([flow.open({route: "create"}), flow.open({route: "create"})]);
            await flow.open({route: "create"});
            expect(CHSNavigator.navigateToAbhaView).toHaveBeenCalledTimes(2);
        });

        it("Create or Link that cannot start says the ABHA could not be completed, rather than doing nothing, and can be tapped again", async () => {
            getConnectionInfo.mockRejectedValueOnce(new Error("NetInfo unavailable"));
            const view = viewWith();
            const flow = new AbhaRegistrationFlow(view);

            await expect(flow.open({route: "create"})).resolves.toBeUndefined();
            expect(ToastAndroid.show).toHaveBeenCalledWith("abhaError", ToastAndroid.LONG);
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();

            await flow.open({route: "create"});
            expect(CHSNavigator.navigateToAbhaView).toHaveBeenCalledTimes(1);
        });

        it("opens nothing on a tap of Create or Link while an ABHA from Eka's screens is still being checked", async () => {
            const view = viewWith();
            view.state.abha.busy = true;
            await new AbhaRegistrationFlow(view).open({route: "create"});
            expect(view.abhaService.getSession).not.toHaveBeenCalled();
            expect(CHSNavigator.navigateToAbhaView).not.toHaveBeenCalled();
        });

        it("a skip returns to registration and changes nothing", async () => {
            const view = viewWith();
            await new AbhaRegistrationFlow(view).open({route: "create"});
            opened()[4]();
            expect(mockPopToBookmark).toHaveBeenCalledTimes(1);
            expect(view.dispatchAction).not.toHaveBeenCalled();
        });
    });

    describe("when an ABHA comes back", () => {
        it("returns to registration, asks the server about the ABHA number, then fills the details in", async () => {
            const view = viewWith();
            await openAndReturn(view, PROFILE, "create");

            expect(mockPopToBookmark).toHaveBeenCalledTimes(1);
            expect(view.abhaService.findSubjectUUIDs).toHaveBeenCalledWith("st-person", "91-1234-5678-9012");
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toEqual([[Actions.ON_ABHA_PROFILE, {profile: PROFILE, choice: "create", subjectUUID: "s-new"}]]);
            expect(view.askAbhaReplace).not.toHaveBeenCalled();
        });

        it("holds the registration busy from the moment Eka's screens close until the details are filled in", async () => {
            const view = viewWith();
            let busyWhileChecking;
            view.abhaService.findSubjectUUIDs.mockImplementation(() => {
                busyWhileChecking = view.dispatchAction.mock.calls.map(([type, action]) => [type, action]);
                return Promise.resolve([]);
            });
            await openAndReturn(view);

            expect(busyWhileChecking).toEqual([[Actions.ON_ABHA_BUSY, {subjectUUID: "s-new", busy: true}]]);
            const types = view.dispatchAction.mock.calls.map(([type]) => type);
            expect(types).toEqual([Actions.ON_ABHA_BUSY, Actions.ON_ABHA_PROFILE, Actions.ON_ABHA_BUSY]);
            expect(view.dispatchAction.mock.calls[2][1]).toEqual({subjectUUID: "s-new", busy: false});
        });

        it("lets go of busy when nothing is filled in: another holder, a cancel, or a failed check given up", async () => {
            const cases = [viewWith({holders: Promise.resolve(["s-elsewhere"])}), viewWith({editing: true, replace: false}),
                viewWith({holders: () => Promise.reject(new TypeError("Network request failed"))})];
            answerAlertsWith("cancel");
            for (const view of cases) {
                await openAndReturn(view);
                expect(dispatched(view, Actions.ON_ABHA_BUSY).map(([, action]) => action.busy)).toEqual([true, false]);
                CHSNavigator.navigateToAbhaView.mockClear();
            }
        });

        it("changes nothing more, busy included, once the registration screen has closed", async () => {
            const view = viewWith({holders: () => { view._isUnmounted = true; return Promise.resolve([]); }});
            await openAndReturn(view);
            expect(dispatched(view, Actions.ON_ABHA_BUSY).map(([, action]) => action.busy)).toEqual([true]);
        });

        it("offers to open the patient on this phone who already holds it, and fills nothing", async () => {
            const holder = person({uuid: "s-other", firstName: "Ravi"});
            const view = viewWith({holders: Promise.resolve(["s-other"]), onPhone: {"s-other": holder}});
            await openAndReturn(view);

            expect(Alert.alert).toHaveBeenCalledTimes(1);
            const [, message, buttons] = Alert.alert.mock.calls[0];
            expect(message).toBe("abhaDuplicateOpen");
            expect(view.I18n.t).toHaveBeenCalledWith("abhaDuplicateOpen", {name: holder.nameString});
            buttons.find((button) => button.text === "abhaDuplicateOpenAction").onPress();
            expect(CHSNavigator.navigateToProgramEnrolmentDashboardView).toHaveBeenCalledWith(view, "s-other");
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(0);
            // Eka's screens did find or create the ABHA, so the action is recorded all the same.
            expect(view.abhaService.recordEvent).toHaveBeenCalledTimes(1);
        });

        it("says the patient is already registered in the organisation when the holder is not on this phone, and nothing more", async () => {
            const view = viewWith({holders: Promise.resolve(["s-elsewhere"])});
            await openAndReturn(view);

            const [, message, buttons] = Alert.alert.mock.calls[0];
            expect(message).toBe("abhaDuplicateElsewhere");
            expect(buttons.map((button) => button.text)).toEqual(["ok"]);
            expect(JSON.stringify(Alert.alert.mock.calls)).not.toContain("s-elsewhere");
            expect(CHSNavigator.navigateToProgramEnrolmentDashboardView).not.toHaveBeenCalled();
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(0);
            expect(view.abhaService.recordEvent).toHaveBeenCalledTimes(1);
        });

        it("counts a patient on this phone not yet synced who holds the number, written differently, which the server cannot know of", async () => {
            const unsynced = withAbhaNumber(person({uuid: "s-unsynced", firstName: "Ravi"}), "91123456789012");
            const view = viewWith({unsynced: ["s-unsynced"], onPhone: {"s-unsynced": unsynced}});
            await openAndReturn(view);

            expect(view.entityQueueService.getQueuedEntityUUIDs).toHaveBeenCalledWith("Individual");
            const [, message, buttons] = Alert.alert.mock.calls[0];
            expect(message).toBe("abhaDuplicateOpen");
            buttons.find((button) => button.text === "abhaDuplicateOpenAction").onPress();
            expect(CHSNavigator.navigateToProgramEnrolmentDashboardView).toHaveBeenCalledWith(view, "s-unsynced");
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(0);
        });

        it("among this phone's unsynced patients, does not count the one being edited, a voided one, or one with another number", async () => {
            const editing = withAbhaNumber(person({uuid: "s-1"}), "91-1234-5678-9012");
            const voided = Object.assign(withAbhaNumber(person({uuid: "s-voided"}), "91-1234-5678-9012"), {voided: true});
            const other = withAbhaNumber(person({uuid: "s-other"}), "11-1111-1111-1111");
            const view = viewWith({editing: true, individual: person({uuid: "s-1"}), unsynced: ["s-1", "s-voided", "s-other", "s-gone"],
                onPhone: {"s-1": editing, "s-voided": voided, "s-other": other}});
            await openAndReturn(view);

            expect(Alert.alert).not.toHaveBeenCalled();
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(1);
            expect(view.individualService.findByUUID.mock.calls.map(([uuid]) => uuid).sort()).toEqual(["s-gone", "s-other", "s-voided"]);
        });

        it("does not count a voided patient on this phone as one to open", async () => {
            const voided = Object.assign(person({uuid: "s-voided"}), {voided: true});
            const view = viewWith({holders: Promise.resolve(["s-voided"]), onPhone: {"s-voided": voided}});
            await openAndReturn(view);
            expect(Alert.alert.mock.calls[0][1]).toBe("abhaDuplicateElsewhere");
        });

        it("when editing, does not count a match on the patient being edited", async () => {
            const view = viewWith({editing: true, individual: person({uuid: "s-1"}), holders: Promise.resolve(["s-1"])});
            await openAndReturn(view);
            expect(Alert.alert).not.toHaveBeenCalled();
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(1);
        });

        it("when the server cannot be asked, says why and offers Try again, which asks again about the same ABHA", async () => {
            let asked = 0;
            const view = viewWith({holders: () => (++asked === 1 ? Promise.reject(new TypeError("Network request failed")) : Promise.resolve([]))});
            answerAlertsWith("abhaTryAgain");

            await openAndReturn(view);

            const [, message, buttons] = Alert.alert.mock.calls[0];
            expect(message).toBe("abhaError");
            expect(buttons.map((button) => button.text)).toEqual(["cancel", "abhaTryAgain"]);
            expect(view.abhaService.findSubjectUUIDs.mock.calls).toEqual([["st-person", "91-1234-5678-9012"], ["st-person", "91-1234-5678-9012"]]);
            expect(CHSNavigator.navigateToAbhaView).toHaveBeenCalledTimes(1);
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(1);
            expect(view.abhaService.recordEvent).toHaveBeenCalledTimes(1);
        });

        it("names the server's refusal when it cannot be asked", async () => {
            const view = viewWith({holders: () => Promise.reject(new AbhaError("ABHA_NO_PRIVILEGE", 403))});
            answerAlertsWith("cancel");
            await openAndReturn(view);
            expect(Alert.alert.mock.calls[0][1]).toBe("abhaNoPermission");
        });

        it("a worker who gives up after the server could not be asked has nothing filled in, and the ABHA action is still recorded", async () => {
            const view = viewWith({holders: () => Promise.reject(new TypeError("Network request failed"))});
            answerAlertsWith("cancel");
            await openAndReturn(view);
            expect(view.abhaService.findSubjectUUIDs).toHaveBeenCalledTimes(1);
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(0);
            expect(view.abhaService.recordEvent).toHaveBeenCalledTimes(1);
        });

        it("keeps the ABHA action's record on the phone before it asks the server anything", async () => {
            const view = viewWith();
            await openAndReturn(view);
            expect(view.abhaService.keepEvent).toHaveBeenCalledTimes(1);
            expect(view.abhaService.keepEvent.mock.calls[0][0]).toEqual(view.abhaService.recordEvent.mock.calls[0][0]);
            expect(view.abhaService.keepEvent.mock.invocationCallOrder[0])
                .toBeLessThan(view.abhaService.findSubjectUUIDs.mock.invocationCallOrder[0]);
        });

        it("fills nothing when the registration screen has gone while the server was asked, but still records the ABHA action", async () => {
            const view = viewWith({holders: () => { view._isUnmounted = true; return Promise.resolve([]); }});
            await openAndReturn(view);
            await flush();
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(0);
            expect(view.abhaService.recordEvent).toHaveBeenCalledTimes(1);
            expect(Alert.alert).not.toHaveBeenCalled();
            expect(CHSNavigator.navigateToAbhaCardView).not.toHaveBeenCalled();
        });

        it("fills nothing when the edit screen has gone while the worker compared the details, but still records the ABHA action", async () => {
            const view = viewWith({editing: true, individual: person({uuid: "s-1"})});
            view.askAbhaReplace.mockImplementation(() => { view._isUnmounted = true; return Promise.resolve(true); });
            await openAndReturn(view);
            await flush();
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(0);
            expect(view.abhaService.recordEvent).toHaveBeenCalledTimes(1);
            expect(view.abhaService.recordEvent.mock.calls[0][0].subjectUUID).toBe("s-1");
        });

        it("asks nothing of the server for an ABHA with an address only, which has no number to hold", async () => {
            const view = viewWith();
            await openAndReturn(view, {...PROFILE, abhaNumber: null});
            expect(view.abhaService.findSubjectUUIDs).not.toHaveBeenCalled();
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(1);
        });

        it("when editing, shows the current and the ABHA's name, gender and date of birth side by side, and applies them", async () => {
            const individual = person({uuid: "s-1", firstName: "Asa", genderName: "Male"});
            individual.lastName = "Rao";
            individual.dateOfBirth = new Date(1991, 0, 1);
            const view = viewWith({editing: true, individual, replace: true});
            await openAndReturn(view, PROFILE, "link");

            expect(view.askAbhaReplace).toHaveBeenCalledWith([
                {label: "name", current: "Asa Rao", abha: "Asha Rao"},
                {label: "gender", current: "Male", abha: "Female"},
                {label: "dateOfBirth", current: General.toDisplayDate(individual.dateOfBirth), abha: General.toDisplayDate(PROFILE.dateOfBirth)},
            ]);
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(1);
            expect(view.abhaService.recordEvent).toHaveBeenCalledTimes(1);
        });

        it("when editing, cancel at the side-by-side step changes nothing, and records the ABHA action Eka's screens took", async () => {
            const view = viewWith({editing: true, individual: person({uuid: "s-1"}), replace: false});
            await openAndReturn(view);
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(0);
            expect(view.abhaService.recordEvent).toHaveBeenCalledTimes(1);
        });

        it("records the ABHA action on the server once the details are filled in: patient, route, Eka's IDs, consent time", async () => {
            const consentGivenAt = new Date("2026-10-20T04:00:00.000Z");
            const view = viewWith({translations: {abhaRegistrationConsent: "I agree"}, consent: consentGivenAt});
            await openAndReturn(view);

            const [event] = view.abhaService.recordEvent.mock.calls[0];
            expect(event).toEqual({
                uuid: expect.any(String), subjectUUID: "s-new", subjectTypeUUID: "st-person", action: "linked", route: "aadhaar",
                abhaNumber: "91-1234-5678-9012", abhaAddress: "asha.rao@sbx", ekaOid: "oid-1", ekaTxnId: "txn-1",
                consentGivenAt: "2026-10-20T04:00:00.000Z", occurredAt: expect.stringMatching(/^\d{4}-\d\d-\d\dT.*Z$/),
            });
            expect(view.dispatchAction.mock.invocationCallOrder[0])
                .toBeLessThan(view.abhaService.recordEvent.mock.invocationCallOrder[0]);
        });

        it("when filling in fails, says the ABHA could not be completed, still sends the record, and shows no card", async () => {
            const view = viewWith();
            view.dispatchAction.mockImplementation((type) => { if (type === Actions.ON_ABHA_PROFILE) throw new Error("rule failed"); });
            const flow = new AbhaRegistrationFlow(view);
            await flow.open({route: "create"});

            await expect(opened()[3](PROFILE)).resolves.toBeUndefined();
            await flush();

            expect(ToastAndroid.show).toHaveBeenCalledWith("abhaError", ToastAndroid.LONG);
            expect(view.abhaService.recordEvent).toHaveBeenCalledTimes(1);
            expect(CHSNavigator.navigateToAbhaCardView).not.toHaveBeenCalled();
        });

        it("when anything else fails after Eka's screens close, says so, and still sends the record", async () => {
            const view = viewWith({editing: true});
            view.askAbhaReplace.mockImplementation(() => Promise.reject(new Error("dialog failed")));
            await new AbhaRegistrationFlow(view).open({route: "link"});

            await expect(opened()[3](PROFILE)).resolves.toBeUndefined();

            expect(ToastAndroid.show).toHaveBeenCalledWith("abhaError", ToastAndroid.LONG);
            expect(view.abhaService.recordEvent).toHaveBeenCalledTimes(1);
        });

        it("records no consent time when the organisation asks for none", async () => {
            const view = viewWith();
            await openAndReturn(view);
            expect(view.abhaService.recordEvent.mock.calls[0][0].consentGivenAt).toBeNull();
        });

        it("fills the details in without waiting for the record to reach the server", async () => {
            const view = viewWith();
            view.abhaService.recordEvent.mockImplementation(() => new Promise(() => {}));
            await openAndReturn(view);
            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(1);
        });

        it("logs none of the patient's ABHA details or the key, whatever happens", async () => {
            const logged = [];
            ["logDebug", "logInfo", "logWarn", "logError"].forEach((level) =>
                jest.spyOn(General, level).mockImplementation((...args) => logged.push(args)));
            jest.spyOn(General, "isDebugEnabled").mockReturnValue(true);
            answerAlertsWith("cancel");
            await openAndReturn(viewWith());
            await openAndReturn(viewWith({holders: Promise.resolve(["s-elsewhere"])}));
            await openAndReturn(viewWith({holders: () => Promise.reject(new TypeError("Network request failed"))}));
            await new AbhaRegistrationFlow(viewWith({session: () => Promise.reject(new AbhaError("ABHA_DISABLED", 403))})).open({route: "create"});
            await flush();

            logged.forEach((args) => args.forEach((arg) => PATIENT_DETAILS.forEach((detail) =>
                expect(typeof arg === "string" ? arg : JSON.stringify(arg) || "").not.toContain(detail))));
        });
    });

    describe("showing the ABHA card at the end of Eka's screens", () => {
        afterEach(() => jest.useRealTimers());

        const cardOpened = () => CHSNavigator.navigateToAbhaCardView.mock.calls;

        it("opens the card for the patient once the ABHA action is recorded, after the details are filled in", async () => {
            const view = viewWith();
            await openAndReturn(view);
            await flush();

            expect(cardOpened()).toEqual([[view, {subjectUUID: "s-new", abhaNumber: "91-1234-5678-9012"}]]);
            expect(CHSNavigator.navigateToAbhaCardView.mock.invocationCallOrder[0])
                .toBeGreaterThan(view.abhaService.recordEvent.mock.invocationCallOrder[0]);
            expect(CHSNavigator.navigateToAbhaCardView.mock.invocationCallOrder[0])
                .toBeGreaterThan(view.dispatchAction.mock.invocationCallOrder[0]);
        });

        it("does not hold up the registration while it waits: the details are filled in and the call returns at once", async () => {
            jest.useFakeTimers();
            const view = viewWith();
            view.abhaService.recordEvent.mockImplementation(() => new Promise(() => {}));
            await openAndReturn(view);

            expect(dispatched(view, Actions.ON_ABHA_PROFILE)).toHaveLength(1);
            expect(cardOpened()).toHaveLength(0);
        });

        it("waits at most five seconds for the record, then opens the card anyway", async () => {
            jest.useFakeTimers();
            const view = viewWith();
            view.abhaService.recordEvent.mockImplementation(() => new Promise(() => {}));
            await openAndReturn(view);

            jest.advanceTimersByTime(4900);
            await Promise.resolve();
            await Promise.resolve();
            expect(cardOpened()).toHaveLength(0);
            jest.advanceTimersByTime(200);
            for (let i = 0; i < 10; i++) await Promise.resolve();
            expect(cardOpened()).toHaveLength(1);
        });

        it("tries once more to send the record before the card is fetched, when it has not reached the server", async () => {
            const view = viewWith();
            view.abhaService.recordEvent.mockImplementation(() => Promise.resolve(false));
            await openAndReturn(view);
            await flush();

            expect(view.abhaService.resendUnsentEvents).toHaveBeenCalledTimes(1);
            expect(view.abhaService.resendUnsentEvents.mock.invocationCallOrder[0])
                .toBeLessThan(CHSNavigator.navigateToAbhaCardView.mock.invocationCallOrder[0]);
            expect(cardOpened()).toHaveLength(1);
        });

        it("sends nothing again when the record has reached the server", async () => {
            const view = viewWith();
            await openAndReturn(view);
            await flush();
            expect(view.abhaService.resendUnsentEvents).not.toHaveBeenCalled();
            expect(cardOpened()).toHaveLength(1);
        });

        it("opens the card even when the record could not be sent", async () => {
            const view = viewWith();
            view.abhaService.recordEvent.mockImplementation(() => Promise.resolve(false));
            await openAndReturn(view);
            await flush();
            expect(cardOpened()).toHaveLength(1);
        });

        it("opens no card when the patient was already registered, or the worker cancelled the replace", async () => {
            await openAndReturn(viewWith({holders: Promise.resolve(["s-elsewhere"])}));
            await openAndReturn(viewWith({editing: true, replace: false}));
            await flush();
            expect(cardOpened()).toHaveLength(0);
        });

        it("opens no card when the worker has already left the registration screen", async () => {
            const view = viewWith();
            view._isUnmounted = true;
            await openAndReturn(view);
            await flush();
            expect(cardOpened()).toHaveLength(0);
        });

        it("shows the card for an ABHA found while editing, once the worker applied it", async () => {
            const view = viewWith({editing: true});
            await openAndReturn(view);
            await flush();
            expect(cardOpened()).toHaveLength(1);
        });
    });
});
