import IndividualService from "../../service/IndividualService";
import ProgramService from "../../service/program/ProgramService";
import IndividualRelationshipService from "../../service/relationship/IndividualRelationshipService";

class IndividualRegistrationDetailsActions {
    static getInitialState() {
        return {
            expand: false,
        };
    }

    static onLoad(state, action, context) {
        const individual = context.get(IndividualService).findByUUID(action.individualUUID);
        const relatives = context.get(IndividualRelationshipService).getRelatives(individual);
        return {
            ...state,
            individual,
            relatives,
            programsAvailable: context.get(ProgramService).programsAvailable
        };
    }

    static onDeleteRelative(state, action, context) {
        context.get(IndividualRelationshipService).deleteRelative(action.individualRelative);
        const relatives = context.get(IndividualRelationshipService).getRelatives(state.individual);
        return {individual: state.individual, relatives: relatives, programsAvailable: state.programsAvailable};
    }

    static voidIndividual(state, action, beans) {
        const individualService = beans.get(IndividualService);
        individualService.voidIndividual(action.individualUUID);
        action.cb();
        return state;
    }

    static onToggle(state) {
        return {...state, expand: !state.expand};
    }
}

const IndividualRegistrationDetailsActionsNames = {
    ON_LOAD: 'IRDA.ON_LOAD',
    ON_DELETE_RELATIVE: 'IRDA.ON_DELETE_RELATIVE',
    VOID_INDIVIDUAL: "IRDA.VOID_INDIVIDUAL",
    ON_TOGGLE: "IRDA.ON_TOGGLE",
};

const IndividualRegistrationDetailsActionsMap = new Map([
    [IndividualRegistrationDetailsActionsNames.ON_LOAD, IndividualRegistrationDetailsActions.onLoad],
    [IndividualRegistrationDetailsActionsNames.ON_DELETE_RELATIVE, IndividualRegistrationDetailsActions.onDeleteRelative],
    [IndividualRegistrationDetailsActionsNames.VOID_INDIVIDUAL, IndividualRegistrationDetailsActions.voidIndividual],
    [IndividualRegistrationDetailsActionsNames.ON_TOGGLE, IndividualRegistrationDetailsActions.onToggle],
]);

export {
    IndividualRegistrationDetailsActionsNames,
    IndividualRegistrationDetailsActionsMap,
    IndividualRegistrationDetailsActions
};
