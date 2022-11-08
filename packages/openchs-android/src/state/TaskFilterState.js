import _ from "lodash";
import {Concept} from "openchs-models";

const initialiseTaskType = function(state, selectedTaskType, taskStatuses) {
    state.selectedTaskType = selectedTaskType;
    state.allTaskStatuses = taskStatuses;
    state.selectedTaskStatuses = [];
    state.taskMetadataValues = {};
    state.taskMetadataFields = selectedTaskType.metadataSearchFields;
    state.taskMetadataFields.forEach((x) => {
        state.taskMetadataValues[x.uuid] = (x.datatype === Concept.dataType.Coded) ? [] : null;
    });
    return state;
}

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
            taskMetadataFields: [...other.taskMetadataFields],
            taskMetadataValues: Object.assign({}, other.taskMetadataValues)
        };
    }

    static initialise(state, allTaskTypes, selectedTaskType, taskStatuses, datePickerMode) {
        state.allTaskTypes = allTaskTypes;
        state.datePickerMode = datePickerMode;

        initialiseTaskType(state, selectedTaskType, taskStatuses);
        return state;
    }

    static createEmptyState() {
        return {
            allTaskTypes: [],
            selectedTaskType: null,
            allTaskStatuses: [],
            selectedTaskStatuses: [],
            taskCreatedDate: null,
            taskCompletedDate: null,
            taskMetadataFields: [],
            taskMetadataValues: {}
        };
    }

    static changeMetadataCodedAnswer(state, concept, answerConcept) {
        const answers = state.taskMetadataValues[concept.uuid];
        if (_.remove(answers, (x) => x.uuid === answerConcept.uuid).length === 0)
            answers.push(answerConcept);
        return state;
    }

    static changeTaskType(state, taskType, taskStatuses) {
        return initialiseTaskType(state, taskType, taskStatuses);
    }

    static toggleTaskStatus(state, taskStatus) {
        if (_.remove(state.selectedTaskStatuses, (x) => x.uuid === taskStatus.uuid).length === 0)
            state.selectedTaskStatuses.push(taskStatus);
        return state;
    }
}

export default TaskFilterState;
