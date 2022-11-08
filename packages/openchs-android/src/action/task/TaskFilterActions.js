import EntityService from "../../service/EntityService";
import {TaskStatus, TaskType} from 'openchs-models';
import TaskFilterState from "../../state/TaskFilterState";
import TaskStatusService from "../../service/task/TaskStatusService";
import UserInfoService from "../../service/UserInfoService";
import _ from "lodash";
import {Concept} from 'openchs-models';

class TaskFilterActions {
    static getInitialState(context) {
        return TaskFilterState.createEmptyState();
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const taskStatusService = context.get(TaskStatusService);
        const userInfoService = context.get(UserInfoService);
        const userSettings = userInfoService.getUserSettingsObject();

        const allTaskTypes = entityService.getAllNonVoided(TaskType.schema.name).map(_.identity);
        const selectedTaskType = allTaskTypes[0];
        const taskStatuses = taskStatusService.getAllForTaskType(selectedTaskType);

        const newState = TaskFilterState.clone(state);
        return TaskFilterState.initialise(newState, allTaskTypes, selectedTaskType, taskStatuses, userSettings.datePickerMode);
    }

    static onTaskTypeChange(state, action, context) {
        const taskStatusService = context.get(TaskStatusService);

        const newState = TaskFilterState.clone(state);
        const taskStatuses = taskStatusService.getAllForTaskType(newState, action);
        return TaskFilterState.changeTaskType(newState, action, taskStatuses);
    }

    static onTaskStatusChange(state, action, context) {
        const newState = TaskFilterState.clone(state);
        return TaskFilterState.toggleTaskStatus(newState, action);
    }

    static onTaskCreatedDateChange(state, action, context) {
        const newState = TaskFilterState.clone(state);
        newState.taskCreatedDate = action;
        return newState;
    }

    static onTaskCompletedDateChange(state, action, context) {
        const newState = TaskFilterState.clone(state);
        newState.taskCompletedDate = action;
        return newState;
    }

    static onMetadataValueChange(state, action, context) {
        const newState = TaskFilterState.clone(state);
        newState.taskMetadataValues[action.concept.uuid] = action.value;
        return newState;
    }

    static onMetadataCodedValueChange(state, action, context) {
        const newState = TaskFilterState.clone(state);
        return TaskFilterState.changeMetadataCodedAnswer(newState, action.concept, action.chosenAnswerConcept);
    }
}

const ActionPrefix = 'TaskFilter';

const TaskFilterActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_TASK_TYPE_CHANGE: `${ActionPrefix}.ON_TASK_TYPE_CHANGE`,
    ON_TASK_STATUS_CHANGE: `${ActionPrefix}.ON_TASK_STATUS_CHANGE`,
    ON_TASK_CREATED_DATE_CHANGE: `${ActionPrefix}.ON_TASK_CREATED_DATE_CHANGE`,
    ON_TASK_COMPLETED_DATE_CHANGE: `${ActionPrefix}.ON_TASK_COMPLETED_DATE_CHANGE`,
    ON_METADATA_VALUE_CHANGE: `${ActionPrefix}.ON_METADATA_VALUE_CHANGE`,
    ON_METADATA_CODED_VALUE_CHANGE: `${ActionPrefix}.ON_METADATA_CODED_VALUE_CHANGE`
};

const TaskFilterActionMap = new Map([
    [TaskFilterActionNames.ON_LOAD, TaskFilterActions.onLoad],
    [TaskFilterActionNames.ON_TASK_TYPE_CHANGE, TaskFilterActions.onTaskTypeChange],
    [TaskFilterActionNames.ON_TASK_STATUS_CHANGE, TaskFilterActions.onTaskStatusChange],
    [TaskFilterActionNames.ON_TASK_CREATED_DATE_CHANGE, TaskFilterActions.onTaskCreatedDateChange],
    [TaskFilterActionNames.ON_TASK_COMPLETED_DATE_CHANGE, TaskFilterActions.onTaskCompletedDateChange],
    [TaskFilterActionNames.ON_METADATA_VALUE_CHANGE, TaskFilterActions.onMetadataValueChange],
    [TaskFilterActionNames.ON_METADATA_CODED_VALUE_CHANGE, TaskFilterActions.onMetadataCodedValueChange],
]);

export {TaskFilterActions, TaskFilterActionNames as Actions, TaskFilterActionMap}
