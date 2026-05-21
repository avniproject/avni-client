import _ from "lodash";
import {Session} from "avni-models";
import General from "../../utility/General";
import SessionService from "../../service/SessionService";
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

        const existingSession = sessionService.findExistingSession(groupSubject.uuid, scheduledDate, attendanceType.uuid);

        const outcomeConceptUUID = attendanceType.getSessionOutcomeReasonConceptUUID();
        const reasonAnswers = outcomeConceptUUID
            ? DidntHappenActions._answersFor(conceptService, outcomeConceptUUID)
            : [];

        return {
            ...state,
            groupSubject,
            attendanceType,
            scheduledDate,
            existingSession,
            reasonConceptUUID: existingSession ? existingSession.reasonConceptUUID : null,
            notes: existingSession ? (existingSession.notes || "") : "",
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

        sessionService.saveOrUpdate({session, attendanceRecords: [], followUps: [], voidedFollowUps: []});

        return {...state, existingSession: session, saveCompletedAt: Date.now()};
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
