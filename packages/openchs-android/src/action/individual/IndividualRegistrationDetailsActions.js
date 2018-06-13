import IndividualService from "../../service/IndividualService";
import ProgramService from "../../service/program/ProgramService";
import IndividualRelationshipService from "../../service/relationship/IndividualRelationshipService";

class IndividualRegistrationDetailsActions {
    static getInitialState() {
        return {};
    }

    static onLoad(state, action, context) {
        const individual = context.get(IndividualService).findByUUID(action.individualUUID);
        const relatives = context.get(IndividualRelationshipService).getRelatives(individual);
        return {individual: individual, relatives: relatives, programsAvailable: context.get(ProgramService).programsAvailable};
    }

    static onDeleteRelative(state, action, context) {
        context.get(IndividualRelationshipService).deleteRelative(action.individualRelative);
        const relatives = context.get(IndividualRelationshipService).getRelatives(state.individual);
        return {individual: state.individual, relatives: relatives, programsAvailable: state.programsAvailable};
    }
}

const IndividualRegistrationDetailsActionsNames = {
    ON_LOAD: 'IRDA.ON_LOAD',
    ON_DELETE_RELATIVE: 'IRDA.ON_DELETE_RELATIVE'
};

const IndividualRegistrationDetailsActionsMap = new Map([
    [IndividualRegistrationDetailsActionsNames.ON_LOAD, IndividualRegistrationDetailsActions.onLoad],
    [IndividualRegistrationDetailsActionsNames.ON_DELETE_RELATIVE, IndividualRegistrationDetailsActions.onDeleteRelative],
]);

export {
    IndividualRegistrationDetailsActionsNames,
    IndividualRegistrationDetailsActionsMap,
    IndividualRegistrationDetailsActions
};