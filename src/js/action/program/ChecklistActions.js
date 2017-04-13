import EntityService from "../../service/EntityService";
import _ from 'lodash';
import ProgramEnrolment from '../../models/ProgramEnrolment';

class ChecklistActions {
    static getInitialState() {
        return {};
    }

    static clone(state) {
        const checklists = [];
        if (!_.isNil(state.checklists)) {
            state.checklists.forEach((checklist) => {
                checklists.push(checklist.clone());
            });
        }
        return {checklists: checklists};
    }

    static onLoad(state, action, context) {
        const newState = ChecklistActions.clone(state);
        const enrolment = context.get(EntityService).findByUUID(action.enrolmentUUID, ProgramEnrolment.schema.name);
        newState.checklists = enrolment.checklists;
        return newState;
    }
}

const ChecklistActionsNames = {
    ON_LOAD: 'Checklist.ON_LOAD'
};

const ChecklistActionsMap = new Map([
    [ChecklistActionsNames.ON_LOAD, ChecklistActions.onLoad]
]);

export {
    ChecklistActionsNames,
    ChecklistActionsMap,
    ChecklistActions
};