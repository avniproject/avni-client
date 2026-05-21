import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {AttendanceRecord, Encounter, EntityQueue, ProgramEncounter, Session} from "avni-models";
import {DateTimeUtil} from "openchs-models";
import _ from "lodash";
import moment from "moment";
import AttendanceRecordService from "./AttendanceRecordService";

// All writes for the Attendance flow happen here so a Session save (and its
// AttendanceRecords + auto-created follow-up encounters + any re-mark voids)
// commits in a single Realm transaction and queues atomically for sync.
@Service("sessionService")
class SessionService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return Session.schema.name;
    }

    // followUps:        Array<{encounter, schemaName}>  (Encounter or ProgramEncounter)
    // voidedFollowUps:  Array<{uuid, schemaName}>       (re-mark path; missing/voided UUIDs are skipped)
    saveOrUpdate({session, attendanceRecords = [], followUps = [], voidedFollowUps = []}) {
        const db = this.db;
        this.db.write(() => {
            db.create(Session.schema.name, session, Realm.UpdateMode.Modified);
            db.create(EntityQueue.schema.name, EntityQueue.create(session, Session.schema.name));

            attendanceRecords.forEach(record => {
                db.create(AttendanceRecord.schema.name, record, Realm.UpdateMode.Modified);
                db.create(EntityQueue.schema.name, EntityQueue.create(record, AttendanceRecord.schema.name));
            });

            followUps.forEach(({encounter, schemaName}) => {
                db.create(schemaName, encounter, Realm.UpdateMode.Modified);
                db.create(EntityQueue.schema.name, EntityQueue.create(encounter, schemaName));
            });

            voidedFollowUps.forEach(({uuid, schemaName}) => {
                const existing = db.objectForPrimaryKey(schemaName, uuid);
                if (!existing || existing.voided) return;
                existing.voided = true;
                db.create(EntityQueue.schema.name, EntityQueue.create(existing, schemaName));
            });
        });
        return session;
    }

    // Cascade-voids the Session, its AttendanceRecords, and linked follow-up
    // encounters that have no observations yet. Encounters with observations are
    // left intact and returned in skippedFollowUps for the caller to surface.
    voidSession(sessionUuid) {
        const db = this.db;
        const result = {voidedRecordCount: 0, voidedFollowUpCount: 0, skippedFollowUps: []};
        this.db.write(() => {
            const session = db.objectForPrimaryKey(Session.schema.name, sessionUuid);
            if (!session || session.voided) return;

            session.voided = true;
            db.create(EntityQueue.schema.name, EntityQueue.create(session, Session.schema.name));

            const records = this.getService(AttendanceRecordService).findBySession(sessionUuid);
            records.forEach(record => {
                if (record.voided) return;
                record.voided = true;
                db.create(EntityQueue.schema.name, EntityQueue.create(record, AttendanceRecord.schema.name));
                result.voidedRecordCount += 1;

                if (!record.followUpEncounterUUID) return;
                const {encounter, schemaName} = this._findFollowUpEncounter(db, record.followUpEncounterUUID);
                if (!encounter || encounter.voided) return;
                if (this._hasObservations(encounter)) {
                    result.skippedFollowUps.push({uuid: encounter.uuid});
                    return;
                }
                encounter.voided = true;
                db.create(EntityQueue.schema.name, EntityQueue.create(encounter, schemaName));
                result.voidedFollowUpCount += 1;
            });
        });
        return result;
    }

    findExistingSession(groupSubjectUuid: string, scheduledDate, attendanceTypeUuid: string): ?Session {
        const dateKey = this._toDateKey(scheduledDate);
        return this.db.objects(Session.schema.name)
            .filtered(
                "voided = false AND groupSubjectUUID = $0 AND scheduledDate = $1 AND attendanceTypeUUID = $2",
                groupSubjectUuid, dateKey, attendanceTypeUuid
            )[0];
    }

    // Returns { held: attendanceTypeUUID[], didntHappen: attendanceTypeUUID[] }.
    summaryForDate(groupSubjectUuid: string, date) {
        const dateKey = this._toDateKey(date);
        const sessions = this.db.objects(Session.schema.name)
            .filtered(
                "voided = false AND groupSubjectUUID = $0 AND scheduledDate = $1",
                groupSubjectUuid, dateKey
            );
        const held = [];
        const didntHappen = [];
        sessions.forEach(s => {
            if (s.status === Session.status.HELD) held.push(s.attendanceTypeUUID);
            else if (s.status === Session.status.DIDNT_HAPPEN) didntHappen.push(s.attendanceTypeUUID);
        });
        return {held, didntHappen};
    }

    // Count of (working_day × attendance type) tuples in [sinceDate, today] with no
    // active Session. Caller supplies calendar/markers/types to avoid re-querying per day.
    countPendingSlots(groupSubjectUuid: string, calendar, markers, attendanceTypes, sinceDate): number {
        if (!calendar || _.isEmpty(attendanceTypes)) return 0;
        const today = moment().startOf("day");
        const cursor = moment(sinceDate).startOf("day");
        let count = 0;
        while (cursor.isSameOrBefore(today)) {
            const dayType = calendar.dayType(cursor.toDate(), markers);
            if (this._isWorkingDayType(dayType)) {
                const covered = new Set(
                    this.summaryForDate(groupSubjectUuid, cursor.toDate()).held.concat(
                        this.summaryForDate(groupSubjectUuid, cursor.toDate()).didntHappen
                    )
                );
                attendanceTypes.forEach(at => {
                    if (!covered.has(at.uuid)) count += 1;
                });
            }
            cursor.add(1, "day");
        }
        return count;
    }

    // Must match Session.scheduledDate's storage normalisation (DateTimeUtil.toCalendarDateString,
    // which uses moment.utc) — otherwise lookups miss saved rows across timezones.
    _toDateKey(d): string {
        return DateTimeUtil.toCalendarDateString(d);
    }

    _isWorkingDayType(dayType): boolean {
        return dayType === "working_day" || dayType === "working_override";
    }

    // A follow-up encounter can be either schema depending on the attendance type's
    // configured EncounterType. Try Encounter first, fall through to ProgramEncounter.
    _findFollowUpEncounter(db, encounterUuid: string) {
        let encounter = db.objectForPrimaryKey(Encounter.schema.name, encounterUuid);
        if (encounter) return {encounter, schemaName: Encounter.schema.name};
        encounter = db.objectForPrimaryKey(ProgramEncounter.schema.name, encounterUuid);
        if (encounter) return {encounter, schemaName: ProgramEncounter.schema.name};
        return {encounter: null, schemaName: null};
    }

    _hasObservations(encounter): boolean {
        return !!(encounter.observations && encounter.observations.length > 0);
    }
}

export default SessionService;
