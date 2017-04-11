import G from "../../utility/General";
import EntityService from "../../service/EntityService";

class ChecklistActions {
    static getInitialState() {
        return {};
    }

    static clone(state) {
        return {checklist: state.checklist.clone()}
    }

    static onLoad(state, action, context) {
        const newState = state.clone();
        const enrolment = context.get(EntityService).findByUUID(action.enrolmentUUID);
        newState.checklist = enrolment.checklist;
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