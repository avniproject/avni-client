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
        };
    }

    static onLoad(state, action, context) {
        const groupSubject = action.groupSubject;
        const calendarService = context.get(CalendarService);
        const attendanceTypeService = context.get(AttendanceTypeService);
        const sessionService = context.get(SessionService);

        const today = moment().startOf("day");
        const stripDates = AttendanceSheetActions._buildStripDates(today);
        const dayStatuses = calendarService.dayStatusForRange(groupSubject, stripDates);

        const statusByDate = new Map();
        stripDates.forEach(d => {
            const key = AttendanceSheetActions._dateKey(d);
            const dayStatus = dayStatuses.get(key) || {dayType: null, marker: null};
            const summary = sessionService.summaryForDate(groupSubject.uuid, d);
            statusByDate.set(key, {
                dayType: dayStatus.dayType,
                marker: dayStatus.marker,
                held: summary.held,
                didntHappen: summary.didntHappen,
            });
        });

        const calendar = dayStatuses.values().next().value?.calendar || calendarService.forSubject(groupSubject);
        const attendanceTypes = attendanceTypeService.findActiveForSubjectType(groupSubject.subjectType.uuid);
        const sessionByType = AttendanceSheetActions._buildSessionByType(context, groupSubject, today.toDate(), attendanceTypes);

        return {
            ...state,
            groupSubject,
            calendar,
            attendanceTypes,
            selectedDate: today.toDate(),
            stripDates,
            statusByDate,
            sessionByType,
        };
    }

    static onSelectDate(state, action, context) {
        const date = action.date;
        const sessionByType = AttendanceSheetActions._buildSessionByType(
            context, state.groupSubject, date, state.attendanceTypes
        );
        const statusByDate = AttendanceSheetActions._refreshStatusForDate(
            context, state.groupSubject, state.calendar, date, state.statusByDate
        );
        return {...state, selectedDate: date, sessionByType, statusByDate};
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

    static _refreshStatusForDate(context, groupSubject, calendar, date, statusByDate) {
        const sessionService = context.get(SessionService);
        const next = new Map(statusByDate);
        const key = AttendanceSheetActions._dateKey(date);
        const existing = next.get(key) || {dayType: null, marker: null};
        const summary = sessionService.summaryForDate(groupSubject.uuid, date);
        next.set(key, {...existing, held: summary.held, didntHappen: summary.didntHappen});
        return next;
    }

    static _buildSessionByType(context, groupSubject, date, attendanceTypes) {
        const sessionService = context.get(SessionService);
        const recordService = context.get(AttendanceRecordService);
        const conceptService = context.get(ConceptService);
        const map = new Map();
        attendanceTypes.forEach(at => {
            const session = sessionService.findExistingSession(groupSubject.uuid, date, at.uuid);
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

    static _buildStripDates(today) {
        // Last STRIP_WINDOW_DAYS days ending at today (inclusive).
        const dates = [];
        for (let i = STRIP_WINDOW_DAYS - 1; i >= 0; i--) {
            dates.push(today.clone().subtract(i, "days").toDate());
        }
        return dates;
    }

    // Matches Session.scheduledDate's storage normalisation so date-strip keys
    // line up with the Session rows that other services key on.
    static _dateKey(d) {
        return DateTimeUtil.toCalendarDateString(d);
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
};

AttendanceSheetActions.Map = new Map([
    [AttendanceSheetActions.Names.ON_LOAD, AttendanceSheetActions.onLoad],
    [AttendanceSheetActions.Names.SELECT_DATE, AttendanceSheetActions.onSelectDate],
    [AttendanceSheetActions.Names.REFRESH, AttendanceSheetActions.onRefresh],
]);

export default AttendanceSheetActions;
