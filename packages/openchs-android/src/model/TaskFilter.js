import _ from "lodash";
import TaskFilterState from "../state/TaskFilterState";

class TaskFilter {
    taskType;
    taskStatuses;
    taskMetadataValues;
    taskCreatedDate;
    taskCompletedDate;

    static createNoCriteriaFilter(taskTypeType) {
        const taskFilter = new TaskFilter();
        taskFilter.taskType = {type: taskTypeType};
        taskFilter.taskStatuses = [];
        taskFilter.taskMetadataValues = {};
        return taskFilter;
    }

    static fromTaskFilterState(taskFilterState: TaskFilterState) {
        const taskFilter = new TaskFilter();
        taskFilter.taskType = taskFilterState.selectedTaskType;
        taskFilter.taskStatuses = taskFilterState.selectedTaskStatuses;
        taskFilter.taskMetadataValues = taskFilterState.taskMetadataValues;
        taskFilter.taskCreatedDate = taskFilterState.taskCreatedDate;
        taskFilter.taskCompletedDate = taskFilterState.taskCompletedDate;
        return taskFilter;
    }
}

export default TaskFilter;
