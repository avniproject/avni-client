// Verifies AttendanceSheetActions.onLoad lands on action.initialDate when a
// deep-link supplies one, and falls back to today otherwise. The strip window
// always ends at today regardless.

import {assert} from "chai";
import moment from "moment";

jest.mock("../../../src/framework/bean/Service", () => () => (target) => target);

import {AttendanceSheetActions} from "../../../src/action/attendance/AttendanceSheetActions";

function makeContext(stubs) {
    const map = new Map(stubs.map(([klass, stub]) => [klass.name, stub]));
    return {get: (klass) => map.get(klass.name)};
}

function buildContext() {
    const CalendarService = require("../../../src/service/CalendarService").default;
    const AttendanceTypeService = require("../../../src/service/AttendanceTypeService").default;
    const SessionService = require("../../../src/service/SessionService").default;
    const AttendanceRecordService = require("../../../src/service/AttendanceRecordService").default;
    const ConceptService = require("../../../src/service/ConceptService").default;
    return makeContext([
        [CalendarService, {
            dayStatusForRange: (_s, dates) => new Map(dates.map(d => [d, {dayType: "working_day", marker: null, calendar: {uuid: "c1"}}])),
            forSubject: () => ({uuid: "c1"}),
        }],
        [AttendanceTypeService, {findActiveForSubjectType: () => []}],
        [SessionService, {summaryForDate: () => ({held: [], didntHappen: []}), findExistingSession: () => null}],
        [AttendanceRecordService, {findBySession: () => []}],
        [ConceptService, {getConceptByUUID: () => null}],
    ]);
}

const groupSubject = {uuid: "g1", subjectType: {uuid: "st1"}};

describe("AttendanceSheetActions.onLoad initialDate", () => {
    it("selects the supplied initialDate", () => {
        const newState = AttendanceSheetActions.onLoad({}, {groupSubject, initialDate: "2026-05-20"}, buildContext());
        assert.equal(newState.selectedDate, "2026-05-20");
    });

    it("defaults to today when no initialDate is supplied", () => {
        const newState = AttendanceSheetActions.onLoad({}, {groupSubject}, buildContext());
        assert.equal(newState.selectedDate, moment().format("YYYY-MM-DD"));
    });
});
