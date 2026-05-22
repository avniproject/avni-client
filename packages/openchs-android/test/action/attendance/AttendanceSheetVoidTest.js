// Verifies AttendanceSheetActions.onVoid dispatches sessionService.voidSession,
// refreshes the sheet state (sessionByType, statusByDate) so the picker drops
// the row back to "Not marked", and propagates skippedFollowUps for the toast.

import {assert} from "chai";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {AttendanceSheetActions} from "../../../src/action/attendance/AttendanceSheetActions";

function makeContext(stubs) {
    const map = new Map(stubs.map(([klass, stub]) => [klass.name, stub]));
    return {
        get: (klass) => map.get(klass.name),
    };
}

function makeBaseState({existingSession = null} = {}) {
    return {
        groupSubject: {uuid: "g-uuid", subjectType: {uuid: "st-group", group: true}},
        calendar: {uuid: "cal-1", dayType: () => "working_day"},
        selectedDate: "2026-05-21",
        attendanceTypes: [{uuid: "at-1", name: "Morning Prayer"}],
        sessionByType: new Map([["at-1", {session: existingSession}]]),
        statusByDate: new Map([["2026-05-21", {dayType: "working_day", marker: null, held: ["at-1"], didntHappen: []}]]),
        stripDates: ["2026-05-21"],
    };
}

describe("AttendanceSheetActions.onVoid", () => {
    let sessionService;
    let recordService;
    let conceptService;
    let voidResult;

    beforeEach(() => {
        voidResult = {voidedRecordCount: 3, voidedFollowUpCount: 1, skippedFollowUps: []};
        sessionService = {
            voidSession: jest.fn(() => voidResult),
            findExistingSession: jest.fn(() => null), // post-void: no live session
            summaryForDate: jest.fn(() => ({held: [], didntHappen: []})),
        };
        recordService = {findBySession: jest.fn(() => [])};
        conceptService = {getConceptByUUID: jest.fn(() => null)};
    });

    function buildContext() {
        const SessionService = require("../../../src/service/SessionService").default;
        const AttendanceRecordService = require("../../../src/service/AttendanceRecordService").default;
        const ConceptService = require("../../../src/service/ConceptService").default;
        return makeContext([
            [SessionService, sessionService],
            [AttendanceRecordService, recordService],
            [ConceptService, conceptService],
        ]);
    }

    it("calls sessionService.voidSession with the supplied sessionUuid", () => {
        const state = makeBaseState({existingSession: {uuid: "sess-1", status: "Held"}});

        AttendanceSheetActions.onVoid(state, {sessionUuid: "sess-1"}, buildContext());

        assert.equal(sessionService.voidSession.mock.calls.length, 1);
        assert.equal(sessionService.voidSession.mock.calls[0][0], "sess-1");
    });

    it("refreshes sessionByType for the selected date so the picker row drops to Not marked", () => {
        const state = makeBaseState({existingSession: {uuid: "sess-1", status: "Held"}});

        const next = AttendanceSheetActions.onVoid(state, {sessionUuid: "sess-1"}, buildContext());

        // findExistingSession now returns null (post-void), so sessionByType for at-1 has no session.
        assert.equal(next.sessionByType.get("at-1").session, null);
    });

    it("refreshes statusByDate so the strip dot for the selected day clears", () => {
        const state = makeBaseState({existingSession: {uuid: "sess-1", status: "Held"}});

        const next = AttendanceSheetActions.onVoid(state, {sessionUuid: "sess-1"}, buildContext());

        const day = next.statusByDate.get("2026-05-21");
        assert.deepEqual(day.held, []);
        assert.deepEqual(day.didntHappen, []);
    });

    it("stashes the void result so the view can surface skippedFollowUps as a toast", () => {
        voidResult = {voidedRecordCount: 2, voidedFollowUpCount: 1, skippedFollowUps: [{uuid: "fu-with-obs"}]};
        sessionService.voidSession = jest.fn(() => voidResult);
        const state = makeBaseState({existingSession: {uuid: "sess-1", status: "Held"}});

        const next = AttendanceSheetActions.onVoid(state, {sessionUuid: "sess-1"}, buildContext());

        assert.deepEqual(next.lastVoidResult.skippedFollowUps, [{uuid: "fu-with-obs"}]);
    });

    it("is a no-op when sessionUuid is missing (defensive)", () => {
        const state = makeBaseState({existingSession: {uuid: "sess-1", status: "Held"}});

        const next = AttendanceSheetActions.onVoid(state, {}, buildContext());

        assert.equal(sessionService.voidSession.mock.calls.length, 0);
        assert.equal(next, state);
    });
});
