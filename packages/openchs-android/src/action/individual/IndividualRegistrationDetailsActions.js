import IndividualService from "../../service/IndividualService";
import ProgramService from "../../service/program/ProgramService";
import IndividualRelationshipService from "../../service/relationship/IndividualRelationshipService";
import GroupSubjectService from "../../service/GroupSubjectService";

class IndividualRegistrationDetailsActions {
    static getInitialState() {
        return {
            expand: false,
        };
    }

    static onLoad(state, action, context) {
        const individual = context.get(IndividualService).findByUUID(action.individualUUID);
        const relatives = context.get(IndividualRelationshipService).getRelatives(individual);
        const groupSubjects = context.get(GroupSubjectService).getGroupSubjects(individual);
        return {
            ...state,
            individual,
            relatives,
            groupSubjects,
            programsAvailable: context.get(ProgramService).programsAvailable,
            expand: false,
            expandMembers: false,
        };
    }

    static onDeleteRelative(state, action, context) {
        context.get(IndividualRelationshipService).deleteRelative(action.individualRelative);
        const relatives = context.get(IndividualRelationshipService).getRelatives(state.individual);
        return {
            ...state,
            individual: state.individual,
            relatives: relatives,
            programsAvailable: state.programsAvailable
        };
    }

    static voidUnVoidIndividual(state, action, beans) {
        const individualService = beans.get(IndividualService);
        individualService.voidUnVoidIndividual(action.individualUUID, action.setVoided);
        action.cb();
        return IndividualRegistrationDetailsActions.onLoad(state, action, beans);
    }

    static onToggle(state, action) {
        const expandKey = action.keyName;
        return {...state, [expandKey]: !state[expandKey]};
    }
}

const IndividualRegistrationDetailsActionsNames = {
    ON_LOAD: 'IRDA.ON_LOAD',
    ON_DELETE_RELATIVE: 'IRDA.ON_DELETE_RELATIVE',
    VOID_UN_VOID_INDIVIDUAL: "IRDA.VOID_INDIVIDUAL",
    ON_TOGGLE: "IRDA.ON_TOGGLE",
};

const IndividualRegistrationDetailsActionsMap = new Map([
    [IndividualRegistrationDetailsActionsNames.ON_LOAD, IndividualRegistrationDetailsActions.onLoad],
    [IndividualRegistrationDetailsActionsNames.ON_DELETE_RELATIVE, IndividualRegistrationDetailsActions.onDeleteRelative],
    [IndividualRegistrationDetailsActionsNames.VOID_UN_VOID_INDIVIDUAL, IndividualRegistrationDetailsActions.voidUnVoidIndividual],
    [IndividualRegistrationDetailsActionsNames.ON_TOGGLE, IndividualRegistrationDetailsActions.onToggle],
]);

export {
    IndividualRegistrationDetailsActionsNames,
    IndividualRegistrationDetailsActionsMap,
    IndividualRegistrationDetailsActions
};
