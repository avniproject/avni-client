import _ from "lodash";
import {Concept} from "openchs-models";

const initialiseForTaskType = function(state, selectedTaskType, taskStatuses) {
    state.selectedTaskType = selectedTaskType;
    state.allTaskStatuses = taskStatuses;
    state.selectedTaskStatuses = [];
    state.taskMetadataFields = selectedTaskType.metadataSearchFields;
    state.taskMetadataValues = {};
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
    taskScheduledDate;
    taskCompletedDate;
    taskMetadataFields;
    taskMetadataValues;

    static clone(other) {
        return {
            allTaskTypes: other.allTaskTypes,
            selectedTaskType: other.selectedTaskType,
            allTaskStatuses: [...other.allTaskStatuses],
            selectedTaskStatuses: [...other.selectedTaskStatuses],
            taskScheduledDate: other.taskScheduledDate,
            taskCompletedDate: other.taskCompletedDate,
            taskMetadataFields: [...other.taskMetadataFields],
            taskMetadataValues: Object.assign({}, other.taskMetadataValues)
        };
    }

    static initialise(state, allTaskTypes, selectedTaskType, taskStatuses, datePickerMode) {
        state.allTaskTypes = allTaskTypes;
        state.datePickerMode = datePickerMode;

        return initialiseForTaskType(state, selectedTaskType, taskStatuses);
    }

    static isInitialised(state) {
        return state.allTaskTypes.length > 0;
    }

    static createEmptyState() {
        return {
            allTaskTypes: [],
            selectedTaskType: null,
            allTaskStatuses: [],
            selectedTaskStatuses: [],
            taskScheduledDate: null,
            taskCompletedDate: null,
            taskMetadataFields: [],
            taskMetadataValues: {}
        };
    }

    static changeMetadataCodedAnswer(state, concept, answerConceptUuid) {
        const answers = state.taskMetadataValues[concept.uuid];
        if (_.remove(answers, (x) => x.uuid === answerConceptUuid).length === 0)
            answers.push(concept.getAnswerWithConceptUuid(answerConceptUuid).concept);
        return state;
    }

    static changeTaskType(state, taskType, taskStatuses) {
        return initialiseForTaskType(state, taskType, taskStatuses);
    }

    static toggleTaskStatus(state, action) {
        if (_.remove(state.selectedTaskStatuses, (x) => x.uuid === action.taskStatus.uuid).length === 0)
            state.selectedTaskStatuses.push(action.taskStatus);
        return state;
    }

    static clear(state) {
        return initialiseForTaskType(state, state.selectedTaskType, state.allTaskStatuses);
    }
}

export default TaskFilterState;
