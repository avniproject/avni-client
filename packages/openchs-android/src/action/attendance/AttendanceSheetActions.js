import moment from "moment";
import _ from "lodash";
import CalendarService from "../../service/CalendarService";
import AttendanceTypeService from "../../service/AttendanceTypeService";
import SessionService from "../../service/SessionService";
import AttendanceRecordService from "../../service/AttendanceRecordService";
import ConceptService from "../../service/ConceptService";
import {AttendanceRecord} from "avni-models";
import {DateTimeUtil} from "openchs-models";

const STRIP_WINDOW_DAYS = 14;

export class AttendanceSheetActions {
    static getInitialState() {
        return {
            groupSubject: null,
            calendar: null,
            attendanceTypes: [],
            selectedDate: null,
            stripDates: [],
            statusByDate: new Map(),
            sessionByType: new Map(),
            markAnywayUnlocked: false,
            markAnywayReasonConceptUUID: null,
            markAnywayNotes: "",
        };
    }

    static onLoad(state, action, context) {
        const groupSubject = action.groupSubject;
        const calendarService = context.get(CalendarService);
        const attendanceTypeService = context.get(AttendanceTypeService);
        const sessionService = context.get(SessionService);

        // The attendance flow is time- and timezone-agnostic: every date in state,
        // every prop crossing component boundaries, and every key used for Realm
        // lookups is a canonical "YYYY-MM-DD" string. We never round-trip through
        // a JS Date so there is no local/UTC drift to reason about.
        const today = AttendanceSheetActions._todayKey();
        const stripDates = AttendanceSheetActions._buildStripDates(today);
        const dayStatuses = calendarService.dayStatusForRange(groupSubject, stripDates);

        const statusByDate = new Map();
        stripDates.forEach(dateKey => {
            const dayStatus = dayStatuses.get(dateKey) || {dayType: null, marker: null};
            const summary = sessionService.summaryForDate(groupSubject.uuid, dateKey);
            statusByDate.set(dateKey, {
                dayType: dayStatus.dayType,
                marker: dayStatus.marker,
                held: summary.held,
                didntHappen: summary.didntHappen,
            });
        });

        const calendar = dayStatuses.values().next().value?.calendar || calendarService.forSubject(groupSubject);
        const attendanceTypes = attendanceTypeService.findActiveForSubjectType(groupSubject.subjectType.uuid);
        const sessionByType = AttendanceSheetActions._buildSessionByType(context, groupSubject, today, attendanceTypes);

        return {
            ...state,
            groupSubject,
            calendar,
            attendanceTypes,
            selectedDate: today,
            stripDates,
            statusByDate,
            sessionByType,
            markAnywayUnlocked: false,
            markAnywayReasonConceptUUID: null,
            markAnywayNotes: "",
        };
    }

    static onSelectDate(state, action, context) {
        const dateKey = DateTimeUtil.toCalendarDateString(action.date);
        const sessionByType = AttendanceSheetActions._buildSessionByType(
            context, state.groupSubject, dateKey, state.attendanceTypes
        );
        const statusByDate = AttendanceSheetActions._refreshStatusForDate(
            context, state.groupSubject, state.calendar, dateKey, state.statusByDate
        );
        // The Mark-anyway opt-in is per-date — switching dates locks the picker back.
        return {
            ...state,
            selectedDate: dateKey,
            sessionByType,
            statusByDate,
            markAnywayUnlocked: false,
            markAnywayReasonConceptUUID: null,
            markAnywayNotes: "",
        };
    }

    static onSetMarkAnywayOutcome(state, action) {
        return {
            ...state,
            markAnywayUnlocked: true,
            markAnywayReasonConceptUUID: action.reasonConceptUUID || null,
            markAnywayNotes: action.notes || "",
        };
    }

    // After a save, the type-picker rows need fresh session info AND the date strip
    // dot for the selected day needs to reflect what was just saved. Dispatched on
    // route focus (AttendanceSheetView.changeFocus) so going back from RosterView
    // refreshes both without a re-mount.
    static onRefresh(state, action, context) {
        if (!state.selectedDate || !state.groupSubject) return state;
        const sessionByType = AttendanceSheetActions._buildSessionByType(
            context, state.groupSubject, state.selectedDate, state.attendanceTypes
        );
        const statusByDate = AttendanceSheetActions._refreshStatusForDate(
            context, state.groupSubject, state.calendar, state.selectedDate, state.statusByDate
        );
        return {...state, sessionByType, statusByDate};
    }

