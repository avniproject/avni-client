import _ from "lodash";
import {Session, WorkItem} from "avni-models";
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
            pendingAutoShareWorkItem: null,
        };
    }

    static onLoad(state, action, context) {
        const {groupSubject, attendanceType, scheduledDate, seedReasonConceptUUID, seedNotes} = action;
        const sessionService = context.get(SessionService);
        const conceptService = context.get(ConceptService);

        const realmSession = sessionService.findExistingSession(groupSubject.uuid, scheduledDate, attendanceType.uuid);

        const outcomeConceptUUID = attendanceType.getSessionOutcomeReasonConceptUUID();
        const reasonAnswers = outcomeConceptUUID
            ? DidntHappenActions._answersFor(conceptService, outcomeConceptUUID)
            : [];

        // Existing session wins (re-mark); else seed from Mark-anyway carry-forward; else empty.
        const initialReasonConceptUUID = realmSession ? realmSession.reasonConceptUUID
            : (seedReasonConceptUUID || null);
        const initialNotes = realmSession ? (realmSession.notes || "")
            : (seedNotes || "");

        return {
            ...state,
            groupSubject,
            attendanceType,
            scheduledDate,
            existingSession: DidntHappenActions._snapshotSession(realmSession),
            reasonConceptUUID: initialReasonConceptUUID,
            notes: initialNotes,
            reasonAnswers,
            pendingAutoShareWorkItem: null,
        };
    }

    static onSetReason(state, action) {
        return {...state, reasonConceptUUID: action.reasonConceptUUID};
    }

    static onSetNotes(state, action) {
        return {...state, notes: action.notes};
    }

    static onSave(state, action, context) {
        if (!state.reasonConceptUUID) return {...state, pendingAutoShareWorkItem: null};
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
        if (!reasonConcept) return {...state, pendingAutoShareWorkItem: null};
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

        const pendingAutoShareWorkItem = DidntHappenActions._buildAutoShareWorkItem(attendanceType, session);

        return {
            ...state,
            existingSession: DidntHappenActions._snapshotSession(session),
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
            General.logError("DidntHappenActions._buildAutoShareWorkItem", `isAutoShareOnSave threw: ${e.message}`);
            return null;
        }
        if (!enabled) return null;
        return new WorkItem(General.randomUUID(), WorkItem.type.SHARE_SESSION, {sessionUUID: session.uuid, format: "text"});
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
