import TaskService from "../../service/task/TaskService";
import TaskFilter from "../../model/TaskFilter";
import TaskTypeService from "../../service/task/TaskTypeService";
import _ from 'lodash';

class TaskListActions {
    static getInitialState(context) {
        return {results: [], filter: TaskFilter.createEmpty()};
    }

    static onLoad(state, action, context) {
        const taskService = context.get(TaskService);
        const taskTypeService = context.get(TaskTypeService);

        const newState = {};
        const notInitialised = _.isEmpty(state.filter.taskStatuses);
        if (notInitialised) {
            newState.filter = action.filter;
            const taskTypes = taskTypeService.findAllByTaskType(action.filter.taskType.type);
            newState.filter.taskType = taskTypes[0];
        } else
            newState.filter = state.filter;

        newState.results = taskService.getFilteredTasks(newState.filter);
        return newState;
    }

    static onFilterApply(state, action, context) {
        const taskService = context.get(TaskService);
        const results = taskService.getFilteredTasks(action.filter);
        return {results: results, filter: action.filter};
    }

    static onRefresh(state, action, context) {
        const taskService = context.get(TaskService);
        const results = taskService.getFilteredTasks(state.filter);
        return {results: results, filter: state.filter};
    }

    static onFilterClear(state, action, context) {
        const taskService = context.get(TaskService);
        const taskTypeService = context.get(TaskTypeService);
        const taskTypes = taskTypeService.getAllNonVoided().map(_.identity);

        const taskFilter = TaskFilter.createEmpty();
        taskFilter.taskType = taskTypes[0];
        const results = taskService.getFilteredTasks(taskFilter);
        return {results: results, filter: taskFilter};
    }
}

const ActionPrefix = 'TaskList';

const TaskListActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_REFRESH: `${ActionPrefix}.ON_REFRESH`,
    ON_FILTER_APPLY: `${ActionPrefix}.ON_FILTER_APPLY`,
    ON_FILTER_CLEAR: `${ActionPrefix}.ON_FILTER_CLEAR`
};

const TaskListActionMap = new Map([
    [TaskListActionNames.ON_LOAD, TaskListActions.onLoad],
    [TaskListActionNames.ON_REFRESH, TaskListActions.onRefresh],
    [TaskListActionNames.ON_FILTER_APPLY, TaskListActions.onFilterApply],
    [TaskListActionNames.ON_FILTER_CLEAR, TaskListActions.onFilterClear]
]);

export {TaskListActions, TaskListActionNames as Actions, TaskListActionMap}
