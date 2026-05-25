// Auto-share dispatcher: validates the SHARE_SESSION work item, resolves the
// Session by UUID, skips if voided / missing, then routes to sharePdf or
// shareText. Failures surface through RuleEvaluationService.recordWorkListUpdationFailure
// (same telemetry path Share Filled Forms uses for SHARE work items).

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("react-native-share", () => ({open: jest.fn(() => Promise.resolve())}));
jest.mock("react-native-html-to-pdf", () => ({convert: jest.fn(() => Promise.resolve({filePath: "/tmp/x.pdf"}))}));

import {WorkItem} from "avni-models";
import SessionShareService from "../../../src/service/attendance/SessionShareService";

function makeService({session, attendanceType, groupSubject}) {
    const sessionService = {findByUUID: jest.fn(() => session)};
    const attendanceTypeService = {findByUUID: jest.fn(() => attendanceType)};
    const individualService = {findByUUID: jest.fn(() => groupSubject)};
    const ruleService = {recordWorkListUpdationFailure: jest.fn()};
    const lookup = new Map([
        [require("../../../src/service/SessionService").default, sessionService],
        [require("../../../src/service/AttendanceTypeService").default, attendanceTypeService],
        [require("../../../src/service/IndividualService").default, individualService],
        [require("../../../src/service/RuleEvaluationService").default, ruleService],
    ]);
    const svc = new SessionShareService({}, {beansMap: new Map()});
    svc.getService = (klass) => lookup.get(klass);
    // Stub the renderer entry points — these are exercised by other tests.
    svc.sharePdf = jest.fn(() => Promise.resolve({success: true}));
    svc.shareText = jest.fn(() => Promise.resolve());
    return {svc, sessionService, attendanceTypeService, individualService, ruleService};
}

const goodSession = {uuid: "sess-1", attendanceTypeUUID: "at-1", groupSubjectUUID: "g-1", voided: false, status: "Held"};
const goodAttendanceType = {uuid: "at-1", name: "Morning Prayer", voided: false, getShareRule: () => null};
const goodGroupSubject = {uuid: "g-1", nameString: "Class 7A", voided: false};

