jest.mock("../../../src/views/individual/PersonRegisterFormView", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/utility/CHSNavigator", () => ({
    __esModule: true,
    default: {navigateToSystemsRecommendationView: jest.fn(), onSaveGoToProgramEnrolmentDashboardView: jest.fn()},
}));

import {WorkItem, WorkList, WorkLists} from "avni-models";
import CHSNavigator from "../../../src/utility/CHSNavigator";
import PersonRegisterViewsMixin from "../../../src/views/individual/PersonRegisterViewsMixin";
import AbhaService from "../../../src/service/AbhaService";

// Completes a registration, then runs what the summary screen calls once the patient is saved.
function saveWith(abha) {
    const abhaService = {resendUnsentEvents: jest.fn(() => Promise.resolve())};
    const individual = {uuid: "s-1", observations: [], isRejectedEntity: () => false, latestEntityApprovalStatus: null};
    const view = {state: {individual}, I18n: {t: (key) => key}, registrationType: "Person", getService: (type) => (type === AbhaService ? abhaService : undefined)};
    const workLists = new WorkLists(new WorkList("Registration", [new WorkItem("w-1", WorkItem.type.REGISTRATION, {subjectTypeName: "Person"})]));
    const state = {abha, individual, workListState: {workLists}, form: null, saveDrafts: false, getAffiliatedGroups: () => []};

    PersonRegisterViewsMixin.getNextProps(view, false).completed(state, [], [], [], []);
    const onSaveCallback = CHSNavigator.navigateToSystemsRecommendationView.mock.calls[0][6];
    onSaveCallback({});
    return abhaService;
}

describe("PersonRegisterViewsMixin, ABHA", () => {
    afterEach(() => jest.clearAllMocks());

    it("once a registration with ABHA on is saved, sends again the ABHA audit records that have not reached the server", () => {
        expect(saveWith({enabledForUser: true}).resendUnsentEvents).toHaveBeenCalledTimes(1);
        expect(CHSNavigator.onSaveGoToProgramEnrolmentDashboardView).toHaveBeenCalledTimes(1);
    });

    it("with ABHA off, saves as before and touches nothing of ABHA", () => {
        expect(saveWith({enabledForUser: false}).resendUnsentEvents).not.toHaveBeenCalled();
        expect(saveWith(undefined).resendUnsentEvents).not.toHaveBeenCalled();
    });
});