    // Cascade-voids the Session + its AttendanceRecords + unfilled follow-ups in
    // a single Realm transaction (see SessionService.voidSession). After the
    // void, sessionByType + the strip dot are refreshed so the row drops back
    // to "Not marked". lastVoidResult.skippedFollowUps surfaces follow-ups that
    // were preserved because they already had observations.
    static onVoid(state, action, context) {
        if (!action.sessionUuid) return state;
        const sessionService = context.get(SessionService);
        const voidResult = sessionService.voidSession(action.sessionUuid);

        const sessionByType = AttendanceSheetActions._buildSessionByType(
            context, state.groupSubject, state.selectedDate, state.attendanceTypes
        );
        const statusByDate = AttendanceSheetActions._refreshStatusForDate(
            context, state.groupSubject, state.calendar, state.selectedDate, state.statusByDate
        );
        return {...state, sessionByType, statusByDate, lastVoidResult: voidResult};
    }

    static _refreshStatusForDate(context, groupSubject, calendar, dateKey, statusByDate) {
        const sessionService = context.get(SessionService);
        const next = new Map(statusByDate);
        const existing = next.get(dateKey) || {dayType: null, marker: null};
        const summary = sessionService.summaryForDate(groupSubject.uuid, dateKey);
        next.set(dateKey, {...existing, held: summary.held, didntHappen: summary.didntHappen});
        return next;
    }

    static _buildSessionByType(context, groupSubject, dateKey, attendanceTypes) {
        const sessionService = context.get(SessionService);
        const recordService = context.get(AttendanceRecordService);
        const conceptService = context.get(ConceptService);
        const map = new Map();
        attendanceTypes.forEach(at => {
            const session = sessionService.findExistingSession(groupSubject.uuid, dateKey, at.uuid);
            if (!session) {
                map.set(at.uuid, {session: null});
                return;
            }
            const records = recordService.findBySession(session.uuid);
            const present = records.filter(r => r.status === AttendanceRecord.status.PRESENT).length;
            const reasonName = session.reasonConceptUUID
                ? _.get(conceptService.getConceptByUUID(session.reasonConceptUUID), "name", "")
                : "";
            map.set(at.uuid, {session, totalCount: records.length, presentCount: present, reasonName});
        });
        return map;
    }

    // Last STRIP_WINDOW_DAYS calendar dates ending at `todayKey` (inclusive), as
    // canonical "YYYY-MM-DD" strings. moment.utc avoids any local-tz arithmetic.
    static _buildStripDates(todayKey) {
        const cursor = DateTimeUtil.calendarMoment(todayKey);
        const dates = [];
        for (let i = STRIP_WINDOW_DAYS - 1; i >= 0; i--) {
            const key = cursor.clone().subtract(i, "days").format("YYYY-MM-DD");
            dates.push(key);
        }
        return dates;
    }

    static _todayKey() {
        // "Today" is the device's local calendar date. We never materialise it as a
        // JS Date — that would re-introduce timezone drift when the date is later
        // round-tripped through DateTimeUtil.toCalendarDateString (which is UTC).
        return moment().format("YYYY-MM-DD");
    }

    static clone(state) {
        return {
            ...state,
            statusByDate: new Map(state.statusByDate),
            sessionByType: new Map(state.sessionByType),
            stripDates: state.stripDates.slice(),
            attendanceTypes: state.attendanceTypes.slice(),
        };
    }
}

const Prefix = "AS";
AttendanceSheetActions.Names = {
    ON_LOAD: `${Prefix}.ON_LOAD`,
    SELECT_DATE: `${Prefix}.SELECT_DATE`,
    REFRESH: `${Prefix}.REFRESH`,
    VOID: `${Prefix}.VOID`,
    SET_MARK_ANYWAY_OUTCOME: `${Prefix}.SET_MARK_ANYWAY_OUTCOME`,
};

AttendanceSheetActions.Map = new Map([
    [AttendanceSheetActions.Names.ON_LOAD, AttendanceSheetActions.onLoad],
    [AttendanceSheetActions.Names.SELECT_DATE, AttendanceSheetActions.onSelectDate],
    [AttendanceSheetActions.Names.REFRESH, AttendanceSheetActions.onRefresh],
    [AttendanceSheetActions.Names.VOID, AttendanceSheetActions.onVoid],
    [AttendanceSheetActions.Names.SET_MARK_ANYWAY_OUTCOME, AttendanceSheetActions.onSetMarkAnywayOutcome],
]);

export default AttendanceSheetActions;
