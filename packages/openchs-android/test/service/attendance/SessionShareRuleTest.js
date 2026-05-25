// runSessionShareRule mirrors runShareRule's eval-and-catch contract but
// sources the rule string from AttendanceType.share_rule and passes the
// adapter-derived attendanceRecords + summary as rule params.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("react-native-share", () => ({open: jest.fn(() => Promise.resolve())}));
jest.mock("react-native-html-to-pdf", () => ({convert: jest.fn(() => Promise.resolve({filePath: "/tmp/x.pdf"}))}));

import RuleEvaluationService from "../../../src/service/RuleEvaluationService";

function makeService() {
    const svc = new RuleEvaluationService({}, {beansMap: new Map()});
    svc.getCommonParams = jest.fn(() => ({
        services: {},
        db: {},
        user: {username: "marker"},
        myUserGroups: [],
    }));
    svc.globalRuleFunction = null;
    svc.saveFailedRules = jest.fn();
    return svc;
}

const session = {uuid: "sess-1", status: "Held", scheduledDate: "2026-05-21"};
const attendanceType = {uuid: "at-1", name: "Morning Prayer"};
const attendanceRecords = [{studentName: "Esha", status: "Absent"}];
const summary = {groupName: "Class 7A", presentCount: 8, absentCount: 1};

describe("RuleEvaluationService.runSessionShareRule", () => {
    it("returns {} when the rule string is null / empty / whitespace", () => {
        const svc = makeService();
        assert.deepEqual(svc.runSessionShareRule(null, session, attendanceType, attendanceRecords, summary), {});
        assert.deepEqual(svc.runSessionShareRule("", session, attendanceType, attendanceRecords, summary), {});
        assert.deepEqual(svc.runSessionShareRule("   ", session, attendanceType, attendanceRecords, summary), {});
        assert.equal(svc.saveFailedRules.mock.calls.length, 0);
    });

    it("evaluates the rule string and returns its plain-object output", () => {
        const svc = makeService();
        const rule = `({params}) => ({
            data: {who: params.summary.groupName, n: params.summary.absentCount},
            text: "test text " + params.attendanceRecords[0].studentName,
        })`;

        const result = svc.runSessionShareRule(rule, session, attendanceType, attendanceRecords, summary);

        assert.deepEqual(result.data, {who: "Class 7A", n: 1});
        assert.equal(result.text, "test text Esha");
    });

    it("passes entity = session and threads attendanceRecords + summary into params", () => {
        const svc = makeService();
        let captured;
        const rule = `({params}) => { captured(params); return {}; }`;
        global.captured = (params) => { captured = params; };

        svc.runSessionShareRule(rule, session, attendanceType, attendanceRecords, summary);

        assert.equal(captured.entity, session);
        assert.equal(captured.attendanceType, attendanceType);
        assert.equal(captured.attendanceRecords, attendanceRecords);
        assert.equal(captured.summary, summary);
        // commonParams are merged in
        assert.equal(captured.user.username, "marker");
    });

    it("returns {} and records telemetry when the rule throws (silent fallback path)", () => {
        const svc = makeService();
        const rule = `() => { throw new Error("boom"); }`;

        const result = svc.runSessionShareRule(rule, session, attendanceType, attendanceRecords, summary);

        assert.deepEqual(result, {});
        assert.equal(svc.saveFailedRules.mock.calls.length, 1);
        const args = svc.saveFailedRules.mock.calls[0];
        // saveFailedRules(error, attendanceTypeUuid, null, 'Share', attendanceTypeUuid, 'Session', sessionUuid)
        assert.equal(args[1], "at-1");
        assert.equal(args[3], "Share");
        assert.equal(args[5], "Session");
        assert.equal(args[6], "sess-1");
    });

    it("returns {} when the rule returns a non-plain-object (defensive)", () => {
        const svc = makeService();
        const rule = `() => "not an object"`;

        const result = svc.runSessionShareRule(rule, session, attendanceType, attendanceRecords, summary);

        assert.deepEqual(result, {});
    });
});
