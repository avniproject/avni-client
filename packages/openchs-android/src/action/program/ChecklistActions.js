import EntityService from "../../service/EntityService";
import _ from 'lodash';
import {ProgramEnrolment, Checklist} from 'avni-models';

class ChecklistActions {
    static getInitialState() {
        return {};
    }

    static clone(state) {
        const checklists = _.clone(state.checklists);

        return {
            checklists: checklists,
            individual: !_.isNil(state.individual) ? state.individual.cloneForReference() : null,
            showSavedToast: false,
            promptForSave: false
        };
    }

    static onLoad(state, action, context) {
        const newState = ChecklistActions.clone(state);
        const enrolment = context.get(EntityService).findByUUID(action.enrolmentUUID, ProgramEnrolment.schema.name);

        const checklists = [];
        enrolment.checklists.forEach(checklist => {
            const groupedItems = [];
            checklist.items.filter(item => !item.detail.voided).forEach(checklistItem => {
                const applicableState = checklistItem.calculateApplicableState();
                if (!_.isNil(applicableState.status)) {
                    const applicableStateName = applicableState.status.state;
                    groupedItems[applicableStateName] = _
                        .get(groupedItems, applicableStateName, [])
                        .concat([{"uuid": checklistItem.uuid, applicableState, checklistItem}]);
                }
            });
            checklists.push({"uuid": checklist.uuid, groupedItems});
        });

        newState.checklists = checklists;
        newState.individual = enrolment.individual;
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