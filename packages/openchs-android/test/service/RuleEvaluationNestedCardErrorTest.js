import {assert} from "chai";

jest.mock("../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("react-native-share", () => ({open: jest.fn(() => Promise.resolve())}));
jest.mock("react-native-html-to-pdf", () => ({convert: jest.fn(() => Promise.resolve({filePath: "/tmp/x.pdf"}))}));

import {ReportCard} from "openchs-models";
import RuleEvaluationService from "../../src/service/RuleEvaluationService";

function makeService() {
    const svc = new RuleEvaluationService({}, {beansMap: new Map()});
    svc.saveFailedRules = jest.fn();
    svc.db = {};
    svc.I18n = {t: key => key};
    svc.getCommonParams = () => ({});
    return svc;
}

function nestedCard(query) {
    const card = ReportCard.newReportCard();
    card.uuid = "rc";
    card.name = "SAM, MAM children";
    card.nested = true;
    card.countOfCards = 2;
    card.query = query;
    return card;
}

describe("RuleEvaluationService.getDashboardCardResult for a nested card whose rule fails", () => {
    const failingRule = "({params}) => { throw new Error('could not parse atomic condition for Individual'); }";

    it("returns one error tile per configured card", () => {
        const results = makeService().getDashboardCardResult(nestedCard(failingRule), []);

        assert.isArray(results);
        assert.deepEqual(results.map(r => r.itemKey), ["rc#0", "rc#1"]);
        results.forEach(r => assert.isTrue(r.hasErrorMsg));
    });

    it("still counts a nested rule that returns a plain list instead of passing its items through as tiles", () => {
        const result = makeService().getDashboardCardResult(nestedCard("({params}) => [{uuid: 'a'}, {uuid: 'b'}]"), []);

        assert.isNotArray(result);
    });

    it("shows why the rule failed on each tile", () => {
        const results = makeService().getDashboardCardResult(nestedCard(failingRule), []);

        results.forEach(r => assert.include(r.secondaryValue, "could not parse atomic condition for Individual"));
    });
});
