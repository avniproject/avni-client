import ReportCardService from "../../service/customDashboard/ReportCardService";

class TaskListActions {
    static getInitialState(context) {
        return {results: null};
    }

    static onLoad(state, action, context) {
        const reportCardService = context.get(ReportCardService);
        const results = reportCardService.getResultForTaskCardType(action.taskTypeType);
        return {results: results};
    }
}

const ActionPrefix = 'TaskList';

const TaskListActionNames = {
    ON_LOAD: `${ActionPrefix}.ON_LOAD`
};

const TaskListActionMap = new Map([
    [TaskListActionNames.ON_LOAD, TaskListActions.onLoad]
]);

export {TaskListActions, TaskListActionNames as Actions, TaskListActionMap}
