// Shared scaffolding for CustomDashboardActions.onCardPress tests: a context whose
// services are stubbed down to what onCardPress reads, plus the action callbacks it fires.

export const cardPressState = {activeDashboardUUID: "d1", cardToCountResultMap: {}};

function makeContext(stubs) {
    const map = new Map(stubs.map(([klass, stub]) => [klass.name, stub]));
    return {get: (klass) => map.get(klass.name)};
}

export function buildContext(reportCard, result, status = null) {
    const ReportCardService = require("../../../src/service/customDashboard/ReportCardService").default;
    const EntityService = require("../../../src/service/EntityService").default;
    const CustomDashboardService = require("../../../src/service/customDashboard/CustomDashboardService").default;
    const DashboardFilterService = require("../../../src/service/reports/DashboardFilterService").default;
    return makeContext([
        [ReportCardService, {
            getPlainUUIDFromCompositeReportCardUUID: (x) => x,
            getReportCardResult: () => ({result, status}),
        }],
        [EntityService, {findByUUID: () => reportCard}],
        [CustomDashboardService, {getDashboardData: () => ({selectedFilterValues: {}})}],
        [DashboardFilterService, {toRuleInputObjects: () => []}],
    ]);
}

export function makeStandardReportCardType(overrides) {
    return {
        isApprovalType: () => false,
        isDefaultType: () => false,
        isCommentType: () => false,
        isTaskType: () => false,
        isChecklistType: () => false,
        getApprovalStatusForType: () => undefined,
        ...overrides,
    };
}

export function makeReportCard(overrides) {
    return {
        name: "Card",
        action: "ViewSubjectProfile",
        standardReportCardType: null,
        isFullyCustom: () => false,
        isStandardTaskType: () => false,
        isActionDoVisit: () => false,
        isActionMarkAttendance: () => false,
        ...overrides,
    };
}

export function makeAction() {
    return {
        reportCardUUID: "rc1",
        onShowSubjectAction: jest.fn(),
        onCustomRecordCardResults: jest.fn(),
        onDismissLoading: jest.fn(),
    };
}
