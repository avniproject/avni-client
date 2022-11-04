import EntityService from "../../service/EntityService";
import {TaskStatus, TaskType} from 'openchs-models';
import TaskFilterState from "../../state/TaskFilterState";
import TaskStatusService from "../../service/task/TaskStatusService";
import UserInfoService from "../../service/UserInfoService";
import _ from "lodash";

class TaskFilterActions {
    static getInitialState(context) {
        return {
            allTaskTypes: [],
            selectedTaskType: null,
            allTaskStatuses: [],
            selectedTaskStatuses: [],
            taskCreatedDate: null,
            taskCompletedDate: null,
            taskMetadataFields: []
        };
    }

    static onLoad(state, action, context) {
        const entityService = context.get(EntityService);
        const taskStatusService = context.get(TaskStatusService);
        const userInfoService = context.get(UserInfoService);
        const userSettings = userInfoService.getUserSettingsObject();

        const newState = TaskFilterState.clone(state);
        newState.allTaskTypes = entityService.getAllNonVoided(TaskType.schema.name).map(_.identity);
        newState.selectedTaskType = newState.allTaskTypes[0];
        newState.allTaskStatuses = taskStatusService.getAllForTaskType(newState.selectedTaskType);
        newState.selectedTaskStatuses = [];
        newState.taskMetadataFields = newState.selectedTaskType.metadataSearchFields;
        newState.datePickerMode = userSettings.datePickerMode;
        return newState;
    }
}

const ActionPrefix = 'TaskFilter';

const TaskFilterActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_TASK_CREATED_DATE_CHANGE: `${ActionPrefix}.ON_TASK_CREATED_DATE_CHANGE`,
    ON_TASK_COMPLETED_DATE_CHANGE: `${ActionPrefix}.ON_TASK_COMPLETED_DATE_CHANGE`
};

const TaskFilterActionMap = new Map([
    [TaskFilterActionNames.ON_LOAD, TaskFilterActions.onLoad],
]);

export {TaskFilterActions, TaskFilterActionNames as Actions, TaskFilterActionMap}
