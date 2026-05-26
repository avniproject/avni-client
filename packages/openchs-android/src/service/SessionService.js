import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {AttendanceRecord, Encounter, EntityQueue, Individual, ProgramEncounter, ProgramEnrolment, Session} from "avni-models";
import {DateTimeUtil} from "openchs-models";
import _ from "lodash";
import moment from "moment";
import AttendanceRecordService from "./AttendanceRecordService";
import EncounterService from "./EncounterService";
import ProgramEncounterService from "./program/ProgramEncounterService";
import UserInfoService from "./UserInfoService";

// Inlined from openchs-models/utility/AuditUtil — Session and AttendanceRecord
// don't expose updateAudit() the way Individual / AbstractEncounter do.
function stampAudit(entity, userInfo, isNew, existing) {
    if (isNew) {
        if (_.isNil(entity.createdByUUID)) {
            entity.createdByUUID = userInfo.userUUID;
            entity.createdBy = userInfo.name;
        }
    } else if (existing) {
        entity.createdByUUID = entity.createdByUUID || existing.createdByUUID;
        entity.createdBy = entity.createdBy || existing.createdBy;
    }
    entity.lastModifiedByUUID = userInfo.userUUID;
    entity.lastModifiedBy = userInfo.name;
}

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

    // Single Realm-write entry point for the Attendance save flow.
    //
    //   session              — Session instance to upsert
    //   attendanceRecords    — new AttendanceRecord instances to upsert
    //   followUps            — Array<{encounter, schemaName}>  (Encounter or ProgramEncounter)
    //   previousRecords      — plain snapshots of the prior session's AttendanceRecords,
    //                          used inside the write to drive Session.voidStaleFollowUps
    //   voidedRecordUUIDs    — AttendanceRecord UUIDs to cascade-void (departed members,
    //                          HELD→DIDNT_HAPPEN flip). Their linked follow-up encounters
    //                          are also voided unless they already have observations.
    //
    // Returns { voidedFollowUps: [{uuid}], skippedFollowUps: [{uuid}] } describing
    // follow-ups voided automatically and those preserved (observations present).
    saveOrUpdate({session, attendanceRecords = [], followUps = [], previousRecords = [], voidedRecordUUIDs = []}) {
        const db = this.db;
        const encounterService = this.getService(EncounterService);
        const programEncounterService = this.getService(ProgramEncounterService);
        const userInfo = this.getService(UserInfoService).getUserInfo();
        const lookupEncounter = (uuid) =>
            encounterService.findByUUID(uuid) || programEncounterService.findByUUID(uuid);
        const result = {voidedFollowUps: [], skippedFollowUps: []};

        this.db.write(() => {
            const sessionExisting = db.objectForPrimaryKey(Session.schema.name, session.uuid);
            stampAudit(session, userInfo, !sessionExisting, sessionExisting);
            db.create(Session.schema.name, session, Realm.UpdateMode.Modified);
            db.create(EntityQueue.schema.name, EntityQueue.create(session, Session.schema.name));

            attendanceRecords.forEach(record => {
                const recordExisting = db.objectForPrimaryKey(AttendanceRecord.schema.name, record.uuid);
                stampAudit(record, userInfo, !recordExisting, recordExisting);
                db.create(AttendanceRecord.schema.name, record, Realm.UpdateMode.Modified);
                db.create(EntityQueue.schema.name, EntityQueue.create(record, AttendanceRecord.schema.name));
            });

            followUps.forEach(({encounter, schemaName}) => {
                encounter.updateAudit(userInfo, true, false);
                const persisted = db.create(schemaName, encounter, Realm.UpdateMode.Modified);
                // Mirror EncounterService._saveEncounter / ProgramEncounterService._saveEncounter:
                // the parent (Individual / ProgramEnrolment) keeps an explicit `encounters` list,
                // and `Individual.nonVoidedEncounters()` reads from it. Without this push, the
                // freshly-created follow-up sits in Realm but never surfaces on the Subject
                // Dashboard's general/program encounter tab until a server sync re-establishes
                // the link.
                const parentUUID = schemaName === ProgramEncounter.schema.name
                    ? (persisted.programEnrolment && persisted.programEnrolment.uuid)
                    : (persisted.individual && persisted.individual.uuid);
                if (parentUUID) {
                    const parentSchema = schemaName === ProgramEncounter.schema.name
                        ? ProgramEnrolment.schema.name
                        : Individual.schema.name;
                    const parent = db.objectForPrimaryKey(parentSchema, parentUUID);
                    if (parent && _.isFunction(parent.addEncounter)) parent.addEncounter(persisted);
                }
                db.create(EntityQueue.schema.name, EntityQueue.create(persisted, schemaName));
            });

            // Departed-member and HELD→DIDNT_HAPPEN cascades. Each voided record's follow-up
            // encounter is voided too unless it already has observations.
            voidedRecordUUIDs.forEach(uuid => {
                const record = db.objectForPrimaryKey(AttendanceRecord.schema.name, uuid);
                if (!record || record.voided) return;
                record.voided = true;
                record.lastModifiedByUUID = userInfo.userUUID;
                record.lastModifiedBy = userInfo.name;
                db.create(EntityQueue.schema.name, EntityQueue.create(record, AttendanceRecord.schema.name));
                if (!record.followUpEncounterUUID) return;
                this._voidFollowUpEncounter(db, lookupEncounter, record.followUpEncounterUUID, result, userInfo);
            });

            // Stale-follow-up cascade for re-marks where the same student is still in the
            // new roster but their reason/status changed (and they no longer need a follow-up).
            if (previousRecords.length > 0) {
                const voidStaleResult = session.voidStaleFollowUps(previousRecords, attendanceRecords, lookupEncounter);
                voidStaleResult.voided.forEach(encounter => {
                    if (!encounter || encounter.voided) return;
                    const schemaName = encounter.programEnrolment ? ProgramEncounter.schema.name : Encounter.schema.name;
                    encounter.lastModifiedByUUID = userInfo.userUUID;
                    encounter.lastModifiedBy = userInfo.name;
                    db.create(EntityQueue.schema.name, EntityQueue.create(encounter, schemaName));
                    result.voidedFollowUps.push({uuid: encounter.uuid});
                });
                voidStaleResult.skipped.forEach(encounter => {
                    if (!encounter) return;
                    result.skippedFollowUps.push({uuid: encounter.uuid});
                });
            }
        });
        return result;
    }

    _voidFollowUpEncounter(db, lookupEncounter, encounterUUID, result, userInfo) {
        const encounter = lookupEncounter(encounterUUID);
        if (!encounter || encounter.voided) return;
        if (this._hasObservations(encounter)) {
            result.skippedFollowUps.push({uuid: encounter.uuid});
            return;
        }
        const schemaName = encounter.programEnrolment ? ProgramEncounter.schema.name : Encounter.schema.name;
        encounter.voided = true;
        if (userInfo) {
            encounter.lastModifiedByUUID = userInfo.userUUID;
            encounter.lastModifiedBy = userInfo.name;
        }
        db.create(EntityQueue.schema.name, EntityQueue.create(encounter, schemaName));
        result.voidedFollowUps.push({uuid: encounter.uuid});
    }

    // Cascade-voids the Session, its AttendanceRecords, and linked follow-up
    // encounters that have no observations yet. Encounters with observations are
    // left intact and returned in skippedFollowUps for the caller to surface.
    voidSession(sessionUuid) {
        const db = this.db;
        const encounterService = this.getService(EncounterService);
        const programEncounterService = this.getService(ProgramEncounterService);
        const userInfo = this.getService(UserInfoService).getUserInfo();
        const result = {voidedRecordCount: 0, voidedFollowUpCount: 0, skippedFollowUps: []};
        this.db.write(() => {
            const session = db.objectForPrimaryKey(Session.schema.name, sessionUuid);
            if (!session || session.voided) return;

            session.voided = true;
            session.lastModifiedByUUID = userInfo.userUUID;
            session.lastModifiedBy = userInfo.name;
            db.create(EntityQueue.schema.name, EntityQueue.create(session, Session.schema.name));

            const records = this.getService(AttendanceRecordService).findBySession(sessionUuid);
            records.forEach(record => {
                if (record.voided) return;
                record.voided = true;
                record.lastModifiedByUUID = userInfo.userUUID;
                record.lastModifiedBy = userInfo.name;
                db.create(EntityQueue.schema.name, EntityQueue.create(record, AttendanceRecord.schema.name));
                result.voidedRecordCount += 1;

                if (!record.followUpEncounterUUID) return;
                const encounter = encounterService.findByUUID(record.followUpEncounterUUID)
                    || programEncounterService.findByUUID(record.followUpEncounterUUID);
                if (!encounter || encounter.voided) return;
                if (this._hasObservations(encounter)) {
                    result.skippedFollowUps.push({uuid: encounter.uuid});
                    return;
                }
                const schemaName = encounter.programEnrolment ? ProgramEncounter.schema.name : Encounter.schema.name;
                encounter.voided = true;
                encounter.lastModifiedByUUID = userInfo.userUUID;
                encounter.lastModifiedBy = userInfo.name;
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
    // active Session. `sinceDate` may be a "YYYY-MM-DD" string or a Date — both work
    // because every loop iteration drives off calendar-date keys.
    countPendingSlots(groupSubjectUuid: string, calendar, markers, attendanceTypes, sinceDate): number {
        if (!calendar || _.isEmpty(attendanceTypes)) return 0;
        const todayKey = moment().format("YYYY-MM-DD");
        const cursor = DateTimeUtil.calendarMoment(this._toDateKey(sinceDate));
        if (!cursor) return 0;
        let count = 0;
        while (cursor.format("YYYY-MM-DD") <= todayKey) {
            const dateKey = cursor.format("YYYY-MM-DD");
            const dayType = calendar.dayType(dateKey, markers);
            if (this._isWorkingDayType(dayType)) {
                const summary = this.summaryForDate(groupSubjectUuid, dateKey);
                const covered = new Set(summary.held.concat(summary.didntHappen));
                attendanceTypes.forEach(at => {
                    if (!covered.has(at.uuid)) count += 1;
                });
            }
            cursor.add(1, "day");
        }
        return count;
    }

    // The Session.scheduledDate setter normalises to "YYYY-MM-DD" via
    // DateTimeUtil.toCalendarDateString — using the same function here keeps
    // lookup keys aligned with stored rows. Accepts strings or Dates.
    _toDateKey(d): string {
        return DateTimeUtil.toCalendarDateString(d);
    }

    _isWorkingDayType(dayType): boolean {
        return dayType === "working_day" || dayType === "working_override";
    }

    _hasObservations(encounter): boolean {
        return !!(encounter.observations && encounter.observations.length > 0);
    }
}

export default SessionService;
