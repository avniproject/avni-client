/**
 * #2196 — launch runs init() on Realm before moving to SQLite, and sync never reruns
 * IndividualService.init(), so a setting copied there stays whatever Realm held at launch.
 *
 * Run: npx jest test/service/IndividualServiceDueChecklistTest.js --selectProjects unit
 */
const IndividualService = require('../../src/service/IndividualService').default;
const OrganisationConfigService = require('../../src/service/OrganisationConfigService').default;

describe('the due checklist on the default dashboard (#2196)', () => {
    it('follows the organisation setting as it is now, not as it was at init', () => {
        let settings = {};
        const organisationConfigService = {
            hasShowDueChecklistOnDashboard: () => !!settings.showDueChecklistOnDashboard,
            hasHideTotalForProgram: () => true,
        };
        const context = {getService: (s) => s === OrganisationConfigService ? organisationConfigService : {}};
        const service = new IndividualService({}, context);
        const due = {individual: ['a subject'], checklistItemNames: ['BCG']};
        service.dueChecklists = jest.fn(() => due);
        service.init();

        expect(service.dueChecklistForDefaultDashboard(new Date())).toEqual({individual: [], checklistItemNames: []});

        settings = {showDueChecklistOnDashboard: true};

        expect(service.dueChecklistForDefaultDashboard(new Date())).toBe(due);
    });
});