describe("SessionShareService.dispatchShareSessionWorkItem", () => {
    it("returns immediately when the work item is missing (null)", async () => {
        const {svc, sessionService, ruleService} = makeService({session: goodSession});

        await svc.dispatchShareSessionWorkItem(null);

        assert.equal(sessionService.findByUUID.mock.calls.length, 0);
        assert.equal(ruleService.recordWorkListUpdationFailure.mock.calls.length, 0);
    });

    it("records a WorkListUpdation failure and skips when validate() throws (missing sessionUUID)", async () => {
        const {svc, ruleService, sessionService} = makeService({session: goodSession});
        const wi = new WorkItem("wi-1", WorkItem.type.SHARE_SESSION, {format: "text"});  // no sessionUUID

        await svc.dispatchShareSessionWorkItem(wi);

        assert.equal(svc.sharePdf.mock.calls.length, 0);
        assert.equal(svc.shareText.mock.calls.length, 0);
        assert.equal(sessionService.findByUUID.mock.calls.length, 0);
        assert.equal(ruleService.recordWorkListUpdationFailure.mock.calls.length, 1);
    });

    it("records a failure and skips when the sessionUUID doesn't resolve (voided / deleted between queue and dispatch)", async () => {
        const {svc, ruleService} = makeService({session: null});
        const wi = new WorkItem("wi-1", WorkItem.type.SHARE_SESSION, {sessionUUID: "sess-gone", format: "text"});

        await svc.dispatchShareSessionWorkItem(wi);

        assert.equal(svc.sharePdf.mock.calls.length, 0);
        assert.equal(svc.shareText.mock.calls.length, 0);
        assert.equal(ruleService.recordWorkListUpdationFailure.mock.calls.length, 1);
    });

    it("records a failure and skips when the session is present but voided", async () => {
        const voidedSession = {...goodSession, voided: true};
        const {svc, ruleService} = makeService({session: voidedSession, attendanceType: goodAttendanceType, groupSubject: goodGroupSubject});
        const wi = new WorkItem("wi-1", WorkItem.type.SHARE_SESSION, {sessionUUID: "sess-1", format: "text"});

        await svc.dispatchShareSessionWorkItem(wi);

        assert.equal(svc.sharePdf.mock.calls.length, 0);
        assert.equal(svc.shareText.mock.calls.length, 0);
        assert.equal(ruleService.recordWorkListUpdationFailure.mock.calls.length, 1);
    });

    it("records a failure and skips when the AttendanceType resolves to undefined", async () => {
        const {svc, ruleService} = makeService({session: goodSession, attendanceType: null, groupSubject: goodGroupSubject});
        const wi = new WorkItem("wi-1", WorkItem.type.SHARE_SESSION, {sessionUUID: "sess-1", format: "text"});

        await svc.dispatchShareSessionWorkItem(wi);

        assert.equal(svc.shareText.mock.calls.length, 0);
        assert.equal(ruleService.recordWorkListUpdationFailure.mock.calls.length, 1);
    });

    it("records a failure and skips when the AttendanceType is voided", async () => {
        const voidedAT = {...goodAttendanceType, voided: true};
        const {svc, ruleService} = makeService({session: goodSession, attendanceType: voidedAT, groupSubject: goodGroupSubject});
        const wi = new WorkItem("wi-1", WorkItem.type.SHARE_SESSION, {sessionUUID: "sess-1", format: "text"});

        await svc.dispatchShareSessionWorkItem(wi);

        assert.equal(svc.shareText.mock.calls.length, 0);
        assert.equal(ruleService.recordWorkListUpdationFailure.mock.calls.length, 1);
    });

    it("records a failure and skips when the GroupSubject resolves to undefined", async () => {
        const {svc, ruleService} = makeService({session: goodSession, attendanceType: goodAttendanceType, groupSubject: null});
        const wi = new WorkItem("wi-1", WorkItem.type.SHARE_SESSION, {sessionUUID: "sess-1", format: "text"});

        await svc.dispatchShareSessionWorkItem(wi);

        assert.equal(svc.shareText.mock.calls.length, 0);
        assert.equal(ruleService.recordWorkListUpdationFailure.mock.calls.length, 1);
    });

    it("records a failure and skips when the GroupSubject is voided", async () => {
        const voidedGS = {...goodGroupSubject, voided: true};
        const {svc, ruleService} = makeService({session: goodSession, attendanceType: goodAttendanceType, groupSubject: voidedGS});
        const wi = new WorkItem("wi-1", WorkItem.type.SHARE_SESSION, {sessionUUID: "sess-1", format: "text"});

        await svc.dispatchShareSessionWorkItem(wi);

        assert.equal(svc.shareText.mock.calls.length, 0);
        assert.equal(ruleService.recordWorkListUpdationFailure.mock.calls.length, 1);
    });

    it("invokes shareText when format is 'text'", async () => {
        const {svc, sessionService, attendanceTypeService, individualService} = makeService({
            session: goodSession, attendanceType: goodAttendanceType, groupSubject: goodGroupSubject,
        });
        const wi = new WorkItem("wi-1", WorkItem.type.SHARE_SESSION, {sessionUUID: "sess-1", format: "text"});

        await svc.dispatchShareSessionWorkItem(wi);

        assert.equal(svc.shareText.mock.calls.length, 1);
        assert.equal(svc.sharePdf.mock.calls.length, 0);
        // Lookup chain: Session → AttendanceType → GroupSubject
        assert.equal(sessionService.findByUUID.mock.calls[0][0], "sess-1");
        assert.equal(attendanceTypeService.findByUUID.mock.calls[0][0], "at-1");
        assert.equal(individualService.findByUUID.mock.calls[0][0], "g-1");
        // Renderer received the resolved entities
        const [sessionArg, atArg, gsArg] = svc.shareText.mock.calls[0];
        assert.equal(sessionArg, goodSession);
        assert.equal(atArg, goodAttendanceType);
        assert.equal(gsArg, goodGroupSubject);
    });

    it("invokes sharePdf when format is 'pdf'", async () => {
        const {svc} = makeService({
            session: goodSession, attendanceType: goodAttendanceType, groupSubject: goodGroupSubject,
        });
        const wi = new WorkItem("wi-1", WorkItem.type.SHARE_SESSION, {sessionUUID: "sess-1", format: "pdf"});

        await svc.dispatchShareSessionWorkItem(wi);

        assert.equal(svc.sharePdf.mock.calls.length, 1);
        assert.equal(svc.shareText.mock.calls.length, 0);
    });

    it("routes an async rejection from sharePdf through _recordFailure", async () => {
        const {svc, ruleService} = makeService({
            session: goodSession, attendanceType: goodAttendanceType, groupSubject: goodGroupSubject,
        });
        svc.sharePdf = jest.fn(() => Promise.reject(new Error("pdf boom")));
        const wi = new WorkItem("wi-1", WorkItem.type.SHARE_SESSION, {sessionUUID: "sess-1", format: "pdf"});

        await svc.dispatchShareSessionWorkItem(wi);

        assert.equal(ruleService.recordWorkListUpdationFailure.mock.calls.length, 1);
        const errArg = ruleService.recordWorkListUpdationFailure.mock.calls[0][0];
        assert.equal(errArg.message, "pdf boom");
    });
});
