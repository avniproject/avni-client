import EntityService from "../../service/EntityService";
import _ from 'lodash';
import ProgramEnrolment from '../../models/ProgramEnrolment';
import Checklist from '../../models/Checklist';

class ChecklistActions {
    static getValidationResult(checklistIndex, checklistItemName, state) {
        const validationResults = state.validationResultsArray[checklistIndex];
        return validationResults.find((validationResult) => validationResult.name === checklistItemName);
    }

    static getInitialState() {
        return {};
    }

    static clone(state) {
        const checklists = [];
        const validationResults = [];
        if (!_.isNil(state.checklists)) {
            state.checklists.forEach((checklist) => {
                checklists.push(checklist.clone());
                validationResults.push([]);
            });
        }
        return {checklists: checklists, validationResultsArray: validationResults, showSavedToast: false, promptForSave: false};
    }

    static onLoad(state, action, context) {
        const newState = ChecklistActions.clone(state);
        const enrolment = context.get(EntityService).findByUUID(action.enrolmentUUID, ProgramEnrolment.schema.name);
        newState.checklists = enrolment.checklists;
        newState.validationResultsArray = [];
        newState.checklists.forEach((checklist) => newState.validationResultsArray.push([]));
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