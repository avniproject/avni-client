import _ from "lodash";
import {AttendanceRecord, Encounter, ProgramEncounter, Session} from "avni-models";
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
            existingSession: null,
            roster: [],
            notes: "",
            absenceReasonAnswers: [],
            followUpEncounterTypeUuid: null,
        };
    }

    static onLoad(state, action, context) {
        const {groupSubject, attendanceType, scheduledDate} = action;
        const groupSubjectService = context.get(GroupSubjectService);
        const sessionService = context.get(SessionService);
        const recordService = context.get(AttendanceRecordService);
        const conceptService = context.get(ConceptService);

        const members = groupSubjectService.getGroupSubjects(groupSubject)
            .filter(gs => !gs.memberSubject.voided && _.isNil(gs.membershipEndDate));

        const existingSession = sessionService.findExistingSession(groupSubject.uuid, scheduledDate, attendanceType.uuid);
        const existingRecords = existingSession
            ? _.keyBy(recordService.findBySession(existingSession.uuid), "subjectUUID")
            : {};

        const roster = members.map(gs => {
            const prior = existingRecords[gs.memberSubject.uuid];
            return {
                subjectUUID: gs.memberSubject.uuid,
                name: gs.memberSubject.nameString,
                status: prior ? prior.status : AttendanceRecord.status.PRESENT,
                reasonConceptUUID: prior ? prior.reasonConceptUUID : null,
            };
        });

        const absenceReasonConceptUUID = attendanceType.getAbsenceReasonConceptUUID();
        const absenceReasonAnswers = absenceReasonConceptUUID
            ? RosterActions._answersFor(conceptService, absenceReasonConceptUUID)
            : [];

        return {
            ...state,
            groupSubject,
            attendanceType,
            scheduledDate,
            existingSession,
            roster,
            notes: existingSession ? (existingSession.notes || "") : "",
            absenceReasonAnswers,
            followUpEncounterTypeUuid: attendanceType.getFollowUpEncounterTypeUUID(),
        };
    }

    static onTogglePresence(state, action) {
        const roster = state.roster.map(r => {
            if (r.subjectUUID !== action.subjectUUID) return r;
            const flipped = r.status === AttendanceRecord.status.PRESENT
                ? AttendanceRecord.status.ABSENT
                : AttendanceRecord.status.PRESENT;
            return {
                ...r,
                status: flipped,
                // Clearing the reason when toggling back to Present prevents stale reasons leaking on save.
                reasonConceptUUID: flipped === AttendanceRecord.status.PRESENT ? null : r.reasonConceptUUID,
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

    static onMarkAllAbsent(state) {
        const roster = state.roster.map(r => ({
            ...r,
            status: AttendanceRecord.status.ABSENT,
        }));
        return {...state, roster};
    }

    static onSetNotes(state, action) {
        return {...state, notes: action.notes};
    }

    static onSave(state, action, context) {
        const {groupSubject, attendanceType, scheduledDate, existingSession, roster, notes} = state;
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
        // same Realm row instead of creating duplicates. The server-side partial
        // unique (session_id, subject_id) would reject the dupes on push anyway.
        const previousRecords = existingSession ? recordService.findBySession(existingSession.uuid) : [];
        const existingRecordUUIDByStudent = _.fromPairs(previousRecords.map(r => [r.subjectUUID, r.uuid]));

        const rosterByStudentUUID = _.keyBy(
            roster.map(r => ({...r})),
            "subjectUUID"
        );
        const attendanceRecords = session.markHeld(rosterByStudentUUID);
        attendanceRecords.forEach(r => {
            const reused = existingRecordUUIDByStudent[r.subjectUUID];
            if (reused) r.uuid = reused;
        });

        const studentSubjectType = _.get(roster, "[0]") ? attendanceType : attendanceType;
        // The roster's member subjects all share one subject type; pick it from the
        // first member via groupSubject (set during ON_LOAD). For Phase 5 we assume
        // homogeneous member subject types within a group; the spec doesn't support
        // mixed groups for attendance.
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

        let voidedFollowUps = [];
        let skippedFollowUps = [];
        if (existingSession) {
            const encounterLookup = (uuid) => sessionService._findFollowUpEncounter
                ? sessionService._findFollowUpEncounter(sessionService.db, uuid).encounter
                : null;
            const result = session.voidStaleFollowUps(previousRecords, attendanceRecords, encounterLookup);
            voidedFollowUps = result.voided.map(e => ({
                uuid: e.uuid,
                schemaName: e.programEnrolment ? ProgramEncounter.schema.name : Encounter.schema.name,
            }));
            skippedFollowUps = result.skipped;
        }

        const followUpsForSave = followUps.map(e => ({
            encounter: e,
            schemaName: e.programEnrolment ? ProgramEncounter.schema.name : Encounter.schema.name,
        }));

        sessionService.saveOrUpdate({
            session,
            attendanceRecords,
            followUps: followUpsForSave,
            voidedFollowUps,
        });

        return {
            ...state,
            existingSession: session,
            lastSaveResult: {
                createdFollowUps: followUps.map(e => ({
                    uuid: e.uuid,
                    encounterTypeName: _.get(e, "encounterType.name", ""),
                    subjectUUID: _.get(e, "individual.uuid") || _.get(e, "programEnrolment.individual.uuid"),
                    earliestVisitDateTime: e.earliestVisitDateTime,
                    maxVisitDateTime: e.maxVisitDateTime,
                })),
                voidedFollowUpCount: voidedFollowUps.length,
                skippedFollowUps: skippedFollowUps.map(e => ({uuid: e.uuid})),
            },
            saveCompletedAt: Date.now(),
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
        };
    }
}

const Prefix = "Roster";
RosterActions.Names = {
    ON_LOAD: `${Prefix}.ON_LOAD`,
    TOGGLE_PRESENCE: `${Prefix}.TOGGLE_PRESENCE`,
    SET_REASON: `${Prefix}.SET_REASON`,
    MARK_ALL_ABSENT: `${Prefix}.MARK_ALL_ABSENT`,
    SET_NOTES: `${Prefix}.SET_NOTES`,
    SAVE: `${Prefix}.SAVE`,
};

RosterActions.Map = new Map([
    [RosterActions.Names.ON_LOAD, RosterActions.onLoad],
    [RosterActions.Names.TOGGLE_PRESENCE, RosterActions.onTogglePresence],
    [RosterActions.Names.SET_REASON, RosterActions.onSetReason],
    [RosterActions.Names.MARK_ALL_ABSENT, RosterActions.onMarkAllAbsent],
    [RosterActions.Names.SET_NOTES, RosterActions.onSetNotes],
    [RosterActions.Names.SAVE, RosterActions.onSave],
]);

export default RosterActions;
