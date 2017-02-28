import G from "../../utility/General";
import EntityService from "../../service/EntityService";

class ProgramEnrolmentDashboardActions {
    static getInitialState() {
        return {};
    }

    static onLoad(state, action, context) {
        const newState = state.clone();
        const enrolment = context.get(EntityService).findByUUID(action.enrolmentUUID);
        newState.enrolment = enrolment;
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