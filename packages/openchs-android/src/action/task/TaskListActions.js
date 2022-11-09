import TaskService from "../../service/task/TaskService";

class TaskListActions {
    static getInitialState(context) {
        return {results: [], filter: null};
    }

    static onLoad(state, action, context) {
        const taskService = context.get(TaskService);

        const newState = {};
        if (_.isNil(state.filter))
            newState.filter = action.filter;
        else
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
}

const ActionPrefix = 'TaskList';

const TaskListActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`,
    ON_REFRESH: `${ActionPrefix}.ON_REFRESH`,
    ON_FILTER_APPLY: `${ActionPrefix}.ON_FILTER_APPLY`
};

const TaskListActionMap = new Map([
    [TaskListActionNames.ON_LOAD, TaskListActions.onLoad],
    [TaskListActionNames.ON_REFRESH, TaskListActions.onRefresh],
    [TaskListActionNames.ON_FILTER_APPLY, TaskListActions.onFilterApply]
]);

export {TaskListActions, TaskListActionNames as Actions, TaskListActionMap}
