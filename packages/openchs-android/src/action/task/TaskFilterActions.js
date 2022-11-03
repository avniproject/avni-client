import EntityService from "../../service/EntityService";
import {TaskStatus, TaskType} from 'openchs-models';
import TaskFilterState from "../../state/TaskFilterState";

class TaskFilterActions {
    static getInitialState(context) {
        return {};
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const newState = TaskFilterState.clone(state);
        newState.allTaskTypes = entityService.getAllNonVoided(TaskType.schema.name);
        newState.selectedTaskType = newState.allTaskTypes[0];
        newState.allTaskStatuses = entityService.getAllNonVoided(TaskStatus.schema.name);;
        newState.selectedTaskStatus = newState.allTaskStatuses[0];
        newState.taskMetadataFields = newState.selectedTaskType.metadataSearchFields;
        return newState;
    }
}

const ActionPrefix = 'TaskFilter';

const TaskFilterActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`
};

const TaskFilterActionMap = new Map([
    [TaskFilterActionNames.ON_LOAD, TaskFilterActions.onLoad],
]);

export {TaskFilterActions, TaskFilterActionNames as Actions, TaskFilterActionMap}
