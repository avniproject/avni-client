import TaskService from "../../service/task/TaskService";
import TaskFilter from "../../model/TaskFilter";
import TaskTypeService from "../../service/task/TaskTypeService";
import _ from 'lodash';

const createNewState = function (results, filter) {
    return {results: results, filter: filter, showTaskStatusChangeModal: false};
}

class TaskListActions {
    static getInitialState(context) {
        return {results: [], filter: TaskFilter.createEmpty()};
    }

    static onLoad(state, action, context) {
        const taskService = context.get(TaskService);
        const taskTypeService = context.get(TaskTypeService);

        const newState = {};
        newState.filter = action.filter;
        const taskTypes = taskTypeService.findAllByTaskType(action.filter.taskType.type);
        newState.filter.taskType = taskTypes[0];

        newState.results = taskService.getFilteredTasks(newState.filter);
        return newState;
    }

    static onFilterApply(state, action, context) {
        const taskService = context.get(TaskService);
        const results = taskService.getFilteredTasks(action.filter);
        return createNewState(results, action.filter);
    }

    static onRefresh(state, action, context) {
        const taskService = context.get(TaskService);
        const results = taskService.getFilteredTasks(state.filter);
        return createNewState(results, state.filter);
    }

    static onFilterClear(state, action, context) {
        const taskService = context.get(TaskService);
        const taskFilter = TaskFilter.createEmpty();
        taskFilter.taskType = action.taskType;
        const results = taskService.getFilteredTasks(taskFilter);
        return createNewState(results, taskFilter);
    }
    static onShowTaskStatusChangeModal(state, action, context) {
        console.log('getting action values', _.keys(action.task));
        return {
            ...state,
            showTaskStatusChangeModal: true,
            selectedTask: action.task
        };
    }

    static onHideTaskStatusChangeModal() {
        return {
            ...state,
            showTaskStatusChangeModal: false
        };
    }
}

const ActionPrefix = 'TaskList';

const TaskListActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_REFRESH: `${ActionPrefix}.ON_REFRESH`,
    ON_FILTER_APPLY: `${ActionPrefix}.ON_FILTER_APPLY`,
    ON_FILTER_CLEAR: `${ActionPrefix}.ON_FILTER_CLEAR`,
    ON_SHOW_TASK_STATUS_CHANGE_MODAL: `${ActionPrefix}.ON_SHOW_TASK_STATUS_CHANGE_MODAL`,
    ON_HIDE_TASK_STATUS_CHANGE_MODAL: `${ActionPrefix}.ON_HIDE_TASK_STATUS_CHANGE_MODAL`,
};

const TaskListActionMap = new Map([
    [TaskListActionNames.ON_LOAD, TaskListActions.onLoad],
    [TaskListActionNames.ON_REFRESH, TaskListActions.onRefresh],
    [TaskListActionNames.ON_FILTER_APPLY, TaskListActions.onFilterApply],
    [TaskListActionNames.ON_FILTER_CLEAR, TaskListActions.onFilterClear],
    [TaskListActionNames.ON_SHOW_TASK_STATUS_CHANGE_MODAL, TaskListActions.onShowTaskStatusChangeModal],
    [TaskListActionNames.ON_HIDE_TASK_STATUS_CHANGE_MODAL, TaskListActions.onHideTaskStatusChangeModal],
]);

export {TaskListActions, TaskListActionNames as Actions, TaskListActionMap}
