import ProgramEnrolmentService from "../../service/ProgramEnrolmentService";
import EntityService from "../../service/EntityService";
import {Program} from 'avni-models';

class ProgramEnrolmentsActions {
    static getInitialState() {
        return {};
    }

    static onLoad(state, action, context) {
        const newState = {};
        newState.enrolments = context.get(ProgramEnrolmentService).getAllEnrolments(action.programUUID);
        newState.programName = context.get(EntityService).findByUUID(action.programUUID, Program.schema.name).name;
        return newState;
    }
}

const ProgramEnrolmentsActionsNames = {
    ON_LOAD: 'PEsA.ON_LOAD'
};

const ProgramEnrolmentsActionsMap = new Map([
    [ProgramEnrolmentsActionsNames.ON_LOAD, ProgramEnrolmentsActions.onLoad]
]);

export {
    ProgramEnrolmentsActionsNames,
    ProgramEnrolmentsActionsMap,
    ProgramEnrolmentsActions
};