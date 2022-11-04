import _ from "lodash";

class TaskFilterState {
    allTaskTypes;
    selectedTaskType;
    allTaskStatuses;
    selectedTaskStatuses;
    taskCreatedDate;
    taskCompletedDate;
    taskMetadataFields;

    static clone(other) {
        return {
            allTaskTypes: other.allTaskTypes,
            selectedTaskType: other.selectedTaskType,
            allTaskStatuses: [...other.allTaskStatuses],
            selectedTaskStatuses: [...other.selectedTaskStatuses],
            taskCreatedDate: other.taskCreatedDate,
            taskCompletedDate: other.taskCompletedDate,
            taskMetadataFields: [...other.taskMetadataFields]
        };
    }
}

export default TaskFilterState;
