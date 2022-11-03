import _ from "lodash";

class TaskFilterState {
    allTaskTypes;
    selectedTaskType;
    allTaskStatuses;
    selectedTaskStatus;
    taskCreatedDate;
    taskCompletedDate;
    taskMetadataFields;

    static clone(other) {
        return Object.assign({}, other);
    }
}

export default TaskFilterState;
