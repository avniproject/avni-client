import moment from "moment";
import _ from "lodash";
import CalendarService from "../../service/CalendarService";
import AttendanceTypeService from "../../service/AttendanceTypeService";
import SessionService from "../../service/SessionService";

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
        };
    }

    // Args from the view: { groupSubject }.
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

        return {
            ...state,
            groupSubject,
            calendar,
            attendanceTypes,
            selectedDate: today.toDate(),
            stripDates,
            statusByDate,
        };
    }

    static onSelectDate(state, action) {
        return {...state, selectedDate: action.date};
    }

    static _buildStripDates(today) {
        // Last STRIP_WINDOW_DAYS days ending at today (inclusive).
        const dates = [];
        for (let i = STRIP_WINDOW_DAYS - 1; i >= 0; i--) {
            dates.push(today.clone().subtract(i, "days").toDate());
        }
        return dates;
    }

    static _dateKey(d) {
        return moment(d).format("YYYY-MM-DD");
    }

    static clone(state) {
        return {
            ...state,
            statusByDate: new Map(state.statusByDate),
            stripDates: state.stripDates.slice(),
            attendanceTypes: state.attendanceTypes.slice(),
        };
    }
}

const Prefix = "AS";
AttendanceSheetActions.Names = {
    ON_LOAD: `${Prefix}.ON_LOAD`,
    SELECT_DATE: `${Prefix}.SELECT_DATE`,
};

AttendanceSheetActions.Map = new Map([
    [AttendanceSheetActions.Names.ON_LOAD, AttendanceSheetActions.onLoad],
    [AttendanceSheetActions.Names.SELECT_DATE, AttendanceSheetActions.onSelectDate],
]);

export default AttendanceSheetActions;
