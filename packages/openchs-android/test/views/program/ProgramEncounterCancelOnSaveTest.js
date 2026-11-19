jest.mock("../../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));
jest.mock("../../../src/utility/CHSNavigator", () => ({
    __esModule: true,
    default: {
        navigateToSystemsRecommendationView: jest.fn(),
        navigateToProgramEnrolmentDashboardView: jest.fn(),
        navigateToIndividualEncounterDashboardView: jest.fn(),
    },
}));
jest.mock("../../../src/utility/Analytics", () => ({logEvent: jest.fn(), firebaseEvents: {}}));
jest.mock("react-native-background-timer", () => ({__esModule: true, default: {}}));
jest.mock("../../../src/reducer", () => ({__esModule: true, default: {reducerKeys: {programEncounterCancel: "programEncounterCancel"}}}));
jest.mock("../../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/form/FormElementGroup", () => ({__esModule: true, default: () => null}));
jest.mock("../../../src/views/form/formElement/GeolocationFormElement", () => ({__esModule: true, default: () => null}));

import CHSNavigator from "../../../src/utility/CHSNavigator";
import ProgramEncounterCancelView from "../../../src/views/program/ProgramEncounterCancelView";

const source = {name: 'source'};
const t = (k) => k;
const MSG = 'encounterCancelledMsg';

const visit = (programEnrolment) => ({
    uuid: 'v1', cancelObservations: [], programEnrolment,
    individual: {uuid: 's1'},
    encounterType: {displayName: 'ET'},
    isRejectedEntity: () => false, latestEntityApprovalStatus: undefined,
});

const run = (onSaveCallback, programEncounter) => {
    const view = Object.create(ProgramEncounterCancelView.prototype);
    view.props = {params: {onSaveCallback}};
    view.state = {programEncounter, filteredFormElements: []};
    view._i18n = {t};
    view.getCancelEncounterForm = () => ({});
    view.getNextParams().completed({programEncounter, workListState: undefined}, [], [], [], []);
    const handed = CHSNavigator.navigateToSystemsRecommendationView.mock.calls[0][6];
    return handed;
};

beforeEach(() => jest.clearAllMocks());

describe("ProgramEncounterCancelView save callback", () => {
    it("uses the save callback it was given", () => {
        const given = jest.fn();
        expect(run(given, visit({uuid: 'e1', program: {displayName: 'P'}}))).toBe(given);
    });

    it("goes to the profile as today without one, for a programme visit", () => {
        run(undefined, visit({uuid: 'e1', program: {displayName: 'P'}}))(source);
        expect(CHSNavigator.navigateToProgramEnrolmentDashboardView).toHaveBeenCalledWith(source, 's1', 'e1', true, null, MSG);
    });

    it("goes to the profile as today without one, for a general visit", () => {
        const v = visit(undefined);
        run(undefined, v)(source);
        expect(CHSNavigator.navigateToIndividualEncounterDashboardView).toHaveBeenCalledWith(source, 's1', v, true, null, MSG);
    });
});
