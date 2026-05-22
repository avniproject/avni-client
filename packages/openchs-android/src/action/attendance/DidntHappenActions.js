import _ from "lodash";
import {Session} from "avni-models";
import General from "../../utility/General";
import SessionService from "../../service/SessionService";
import AttendanceRecordService from "../../service/AttendanceRecordService";
import ConceptService from "../../service/ConceptService";
import UserInfoService from "../../service/UserInfoService";

export class DidntHappenActions {
    static getInitialState() {
        return {
            groupSubject: null,
            attendanceType: null,
            scheduledDate: null,
            existingSession: null,
            reasonConceptUUID: null,
            notes: "",
            reasonAnswers: [],
        };
    }

    static onLoad(state, action, context) {
        const {groupSubject, attendanceType, scheduledDate} = action;
        const sessionService = context.get(SessionService);
        const conceptService = context.get(ConceptService);

        const realmSession = sessionService.findExistingSession(groupSubject.uuid, scheduledDate, attendanceType.uuid);

        const outcomeConceptUUID = attendanceType.getSessionOutcomeReasonConceptUUID();
        const reasonAnswers = outcomeConceptUUID
            ? DidntHappenActions._answersFor(conceptService, outcomeConceptUUID)
            : [];

        return {
            ...state,
            groupSubject,
            attendanceType,
            scheduledDate,
            existingSession: DidntHappenActions._snapshotSession(realmSession),
            reasonConceptUUID: realmSession ? realmSession.reasonConceptUUID : null,
            notes: realmSession ? (realmSession.notes || "") : "",
            reasonAnswers,
        };
    }

    static onSetReason(state, action) {
        return {...state, reasonConceptUUID: action.reasonConceptUUID};
    }

    static onSetNotes(state, action) {
        return {...state, notes: action.notes};
    }

    static onSave(state, action, context) {
        if (!state.reasonConceptUUID) return state;
        const {groupSubject, attendanceType, scheduledDate, existingSession, reasonConceptUUID, notes} = state;
        const sessionService = context.get(SessionService);
        const recordService = context.get(AttendanceRecordService);
        const userInfoService = context.get(UserInfoService);
        const conceptService = context.get(ConceptService);

        const session = new Session();
        session.uuid = existingSession ? existingSession.uuid : General.randomUUID();
        session.groupSubjectUUID = groupSubject.uuid;
        session.scheduledDate = scheduledDate;
        session.attendanceTypeUUID = attendanceType.uuid;
        session.markedByUserName = userInfoService.getUserInfo().username;
        session.voided = false;

        const reasonConcept = conceptService.getConceptByUUID(reasonConceptUUID);
        if (!reasonConcept) return state;
        session.markDidntHappen(reasonConcept, notes || null);

        // Flipping a prior HELD session to DIDNT_HAPPEN must void its AttendanceRecords
        // and any auto-created follow-up encounters in the same transaction — otherwise
        // they remain live attached to a session that didn't happen.
        let voidedRecordUUIDs = [];
        if (existingSession && existingSession.status === Session.status.HELD) {
            voidedRecordUUIDs = recordService.findBySession(existingSession.uuid).map(r => r.uuid);
        }

        sessionService.saveOrUpdate({
            session,
            attendanceRecords: [],
            followUps: [],
            voidedRecordUUIDs,
        });

        return {
            ...state,
            existingSession: DidntHappenActions._snapshotSession(session),
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

    static _answersFor(conceptService, conceptUUID) {
        const concept = conceptService.getConceptByUUID(conceptUUID);
        if (!concept || !concept.getAnswers) return [];
        return concept.getAnswers()
            .filter(a => a && a.concept && !a.concept.voided)
            .map(a => ({uuid: a.concept.uuid, name: a.concept.name}));
    }

    static clone(state) {
        return {...state, reasonAnswers: state.reasonAnswers.slice()};
    }
}

const Prefix = "DH";
DidntHappenActions.Names = {
    ON_LOAD: `${Prefix}.ON_LOAD`,
    SET_REASON: `${Prefix}.SET_REASON`,
    SET_NOTES: `${Prefix}.SET_NOTES`,
    SAVE: `${Prefix}.SAVE`,
};
DidntHappenActions.Map = new Map([
    [DidntHappenActions.Names.ON_LOAD, DidntHappenActions.onLoad],
    [DidntHappenActions.Names.SET_REASON, DidntHappenActions.onSetReason],
    [DidntHappenActions.Names.SET_NOTES, DidntHappenActions.onSetNotes],
    [DidntHappenActions.Names.SAVE, DidntHappenActions.onSave],
]);

export default DidntHappenActions;
