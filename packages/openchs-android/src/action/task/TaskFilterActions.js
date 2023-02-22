import EntityService from "../../service/EntityService";
import {TaskType} from 'openchs-models';
import TaskFilterState from "../../state/TaskFilterState";
import TaskStatusService from "../../service/task/TaskStatusService";
import UserInfoService from "../../service/UserInfoService";
import _ from "lodash";

class TaskFilterActions {
    static getInitialState(context) {
        return TaskFilterState.createEmptyState();
    }

    static onLoad(state, action, context) {
        const newState = TaskFilterState.clone(state);

        if (!_.isNil(newState.selectedTaskType) && newState.selectedTaskType.uuid === action.taskType.uuid) {
            return newState;
        }

        const entityService = context.get(EntityService);
        const taskStatusService = context.get(TaskStatusService);
        const userInfoService = context.get(UserInfoService);
        const userSettings = userInfoService.getUserSettingsObject();

        const allTaskTypes = entityService.loadAllNonVoided(TaskType.schema.name);
        const taskStatuses = taskStatusService.getAllForTaskType(action.taskType);
        return TaskFilterState.initialise(newState, allTaskTypes, action.taskType, taskStatuses, userSettings.datePickerMode);
    }

    static onTaskTypeChange(state, action, context) {
        const {taskType} = action;
        const taskStatusService = context.get(TaskStatusService);

        const newState = TaskFilterState.clone(state);
        const taskStatuses = taskStatusService.getAllForTaskType(taskType);
        return TaskFilterState.changeTaskType(newState, taskType, taskStatuses);
    }

    static onTaskStatusChange(state, action, context) {
        const newState = TaskFilterState.clone(state);
        return TaskFilterState.toggleTaskStatus(newState, action);
    }

    static onTaskScheduledDateChange(state, action, context) {
        const newState = TaskFilterState.clone(state);
        newState.taskScheduledDate = action.value;
        return newState;
    }

    static onTaskCompletedDateChange(state, action, context) {
        const newState = TaskFilterState.clone(state);
        newState.taskCompletedDate = action.value;
        return newState;
    }

    static onMetadataValueChange(state, action, context) {
        const newState = TaskFilterState.clone(state);
        newState.taskMetadataValues[action.concept.uuid] = action.value;
        return newState;
    }

    static onMetadataCodedValueChange(state, action, context) {
        const newState = TaskFilterState.clone(state);
        return TaskFilterState.changeMetadataCodedAnswer(newState, action.concept, action.chosenAnswerConceptUuid);
    }

    static onClear(state, action, context) {
        const newState = TaskFilterState.clone(state);
        newState.selectedTaskType = action.taskType;
        return TaskFilterState.clear(newState);
    }
}

const ActionPrefix = 'TaskFilter';

const TaskFilterActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_TASK_TYPE_CHANGE: `${ActionPrefix}.ON_TASK_TYPE_CHANGE`,
    ON_TASK_STATUS_CHANGE: `${ActionPrefix}.ON_TASK_STATUS_CHANGE`,
    ON_TASK_SCHEDULED_DATE_CHANGE: `${ActionPrefix}.ON_TASK_SCHEDULED_DATE_CHANGE`,
    ON_TASK_COMPLETED_DATE_CHANGE: `${ActionPrefix}.ON_TASK_COMPLETED_DATE_CHANGE`,
    ON_METADATA_VALUE_CHANGE: `${ActionPrefix}.ON_METADATA_VALUE_CHANGE`,
    ON_METADATA_CODED_VALUE_CHANGE: `${ActionPrefix}.ON_METADATA_CODED_VALUE_CHANGE`,
    ON_CLEAR: `${ActionPrefix}.ON_FILTER_CLEAR`
};

const TaskFilterActionMap = new Map([
    [TaskFilterActionNames.ON_LOAD, TaskFilterActions.onLoad],
    [TaskFilterActionNames.ON_TASK_TYPE_CHANGE, TaskFilterActions.onTaskTypeChange],
    [TaskFilterActionNames.ON_TASK_STATUS_CHANGE, TaskFilterActions.onTaskStatusChange],
    [TaskFilterActionNames.ON_TASK_SCHEDULED_DATE_CHANGE, TaskFilterActions.onTaskScheduledDateChange],
    [TaskFilterActionNames.ON_TASK_COMPLETED_DATE_CHANGE, TaskFilterActions.onTaskCompletedDateChange],
    [TaskFilterActionNames.ON_METADATA_VALUE_CHANGE, TaskFilterActions.onMetadataValueChange],
    [TaskFilterActionNames.ON_METADATA_CODED_VALUE_CHANGE, TaskFilterActions.onMetadataCodedValueChange],
    [TaskFilterActionNames.ON_CLEAR, TaskFilterActions.onClear]
]);

export {TaskFilterActions, TaskFilterActionNames as Actions, TaskFilterActionMap}
