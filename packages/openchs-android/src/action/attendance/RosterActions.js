import _ from "lodash";
import {AttendanceRecord} from "avni-models";
import GroupSubjectService from "../../service/GroupSubjectService";
import SessionService from "../../service/SessionService";
import AttendanceRecordService from "../../service/AttendanceRecordService";
import ConceptService from "../../service/ConceptService";

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
};

RosterActions.Map = new Map([
    [RosterActions.Names.ON_LOAD, RosterActions.onLoad],
    [RosterActions.Names.TOGGLE_PRESENCE, RosterActions.onTogglePresence],
    [RosterActions.Names.SET_REASON, RosterActions.onSetReason],
    [RosterActions.Names.MARK_ALL_ABSENT, RosterActions.onMarkAllAbsent],
    [RosterActions.Names.SET_NOTES, RosterActions.onSetNotes],
]);

export default RosterActions;
