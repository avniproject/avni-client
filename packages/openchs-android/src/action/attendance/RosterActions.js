import _ from "lodash";
import {AttendanceRecord, Encounter, ProgramEncounter, Session, WorkItem} from "avni-models";
import General from "../../utility/General";
import GroupSubjectService from "../../service/GroupSubjectService";
import SessionService from "../../service/SessionService";
import AttendanceRecordService from "../../service/AttendanceRecordService";
import ConceptService from "../../service/ConceptService";
import UserInfoService from "../../service/UserInfoService";
import {resolveFollowUps} from "../../service/attendance/FollowUpResolver";

export class RosterActions {
    static getInitialState() {
        return {
            groupSubject: null,
            attendanceType: null,
            scheduledDate: null,
            dayType: null,
            existingSession: null,
            roster: [],
            notes: "",
            absenceReasonAnswers: [],
            sessionReasonAnswers: [],
            sessionReasonConceptUUID: null,
            followUpEncounterTypeUuid: null,
            saveError: null,
            pendingAutoShareWorkItem: null,
        };
    }

    static onLoad(state, action, context) {
        const {groupSubject, attendanceType, scheduledDate, dayType} = action;
        const groupSubjectService = context.get(GroupSubjectService);
        const sessionService = context.get(SessionService);
        const recordService = context.get(AttendanceRecordService);
        const conceptService = context.get(ConceptService);

        const members = groupSubjectService.getGroupSubjects(groupSubject)
            .filter(gs => !gs.memberSubject.voided && _.isNil(gs.membershipEndDate));

        const realmSession = sessionService.findExistingSession(groupSubject.uuid, scheduledDate, attendanceType.uuid);
        const existingRecords = realmSession
            ? _.keyBy(recordService.findBySession(realmSession.uuid), "subjectUUID")
            : {};

        const roster = members.map(gs => {
            const prior = existingRecords[gs.memberSubject.uuid];
            return {
                subjectUUID: gs.memberSubject.uuid,
                name: gs.memberSubject.nameString,
                status: prior ? prior.status : AttendanceRecord.status.PRESENT,
                reasonConceptUUID: prior ? prior.reasonConceptUUID : null,
                needsFollowUp: prior ? !!prior.needsFollowUp : false,
                followUpEncounterUUID: prior ? (prior.followUpEncounterUUID || null) : null,
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        const absenceReasonConceptUUID = attendanceType.getAbsenceReasonConceptUUID();
        const absenceReasonAnswers = absenceReasonConceptUUID
            ? RosterActions._answersFor(conceptService, absenceReasonConceptUUID)
            : [];

        const sessionOutcomeConceptUUID = attendanceType.getSessionOutcomeReasonConceptUUID();
        const sessionReasonAnswers = sessionOutcomeConceptUUID
            ? RosterActions._answersFor(conceptService, sessionOutcomeConceptUUID)
            : [];

        return {
            ...state,
            groupSubject,
            attendanceType,
            scheduledDate,
            dayType: dayType || null,
            existingSession: RosterActions._snapshotSession(realmSession),
            roster,
            notes: realmSession ? (realmSession.notes || "") : "",
            absenceReasonAnswers,
            sessionReasonAnswers,
            sessionReasonConceptUUID: realmSession ? (realmSession.reasonConceptUUID || null) : null,
            followUpEncounterTypeUuid: attendanceType.getFollowUpEncounterTypeUUID(),
            saveError: null,
            pendingAutoShareWorkItem: null,
        };
    }

    static onSetSessionReason(state, action) {
        return {...state, sessionReasonConceptUUID: action.reasonConceptUUID};
    }

    static isHolidayLikeDayType(dayType) {
        return dayType === "weekly_off" || dayType === "public_holiday";
    }

    static onTogglePresence(state, action) {
        const roster = state.roster.map(r => {
            if (r.subjectUUID !== action.subjectUUID) return r;
            const flipped = r.status === AttendanceRecord.status.PRESENT
                ? AttendanceRecord.status.ABSENT
                : AttendanceRecord.status.PRESENT;
            const becamePresent = flipped === AttendanceRecord.status.PRESENT;
            return {
                ...r,
                status: flipped,
                reasonConceptUUID: becamePresent ? null : r.reasonConceptUUID,
                needsFollowUp: becamePresent ? false : r.needsFollowUp,
            };
        });
        return {...state, roster};
    }

    static onSetReason(state, action) {
        const roster = state.roster.map(r =>
            r.subjectUUID === action.subjectUUID
                ? {...r, reasonConceptUUID: action.reasonConceptUUID}
                : r
        );
        return {...state, roster};
    }

    static onToggleNeedsFollowUp(state, action) {
        const roster = state.roster.map(r =>
            r.subjectUUID === action.subjectUUID
                ? {...r, needsFollowUp: !r.needsFollowUp}
                : r
        );
        return {...state, roster};
    }

    static onMarkAllAbsent(state) {
        const roster = state.roster.map(r => ({
            ...r,
            status: AttendanceRecord.status.ABSENT,
        }));
        return {...state, roster};
    }

    static onMarkAllPresent(state) {
        const roster = state.roster.map(r => ({
            ...r,
            status: AttendanceRecord.status.PRESENT,
            reasonConceptUUID: null,
            needsFollowUp: false,
        }));
        return {...state, roster};
    }

    static onSetNotes(state, action) {
        return {...state, notes: action.notes};
    }

    static onSave(state, action, context) {
        const {groupSubject, attendanceType, scheduledDate, dayType, existingSession, roster, notes, sessionReasonConceptUUID} = state;
        if (_.isEmpty(roster)) {
            return {...state, saveError: "rosterEmptyError", lastSaveResult: null, pendingAutoShareWorkItem: null};
        }
        if (RosterActions.isHolidayLikeDayType(dayType) && _.isEmpty((sessionReasonConceptUUID || "").trim())) {
            return {...state, saveError: "sessionReasonRequiredOnHoliday", lastSaveResult: null, pendingAutoShareWorkItem: null};
        }

        const sessionService = context.get(SessionService);
        const recordService = context.get(AttendanceRecordService);
        const userInfoService = context.get(UserInfoService);

        const session = new Session();
        session.uuid = existingSession ? existingSession.uuid : General.randomUUID();
        session.groupSubjectUUID = groupSubject.uuid;
        session.scheduledDate = scheduledDate;
        session.attendanceTypeUUID = attendanceType.uuid;
        session.notes = notes || null;
        session.markedByUserName = userInfoService.getUserInfo().username;
        session.voided = false;

        // Re-mark path: reuse prior AttendanceRecord UUIDs so the upsert replaces the
        // same Realm row instead of creating duplicates.
        const priorRecordRealmObjects = existingSession ? recordService.findBySession(existingSession.uuid) : [];
        const previousRecords = priorRecordRealmObjects.map(RosterActions._snapshotRecord);
        const priorByStudent = _.keyBy(previousRecords, "subjectUUID");

        const rosterByStudentUUID = _.keyBy(
            roster.map(r => ({...r})),
            "subjectUUID"
        );
        const attendanceRecords = session.markHeld(rosterByStudentUUID, sessionReasonConceptUUID || null);
        attendanceRecords.forEach(r => {
            // markHeld does not propagate the needsFollowUp flag from the roster
            // entry; copy it onto the record so autoCreateFollowUps/voidStale see it.
            const rosterEntry = rosterByStudentUUID[r.subjectUUID];
            r.needsFollowUp = !!(rosterEntry && rosterEntry.needsFollowUp);

            const prior = priorByStudent[r.subjectUUID];
            if (!prior) return;
            r.uuid = prior.uuid;
            // Preserve the follow-up encounter link only when BOTH prior and new
            // states warrant a follow-up (Absent + needsFollowUp). Otherwise:
            //   - prior warranted, new doesn't → voidStaleFollowUps voids the prior
            //     encounter; carrying the link forward would leave a dangling reference.
            //   - prior didn't warrant → any link on the prior is already dangling;
            //     don't propagate it, otherwise autoCreateFollowUps' skip-if-linked
            //     guard suppresses a legitimate new follow-up.
            const newWarrants = r.status === AttendanceRecord.status.ABSENT && r.needsFollowUp;
            const priorWarranted = prior.status === AttendanceRecord.status.ABSENT && !!prior.needsFollowUp;
            if (newWarrants && priorWarranted) {
                r.followUpEncounterUUID = prior.followUpEncounterUUID || null;
            }
        });

        // Members in the prior record set who are no longer in the roster (left the group).
        // Their AttendanceRecords + linked follow-ups cascade-void inside saveOrUpdate.
        const newSubjectUUIDs = new Set(attendanceRecords.map(r => r.subjectUUID));
        const voidedRecordUUIDs = previousRecords
            .filter(r => !newSubjectUUIDs.has(r.subjectUUID))
            .map(r => r.uuid);

        const memberSubjectType = state.groupSubject.subjectType.group
            ? RosterActions._inferMemberSubjectType(context, state.groupSubject)
            : state.groupSubject.subjectType;

        let followUps = [];
        const followUpResolution = memberSubjectType
            ? resolveFollowUps({attendanceType, studentSubjectType: memberSubjectType, context})
            : null;
        if (followUpResolution) {
            followUps = session.autoCreateFollowUps({
                attendanceRecords,
                attendanceType,
                encounterType: followUpResolution.encounterType,
                programUUID: followUpResolution.programUUID,
                studentLookup: followUpResolution.studentLookup,
                enrolmentLookup: followUpResolution.enrolmentLookup,
            });
        }

        const followUpsForSave = followUps.map(e => ({
            encounter: e,
            schemaName: e.programEnrolment ? ProgramEncounter.schema.name : Encounter.schema.name,
        }));

        const saveResult = sessionService.saveOrUpdate({
            session,
            attendanceRecords,
            followUps: followUpsForSave,
            previousRecords,
            voidedRecordUUIDs,
        });

        const pendingAutoShareWorkItem = RosterActions._buildAutoShareWorkItem(attendanceType, session);

        return {
            ...state,
            existingSession: RosterActions._snapshotSession(session),
            saveError: null,
            lastSaveResult: {
                createdFollowUps: followUps.map(e => ({
                    uuid: e.uuid,
                    encounterTypeName: _.get(e, "encounterType.name", ""),
                    subjectUUID: _.get(e, "individual.uuid") || _.get(e, "programEnrolment.individual.uuid"),
                    earliestVisitDateTime: e.earliestVisitDateTime,
                    maxVisitDateTime: e.maxVisitDateTime,
                })),
                voidedFollowUpCount: saveResult.voidedFollowUps.length,
                skippedFollowUps: saveResult.skippedFollowUps,
            },
            pendingAutoShareWorkItem,
            saveCompletedAt: Date.now(),
        };
    }

    static _snapshotSession(realmSession) {
        if (!realmSession) return null;
        return {
            uuid: realmSession.uuid,
            status: realmSession.status,
            notes: realmSession.notes || null,
            reasonConceptUUID: realmSession.reasonConceptUUID || null,
        };
    }

    static _buildAutoShareWorkItem(attendanceType, session) {
        if (!attendanceType || !_.isFunction(attendanceType.isAutoShareOnSave)) return null;
        let enabled = false;
        try {
            enabled = !!attendanceType.isAutoShareOnSave();
        } catch (e) {
            General.logError("RosterActions._buildAutoShareWorkItem", `isAutoShareOnSave threw: ${e.message}`);
            return null;
        }
        if (!enabled) return null;
        return new WorkItem(General.randomUUID(), WorkItem.type.SHARE_SESSION, {sessionUUID: session.uuid, format: "text"});
    }

    static _snapshotRecord(record) {
        return {
            uuid: record.uuid,
            subjectUUID: record.subjectUUID,
            status: record.status,
            reasonConceptUUID: record.reasonConceptUUID || null,
            followUpEncounterUUID: record.followUpEncounterUUID || null,
            needsFollowUp: !!record.needsFollowUp,
        };
    }

    static _inferMemberSubjectType(context, groupSubject) {
        const members = context.get(GroupSubjectService).getGroupSubjects(groupSubject)
            .filter(gs => !gs.memberSubject.voided);
        return members.length > 0 ? members[0].memberSubject.subjectType : null;
    }

    static _answersFor(conceptService, conceptUUID) {
        const concept = conceptService.getConceptByUUID(conceptUUID);
        if (!concept) return [];
        const answers = concept.getAnswers ? concept.getAnswers() : [];
        return answers
            .filter(a => a && a.concept && !a.concept.voided)
            .map(a => ({uuid: a.concept.uuid, name: a.concept.name}));
    }

    static clone(state) {
        return {
            ...state,
            roster: state.roster.map(r => ({...r})),
            absenceReasonAnswers: state.absenceReasonAnswers.slice(),
            sessionReasonAnswers: state.sessionReasonAnswers.slice(),
        };
    }
}

const Prefix = "Roster";
RosterActions.Names = {
    ON_LOAD: `${Prefix}.ON_LOAD`,
    TOGGLE_PRESENCE: `${Prefix}.TOGGLE_PRESENCE`,
    SET_REASON: `${Prefix}.SET_REASON`,
    TOGGLE_NEEDS_FOLLOW_UP: `${Prefix}.TOGGLE_NEEDS_FOLLOW_UP`,
    SET_SESSION_REASON: `${Prefix}.SET_SESSION_REASON`,
    MARK_ALL_ABSENT: `${Prefix}.MARK_ALL_ABSENT`,
    MARK_ALL_PRESENT: `${Prefix}.MARK_ALL_PRESENT`,
    SET_NOTES: `${Prefix}.SET_NOTES`,
    SAVE: `${Prefix}.SAVE`,
};

RosterActions.Map = new Map([
    [RosterActions.Names.ON_LOAD, RosterActions.onLoad],
    [RosterActions.Names.TOGGLE_PRESENCE, RosterActions.onTogglePresence],
    [RosterActions.Names.SET_REASON, RosterActions.onSetReason],
    [RosterActions.Names.TOGGLE_NEEDS_FOLLOW_UP, RosterActions.onToggleNeedsFollowUp],
    [RosterActions.Names.SET_SESSION_REASON, RosterActions.onSetSessionReason],
    [RosterActions.Names.MARK_ALL_ABSENT, RosterActions.onMarkAllAbsent],
    [RosterActions.Names.MARK_ALL_PRESENT, RosterActions.onMarkAllPresent],
    [RosterActions.Names.SET_NOTES, RosterActions.onSetNotes],
    [RosterActions.Names.SAVE, RosterActions.onSave],
]);

export default RosterActions;
