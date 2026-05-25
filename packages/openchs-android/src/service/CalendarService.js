import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {Calendar, CalendarDateMarker} from "avni-models";
import {Calendars, DateTimeUtil} from "openchs-models";
import _ from "lodash";

@Service("calendarService")
class CalendarService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return Calendar.schema.name;
    }

    forSubject(subject): ?Calendar {
        const allCalendars = this.db.objects(Calendar.schema.name)
            .filtered("voided = false")
            .map(_.identity);
        return Calendars.forSubject(subject, allCalendars);
    }

    dayStatusFor(subject, date) {
        const calendar = this.forSubject(subject);
        if (!calendar) return {calendar: null, dayType: null};

        const markers = this._markersFor(calendar.uuid);
        const dayType = calendar.dayType(date, markers);
        const marker = _.find(markers, m =>
            !m.voided
            && m.calendarUUID === calendar.uuid
            && this._sameCalendarDate(m.markerDate, date)
        ) || null;
        return {calendar, dayType, marker};
    }

    // Returns Map<YYYY-MM-DD, { calendar, dayType, marker? }>. One Realm read
    // for calendars + one for markers regardless of date count.
    dayStatusForRange(subject, dates) {
        const calendar = this.forSubject(subject);
        const result = new Map();
        if (!calendar) {
            _.forEach(dates, d => result.set(this._dateKey(d), {calendar: null, dayType: null}));
            return result;
        }
        const markers = this._markersFor(calendar.uuid);
        _.forEach(dates, d => {
            const dayType = calendar.dayType(d, markers);
            const marker = _.find(markers, m =>
                !m.voided
                && m.calendarUUID === calendar.uuid
                && this._sameCalendarDate(m.markerDate, d)
            ) || null;
            result.set(this._dateKey(d), {calendar, dayType, marker});
        });
        return result;
    }

    _markersFor(calendarUuid: string) {
        return this.db.objects(CalendarDateMarker.schema.name)
            .filtered("voided = false AND calendarUUID = $0", calendarUuid)
            .map(_.identity);
    }

    _dateKey(date) {
        return DateTimeUtil.toCalendarDateString(date);
    }

    _sameCalendarDate(a, b) {
        return this._dateKey(a) === this._dateKey(b);
    }
}

export default CalendarService;
