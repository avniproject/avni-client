// Verifies SessionShareService.sharePdf / shareText threads adapter context +
// rule output into the renderers correctly, with the same silent-fallback
// behaviour Share Filled Forms uses when the rule returns null fields.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);
jest.mock("react-native-html-to-pdf", () => ({convert: jest.fn(() => Promise.resolve({filePath: "/tmp/x.pdf"}))}));
const mockShareOpen = jest.fn(() => Promise.resolve());
jest.mock("react-native-share", () => ({open: (...args) => mockShareOpen(...args)}));

import SessionShareService from "../../../src/service/attendance/SessionShareService";

function makeService({ctx, ruleOut, shareRuleString = "fake-rule", attendanceTypeName = "Morning Prayer"}) {
    const adapter = {
        buildContext: jest.fn(() => ctx),
        defaultHtmlFromSummary: jest.fn(() => "<html>default</html>"),
        defaultTextFromSummary: jest.fn(() => "default text"),
        buildFileName: jest.fn(() => "filename"),
    };
    const ruleService = {runSessionShareRule: jest.fn(() => ruleOut)};
    const pdfService = {shareHtmlAsPdf: jest.fn(() => Promise.resolve({success: true}))};

    const lookup = new Map([
        [require("../../../src/service/attendance/SessionShareAdapter").default, adapter],
        [require("../../../src/service/RuleEvaluationService").default, ruleService],
        [require("../../../src/service/PDFGenerationService").default, pdfService],
    ]);
    const svc = new SessionShareService({}, {beansMap: new Map()});
    svc.getService = (klass) => lookup.get(klass);

    const attendanceType = {
        uuid: "at-1",
        name: attendanceTypeName,
        getShareRule: () => shareRuleString,
    };
    return {svc, adapter, ruleService, pdfService, attendanceType};
}

const session = {uuid: "sess-1", scheduledDate: "2026-05-21", status: "Held", notes: ""};
const groupSubject = {uuid: "g-1", nameString: "Class 7A"};
const baseCtx = {
    entity: session,
    attendanceType: {uuid: "at-1", name: "Morning Prayer"},
    attendanceRecords: [{studentName: "Esha", status: "Absent"}],
    summary: {
        groupName: "Class 7A", attendanceTypeName: "Morning Prayer", scheduledDate: "2026-05-21",
        presentCount: 8, absentCount: 1, presentNames: [], absentNames: ["Esha"],
        sessionStatus: "Held", sessionNotes: "",
    },
};

describe("SessionShareService.sharePdf", () => {
    it("evaluates the rule with adapter ctx and renders the default HTML when rule returns no data", async () => {
        const {svc, adapter, ruleService, pdfService, attendanceType} = makeService({
            ctx: baseCtx,
            ruleOut: {},
        });

        await svc.sharePdf(session, attendanceType, groupSubject);

        // Rule eval got the adapter-derived params
        const ruleArgs = ruleService.runSessionShareRule.mock.calls[0];
        assert.equal(ruleArgs[0], "fake-rule");
        assert.equal(ruleArgs[1], session);
        assert.equal(ruleArgs[2], attendanceType);
        assert.equal(ruleArgs[3], baseCtx.attendanceRecords);
        assert.equal(ruleArgs[4], baseCtx.summary);
        // PDF path used the un-merged summary (no rule data)
        const htmlArgs = adapter.defaultHtmlFromSummary.mock.calls[0];
        assert.equal(htmlArgs[0], baseCtx.summary);
        // PDFGenerationService got html + filename
        assert.equal(pdfService.shareHtmlAsPdf.mock.calls[0][0], "<html>default</html>");
        assert.equal(pdfService.shareHtmlAsPdf.mock.calls[0][1], "filename");
    });

    it("merges rule's `data` onto summary so authors can override individual fields", async () => {
        const {svc, adapter, attendanceType} = makeService({
            ctx: baseCtx,
            ruleOut: {data: {groupName: "Override Group", customField: "x"}},
        });

        await svc.sharePdf(session, attendanceType, groupSubject);

        const merged = adapter.defaultHtmlFromSummary.mock.calls[0][0];
        assert.equal(merged.groupName, "Override Group");
        assert.equal(merged.customField, "x");
        assert.equal(merged.presentCount, 8, "original summary fields preserved");
    });

    it("passes a null share rule through without crashing (no getShareRule defined)", async () => {
        const {svc, ruleService, pdfService} = makeService({
            ctx: baseCtx,
            ruleOut: {},
        });
        const attendanceType = {uuid: "at-1", name: "Morning Prayer"};  // no getShareRule

        await svc.sharePdf(session, attendanceType, groupSubject);

        // Rule string passed as null — runSessionShareRule's no-op branch handles that
        assert.equal(ruleService.runSessionShareRule.mock.calls[0][0], null);
        assert.equal(pdfService.shareHtmlAsPdf.mock.calls.length, 1);
    });
});

describe("SessionShareService.shareText", () => {
    beforeEach(() => {
        mockShareOpen.mockClear();
    });

    it("uses rule's `text` field when present", async () => {
        const {svc, adapter, attendanceType} = makeService({
            ctx: baseCtx,
            ruleOut: {text: "Custom share text from rule"},
        });

        await svc.shareText(session, attendanceType, groupSubject);

        assert.equal(adapter.defaultTextFromSummary.mock.calls.length, 0, "rule text wins over default");
        assert.equal(mockShareOpen.mock.calls[0][0].message, "Custom share text from rule");
        assert.equal(mockShareOpen.mock.calls[0][0].type, "text/plain");
    });

    it("falls back to default text when rule returns no `text`", async () => {
        const {svc, adapter, attendanceType} = makeService({
            ctx: baseCtx,
            ruleOut: {data: {x: 1}},  // data only, no text
        });

        await svc.shareText(session, attendanceType, groupSubject);

        assert.equal(adapter.defaultTextFromSummary.mock.calls.length, 1);
        assert.equal(mockShareOpen.mock.calls[0][0].message, "default text");
    });

    it("falls back to default text when rule returns empty {}", async () => {
        const {svc, adapter, attendanceType} = makeService({
            ctx: baseCtx,
            ruleOut: {},
        });

        await svc.shareText(session, attendanceType, groupSubject);

        assert.equal(adapter.defaultTextFromSummary.mock.calls.length, 1);
        assert.equal(mockShareOpen.mock.calls[0][0].message, "default text");
    });
});
