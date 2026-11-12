import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import ReportCardService, {toApprovalListSubjects} from "../../../src/service/customDashboard/ReportCardService";
import RuleEvaluationService from "../../../src/service/RuleEvaluationService";
import {Individual, ReportCard, ReportCardResult} from "openchs-models";

function subject(uuid) {
    const individual = Individual.createEmptyInstance();
    individual.uuid = uuid;
    return individual;
}

const uuids = (subjects) => subjects.map((s) => s.uuid);

describe("toApprovalListSubjects", () => {
    it("keeps subjects in the query's order", () => {
        assert.deepEqual(uuids(toApprovalListSubjects([subject("b"), subject("a"), subject("c")])), ["b", "a", "c"]);
    });

    it("takes the subject from rows that carry one, and lists a subject once", () => {
        const s1 = subject("s1");
        const rows = [{individual: s1, visitInfo: {}}, {individual: subject("s2")}, s1, {individual: s1, visitInfo: {}}];

        const result = toApprovalListSubjects(rows);

        assert.deepEqual(uuids(result), ["s1", "s2"]);
        assert.strictEqual(result[0], s1);
    });

    it("drops rows that are not subjects", () => {
        const rows = [{uuid: "comment-1", text: "hi"}, subject("s1"), {individual: {uuid: "x"}}, null, undefined, 7, "s2"];

        assert.deepEqual(uuids(toApprovalListSubjects(rows)), ["s1"]);
    });

    it("wraps a bare database object of a subject", () => {
        const bare = {uuid: "s9", objectSchema: () => ({name: "Individual"})};
        const notASubject = {uuid: "e1", objectSchema: () => ({name: "Encounter"})};

        const result = toApprovalListSubjects([bare, notASubject]);

        assert.deepEqual(uuids(result), ["s9"]);
        assert.instanceOf(result[0], Individual);
    });

    it("reads any iterable a query returns, like a database result", () => {
        function* results() {
            yield subject("s1");
            yield subject("s2");
        }

        assert.deepEqual(uuids(toApprovalListSubjects(results())), ["s1", "s2"]);
    });

    it.each([[null], [undefined], [{}], [5]])("lists nothing for a result that is not a list (%p)", (result) => {
        assert.deepEqual(toApprovalListSubjects(result), []);
    });
});

describe("ReportCardService.getReportCardResult for a custom query card", () => {
    function card(action, actionDetail) {
        return ReportCard.fromResource({
            uuid: "rc1", name: "rc", colour: "#fff", voided: false,
            standardReportCardInputSubjectTypes: [], standardReportCardInputPrograms: [], standardReportCardInputEncounterTypes: [],
            action, actionDetail, _links: {},
        }, {findByKey: () => null, findByUUID: () => null});
    }

    // A ReportCardService with only the rule engine behind it, answering every card's query with queryResult.
    function serviceAnswering(queryResult) {
        const getDashboardCardQueryResult = jest.fn(() => queryResult);
        const service = Object.create(ReportCardService.prototype);
        service.getService = (klass) => {
            if (klass === RuleEvaluationService) return {getDashboardCardQueryResult};
            throw new Error(`unexpected service ${klass && klass.name}`);
        };
        return {service, getDashboardCardQueryResult};
    }

    it("lists the subjects an Approve or Reject card's query returns, and passes the filters to the query", () => {
        const filters = [{filter: "f"}];
        const {service, getDashboardCardQueryResult} = serviceAnswering([{individual: subject("s1")}, {uuid: "row"}, subject("s2")]);
        const approveReject = card("ApproveReject", {approvalStatus: "Pending"});

        const {result, status} = service.getReportCardResult(approveReject, filters);

        assert.deepEqual(uuids(result), ["s1", "s2"]);
        assert.isNull(status);
        assert.deepEqual(getDashboardCardQueryResult.mock.calls[0], [approveReject, filters]);
    });

    it("hands any other custom query card its query result untouched", () => {
        const queryResult = [{uuid: "row"}];
        const {service} = serviceAnswering(queryResult);

        assert.strictEqual(service.getReportCardResult(card("ViewSubjectProfile", null), []).result, queryResult);
        assert.strictEqual(service.getReportCardResult(card("ApproveReject", {}), []).result, queryResult);
    });

    it("runs the query again each time it is asked, so a subject the query no longer returns drops off", () => {
        const {service, getDashboardCardQueryResult} = serviceAnswering([subject("s1")]);
        const approveReject = card("ApproveReject", {approvalStatus: "Pending"});

        assert.deepEqual(uuids(service.getResultForCustomApprovalCard(approveReject, [])), ["s1"]);
        getDashboardCardQueryResult.mockReturnValue([]);
        assert.deepEqual(service.getResultForCustomApprovalCard(approveReject, []), []);
    });

    it("gives no list when the query failed, so the tap does not open an empty approval list", () => {
        const approveReject = card("ApproveReject", {approvalStatus: "Pending"});

        assert.isNull(serviceAnswering(null).service.getResultForCustomApprovalCard(approveReject, []));
        assert.isNull(serviceAnswering({primaryValue: "Error", hasErrorMsg: true}).service.getResultForCustomApprovalCard(approveReject, []));
        assert.isNull(serviceAnswering([{hasErrorMsg: true}, {hasErrorMsg: true}]).service.getResultForCustomApprovalCard(approveReject, []));
    });
});

