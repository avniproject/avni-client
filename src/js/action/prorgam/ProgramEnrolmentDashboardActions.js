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

    static onEditEnrolment(state, action, context) {
        const enrolment = context.get(EntityService).findByUUID(action.enrolmentUUID, ProgramEnrolment.schema.name);
        action.cb(enrolment);
        return state;
    }
}

const ProgramEnrolmentDashboardActionsNames = {
    ON_LOAD: 'PEDA.ON_LOAD',
    ON_EDIT_ENROLMENT: 'PEDA.ON_EDIT_ENROLMENT'
};

const ProgramEnrolmentDashboardActionsMap = new Map([
    [ProgramEnrolmentDashboardActionsNames.ON_LOAD, ProgramEnrolmentDashboardActions.onLoad],
    [ProgramEnrolmentDashboardActionsNames.ON_EDIT_ENROLMENT, ProgramEnrolmentDashboardActions.onEditEnrolment],
]);

export {
    ProgramEnrolmentDashboardActionsNames,
    ProgramEnrolmentDashboardActionsMap,
    ProgramEnrolmentDashboardActions
};