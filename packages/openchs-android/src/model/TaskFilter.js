import _ from "lodash";
import TaskFilterState from "../state/TaskFilterState";

class TaskFilter {
    taskType;
    taskStatuses;
    taskMetadataValues;
    taskCreatedDate;
    taskCompletedDate;

    static createEmpty() {
        const taskFilter = new TaskFilter();
        taskFilter.taskStatuses = [];
        taskFilter.taskMetadataValues = {};
        return taskFilter;
    }

    static createNoCriteriaFilter(taskTypeType) {
        const taskFilter = this.createEmpty();
        taskFilter.taskType = {type: taskTypeType};
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

    static getTaskMetadataDisplayValues(taskFilter: TaskFilter, I18n) {
        const displayItems = [];
        Object.keys(taskFilter.taskMetadataValues).forEach((uuid) => {
            const metadataConcept = taskFilter.taskType.getMetadataConcept(uuid);
            const taskMetadataValue = taskFilter.taskMetadataValues[uuid];
            if (metadataConcept.isCodedConcept())
                displayItems.push(...taskMetadataValue.map((x) => I18n.t(x.name)));
            else if (!_.isNil(taskMetadataValue))
                displayItems.push(taskMetadataValue);
        });
        return displayItems.join(", ");
    }
}

export default TaskFilter;
