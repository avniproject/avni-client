import {subjectDashboardParams} from "../../src/utility/SubjectDashboardRoute";

describe("subjectDashboardParams", () => {
    it("keeps today's params for a caller that names no enrolment or tab", () => {
        expect(subjectDashboardParams('s1', undefined, undefined)).toStrictEqual({individualUUID: 's1', backFunction: undefined, tab: 2});
    });
    it("keeps today's params for the empty enrolment IndividualDetails passes", () => {
        const fn = () => {};
        expect(subjectDashboardParams('s1', '', fn)).toStrictEqual({individualUUID: 's1', backFunction: fn, tab: 2});
    });
    it("passes the enrolment when one is named", () => {
        expect(subjectDashboardParams('s1', 'e1', null)).toStrictEqual({individualUUID: 's1', enrolmentUUID: 'e1', backFunction: null, tab: 2});
    });
    it("passes the tab when one is named", () => {
        expect(subjectDashboardParams('s1', null, null, 1).tab).toBe(1);
        expect(subjectDashboardParams('s1', null, null, 3).tab).toBe(3);
    });
});
