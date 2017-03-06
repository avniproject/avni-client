import EntityService from "../../service/EntityService";
import ProgramEnrolment from '../../models/ProgramEnrolment';

class ProgramEnrolmentDashboardActions {
    static getInitialState() {
        return {};
    }

    static onLoad(state, action, context) {
        const newState = {};
        newState.enrolment = context.get(EntityService).findByUUID(action.enrolmentUUID, ProgramEnrolment.schema.name);
        return newState;
    }
}

const ProgramEnrolmentDashboardActionsNames = {
    ON_LOAD: 'PEDA.ON_LOAD'
};

const ProgramEnrolmentDashboardActionsMap = new Map([
    [ProgramEnrolmentDashboardActionsNames.ON_LOAD, ProgramEnrolmentDashboardActions.onLoad],
]);

export {
    ProgramEnrolmentDashboardActionsNames,
    ProgramEnrolmentDashboardActionsMap,
    ProgramEnrolmentDashboardActions
};