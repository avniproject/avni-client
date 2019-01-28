import EntityService from "../../service/EntityService";
import _ from 'lodash';
import {ProgramEnrolment, Checklist} from 'openchs-models';

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
        return {checklists: checklists, showSavedToast: false, promptForSave: false};
    }

    static onLoad(state, action, context) {
        const newState = ChecklistActions.clone(state);
        const enrolment = context.get(EntityService).findByUUID(action.enrolmentUUID, ProgramEnrolment.schema.name);
        newState.checklists = enrolment.checklists;
        return newState;
    }

    static onCompletionDateChange(state, action) {
        const newState = ChecklistActions.clone(state);
        const checklist = newState.checklists.find((checklist) => {
            return checklist.name === action.checklistName
        });
        checklist.setCompletionDate(action.checklistItemName, action.value);
        newState.promptForSave = true;
        return newState;
    }

    static onSave(state, action, context) {
        const newState = ChecklistActions.clone(state);
        newState.checklists.forEach((checklist) => {
            context.get(EntityService).saveOrUpdate(checklist, Checklist.schema.name);
        });
        newState.showSavedToast = true;
        newState.promptForSave = false;
        return newState;
    }
}

const ChecklistActionsNames = {
    ON_LOAD: 'Checklist.ON_LOAD',
    ON_CHECKLIST_ITEM_COMPLETION_DATE_CHANGE: 'Checklist.ON_CHECKLIST_ITEM_COMPLETION_DATE_CHANGE',
    SAVE: 'Checklist.Save'
};

const ChecklistActionsMap = new Map([
    [ChecklistActionsNames.ON_LOAD, ChecklistActions.onLoad],
    [ChecklistActionsNames.ON_CHECKLIST_ITEM_COMPLETION_DATE_CHANGE, ChecklistActions.onCompletionDateChange],
    [ChecklistActionsNames.SAVE, ChecklistActions.onSave]
]);

export {
    ChecklistActionsNames,
    ChecklistActionsMap,
    ChecklistActions
};