jest.mock("../../src/utility/bugsnag", () => ({__esModule: true, default: {notify: jest.fn()}}));
import {WorkItem, WorkList, WorkLists} from "avni-models";

jest.mock("../../src/utility/CHSNavigator", () => ({
    __esModule: true,
    default: {
        navigateToSystemsRecommendationView: jest.fn(),
        navigateBackToSource: jest.fn(),
        onSaveGoToProgramEnrolmentDashboardView: jest.fn(),
        navigateToProgramEnrolmentDashboardView: jest.fn(),
    },
}));
jest.mock("../../src/utility/Analytics", () => ({logEvent: jest.fn(), firebaseEvents: {}}));
jest.mock("../../src/views/individual/PersonRegisterFormView", () => ({__esModule: true, default: () => null}));
jest.mock("../../src/views/subject/SubjectRegisterFormView", () => ({__esModule: true, default: () => null}));
jest.mock("react-native-background-timer", () => ({__esModule: true, default: {}}));
jest.mock("../../src/views/common/AppHeader", () => ({__esModule: true, default: () => null}));
jest.mock("../../src/views/common/IndividualProfile", () => ({__esModule: true, default: () => null}));
jest.mock("../../src/views/form/FormElementGroup", () => ({__esModule: true, default: () => null}));
jest.mock("../../src/views/form/formElement/GeolocationFormElement", () => ({__esModule: true, default: () => null}));

import CHSNavigator from "../../src/utility/CHSNavigator";
import PersonRegisterViewsMixin from "../../src/views/individual/PersonRegisterViewsMixin";
import SubjectRegisterViewsMixin from "../../src/views/subject/SubjectRegisterViewsMixin";
import ProgramFormComponent from "../../src/views/program/ProgramFormComponent";

const workListState = (parameters) => ({
    workLists: new WorkLists(new WorkList('w', [new WorkItem('1', WorkItem.type.REGISTRATION, parameters)])),
});
const t = (k) => k;
const source = {name: 'source'};

const saveCallback = () => CHSNavigator.navigateToSystemsRecommendationView.mock.calls[0][6];

beforeEach(() => jest.clearAllMocks());

const fakeEntity = () => ({
    uuid: 'e-uuid', observations: [], programExitObservations: [],
    isRejectedEntity: () => false, latestEntityApprovalStatus: undefined,
    program: {name: 'P', displayName: 'P'},
    individual: {uuid: 'i-uuid', subjectType: {}},
});

const mixinCases = [
    ['PersonRegisterViewsMixin', PersonRegisterViewsMixin, 'individual'],
    ['SubjectRegisterViewsMixin', SubjectRegisterViewsMixin, 'subject'],
];

mixinCases.forEach(([name, Mixin, key]) => {
    const run = (parameters) => {
        const view = {state: {[key]: fakeEntity(), filteredFormElements: []}, I18n: {t}, registrationType: 'x'};
        const state = {
            [key]: fakeEntity(), workListState: workListState(parameters), form: {}, saveDrafts: false,
            getAffiliatedGroups: () => [],
        };
        Mixin.getNextProps(view).completed(state, [], [], [], []);
        saveCallback()(source);
    };
    it(`${name} edit opened from a card comes back to the card`, () => {
        run({returnToSource: true});
        expect(CHSNavigator.navigateBackToSource).toHaveBeenCalledWith(source);
        expect(CHSNavigator.onSaveGoToProgramEnrolmentDashboardView).not.toHaveBeenCalled();
    });
    it(`${name} edit from the profile goes to the profile as today`, () => {
        run({});
        expect(CHSNavigator.navigateBackToSource).not.toHaveBeenCalled();
        expect(CHSNavigator.onSaveGoToProgramEnrolmentDashboardView).toHaveBeenCalledWith(source, 'e-uuid');
    });
});

describe("ProgramFormComponent", () => {
    const run = (parameters) => {
        const component = Object.create(ProgramFormComponent.prototype);
        component.props = {context: {usage: 'Enrol'}, state: {enrolment: fakeEntity(), filteredFormElements: []}};
        component.context = {getService: () => ({findFormForProgramEnrolment: () => ({})})};
        component._i18n = {t};
        const state = {enrolment: fakeEntity(), workListState: workListState(parameters), saveDrafts: false};
        component.getNextParams().completed(state, [], [], [], []);
        saveCallback()(source);
    };
    it("ProgramFormComponent edit opened from a card comes back to the card", () => {
        run({returnToSource: true});
        expect(CHSNavigator.navigateBackToSource).toHaveBeenCalledWith(source);
        expect(CHSNavigator.navigateToProgramEnrolmentDashboardView).not.toHaveBeenCalled();
    });
    it("ProgramFormComponent edit from the profile goes to the profile as today", () => {
        run({});
        expect(CHSNavigator.navigateBackToSource).not.toHaveBeenCalled();
        expect(CHSNavigator.navigateToProgramEnrolmentDashboardView).toHaveBeenCalledWith(source, 'i-uuid', 'e-uuid', true, null, 'enrolmentSavedMsg');
    });
});
