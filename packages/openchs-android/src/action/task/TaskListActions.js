import TaskService from "../../service/task/TaskService";

class TaskListActions {
    static getInitialState(context) {
        return {results: [], filter: null};
    }

    static onFilterApply(state, action, context) {
        const taskService = context.get(TaskService);
        const results = taskService.getFilteredTasks(action.filter);
        //remember filter
        return {results: results, filter: action.filter};
    }
}

const ActionPrefix = 'TaskList';

const TaskListActionNames = {
    ON_FILTER_APPLY: `${ActionPrefix}.ON_FILTER_APPLY`
};

const TaskListActionMap = new Map([
    [TaskListActionNames.ON_FILTER_APPLY, TaskListActions.onFilterApply]
]);

export {TaskListActions, TaskListActionNames as Actions, TaskListActionMap}
