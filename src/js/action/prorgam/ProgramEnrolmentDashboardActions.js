import EntityService from "../../service/EntityService";
import ProgramEnrolment from '../../models/ProgramEnrolment';
import Individual from '../../models/Individual';
import _ from 'lodash';

class ProgramEnrolmentDashboardActions {
    static getInitialState() {
        return {};
    }

    static onLoad(state, action, context) {
        const newState = {};
        const entityService = context.get(EntityService);
        if (_.isNil(action.enrolmentUUID)) {
            const individual = entityService.findByUUID(action.individualUUID, Individual.schema.name);
            newState.enrolment = individual.firstActiveEnrolment;
        }
        else {
            newState.enrolment = entityService.findByUUID(action.enrolmentUUID, ProgramEnrolment.schema.name);
        }
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