describe("ReportCardService.getReportCardCount for an Approve or Reject card", () => {
    function card(action, actionDetail, nested = false) {
        return ReportCard.fromResource({
            uuid: "rc1", name: "rc", colour: "#fff", voided: false, nested, countOfCards: nested ? 2 : 1,
            standardReportCardInputSubjectTypes: [], standardReportCardInputPrograms: [], standardReportCardInputEncounterTypes: [],
            action, actionDetail, _links: {},
        }, {findByKey: () => null, findByUUID: () => null});
    }

    // The real tile-building code of the rule engine, with only the card's query answered by queryResult.
    function countFor(reportCard, queryResult) {
        const rules = Object.create(RuleEvaluationService.prototype);
        rules.I18n = {t: (key) => key};
        rules.executeDashboardCardRule = jest.fn(() => queryResult);
        rules.runLineListFunction = (reportCard, lineListFunction) => lineListFunction();
        const service = Object.create(ReportCardService.prototype);
        service.getService = (klass) => {
            if (klass === RuleEvaluationService) return rules;
            throw new Error(`unexpected service ${klass && klass.name}`);
        };
        return {count: service.getReportCardCount(reportCard, []), rules};
    }

    const visit = (subjectUUID) => ({individual: subject(subjectUUID)});
    const pending = (nested) => card("ApproveReject", {approvalStatus: "Pending"}, nested);

    it("counts the subjects of a query that returns visits, not the visits", () => {
        const {count, rules} = countFor(pending(), [visit("s1"), visit("s1"), visit("s2")]);

        assert.equal(count.primaryValue, "2");
        assert.isTrue(count.clickable);
        assert.equal(rules.executeDashboardCardRule.mock.calls.length, 1);
    });

    it("counts nothing for a query whose rows are not subjects", () => {
        const rows = [1, 2, 3, 4, 5].map((n) => ({uuid: `comment-${n}`, text: "hi"}));

        assert.equal(countFor(pending(), rows).count.primaryValue, "0");
    });

    it("counts the subjects of the line list when the query gives its own number", () => {
        const {count} = countFor(pending(), {primaryValue: "7", secondaryValue: "visits", lineListFunction: () => [visit("s1"), visit("s1"), visit("s2")]});

        assert.equal(count.primaryValue, "2");
        assert.equal(count.secondaryValue, "visits");
    });

    it("counts each nested card from its own query", () => {
        const {count} = countFor(pending(true), {reportCards: [
            {cardName: "Village A", primaryValue: "9", lineListFunction: () => [visit("a1"), visit("a2"), {uuid: "x"}]},
            {cardName: "Village B", primaryValue: "9", lineListFunction: () => [visit("b1"), visit("b1")]},
        ]});

        assert.deepEqual(count.map((r) => r.primaryValue), ["2", "1"]);
        assert.deepEqual(count.map((r) => r.cardName), ["Village A", "Village B"]);
    });

    it("counts nothing, and records the failure, when the line list throws", () => {
        const reportCard = pending();
        const rules = Object.create(RuleEvaluationService.prototype);
        rules.I18n = {t: (key) => key};
        rules.executeDashboardCardRule = () => ({primaryValue: "4", lineListFunction: () => { throw new Error("boom"); }});
        const recorded = [];
        // Only reachable through `this`, as on the phone, so an unbound saveFailedRules throws here.
        rules.failedRuleExistsInDB = (...args) => { recorded.push(args); return true; };
        const service = Object.create(ReportCardService.prototype);
        service.getService = () => rules;

        const count = service.getReportCardCount(reportCard, []);

        assert.equal(count.primaryValue, "0");
        assert.lengthOf(recorded, 1);
    });

    it("keeps the error tile when the query failed", () => {
        const error = ReportCardResult.create("Error", "queryExecutionError", false, true);

        const {count} = countFor(pending(), error);

        assert.isTrue(count.hasErrorMsg);
        assert.equal(count.primaryValue, "Error");
    });

    it("keeps counting the rows of a custom card with any other action", () => {
        const {count} = countFor(card("ViewSubjectProfile", null), [visit("s1"), visit("s1"), visit("s2")]);

        assert.equal(count.primaryValue, "3");
    });
});
