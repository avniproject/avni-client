import TaskService from "../../service/task/TaskService";
import TaskState from "../../state/TaskState";
import EntityService from "../../service/EntityService";
import {Task, TaskStatus} from 'avni-models';
import FormMappingService from "../../service/FormMappingService";
import _ from 'lodash';
import RuleEvaluationService from "../../service/RuleEvaluationService";
import ObservationsHolderActions from "../common/ObservationsHolderActions";

class TaskActions {
    static getInitialState(context) {
        return {};
    }

    static filterFormElements(formElementGroup, context, task) {
        let formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(task, Task.schema.name, formElementGroup);
        return formElementGroup.filterElements(formElementStatuses);
    };

    static onFormLoad(state, action, context) {
        const task = context.get(TaskService).findByUUID(action.taskUUID).cloneForEdit();
        const taskStatus = context.get(EntityService).findByUUID(action.statusUUID, TaskStatus.schema.name);
        task.setTaskStatus(taskStatus);
        const formMapping = context.get(FormMappingService).getTaskFormMapping(task.taskType);
        const form = formMapping.form;
        const firstGroupWithAtLeastOneVisibleElement = _.find(_.sortBy(form.nonVoidedFormElementGroups(), [function (o) {
            return o.displayOrder
        }]), (formElementGroup) => TaskActions.filterFormElements(formElementGroup, context, task).length !== 0);
        if (_.isNil(firstGroupWithAtLeastOneVisibleElement)) {
            return TaskState.createOnLoadStateForEmptyForm(task, form);
        }
        const formElementStatuses = context.get(RuleEvaluationService).getFormElementsStatuses(task, Task.schema.name, firstGroupWithAtLeastOneVisibleElement);
        const filteredElements = firstGroupWithAtLeastOneVisibleElement.filterElements(formElementStatuses);
        return TaskState.createOnLoadState(task, form, firstGroupWithAtLeastOneVisibleElement, filteredElements, formElementStatuses);
    }

    static onReScheduled(state, action, context) {
        const newState = TaskState.createEmptyFormOnLoad(action.task);
        newState.task.setScheduledOn(action.date);
        context.get(TaskService).saveOrUpdate(newState.task);
        return newState;
    }

    static onStatusChange(state, action, context) {
        const newState = TaskState.createEmptyFormOnLoad(action.task);
        const newStatus = context.get(EntityService).findByUUID(action.statusUUID, TaskStatus.schema.name);
        const formMapping = context.get(FormMappingService).getTaskFormMapping(newState.task.taskType);
        if (!newStatus.isTerminal || _.isNil(formMapping)) {
            newState.task.setTaskStatus(newStatus);
            context.get(TaskService).saveOrUpdate(newState.task);
        } else {
            action.moveToDetailsPage(newState.task.uuid, newStatus.uuid)
        }
        newState.displayTaskStatusSelector = false;
        return newState;
    }

    static onNext(state, action, context) {
        return state.clone().handleNext(action, context);
    }

    static onPrevious(state, action, context) {
        return state.clone().handlePrevious(action, context);
    }

    static onSave(state, action, context) {
        const newState = state.clone();
        context.get(TaskService).saveOrUpdate(newState.task);
        action.cb();
        return newState;
    }

    static toggleStatusSelector(state, action) {
        const newState = TaskState.createEmptyFormOnLoad(action.task);
        newState.displayTaskStatusSelector = action.display;
        return newState;
    }
}

const ActionPrefix = 'Task';

const TaskActionNames = {
    ON_FORM_LOAD: `${ActionPrefix}.ON_FORM_LOAD`,
    ON_RE_SCHEDULED: `${ActionPrefix}.ON_RE_SCHEDULED`,
    ON_STATUS_CHANGE: `${ActionPrefix}.ON_STATUS_CHANGE`,
    ON_STATUS_TOGGLE: `${ActionPrefix}.ON_STATUS_TOGGLE`,
    ON_PREVIOUS: `${ActionPrefix}.ON_PREVIOUS`,
    ON_NEXT: `${ActionPrefix}.ON_NEXT`,
    ON_SAVE: `${ActionPrefix}.ON_SAVE`,
    TOGGLE_MULTISELECT_ANSWER: `${ActionPrefix}.TOGGLE_MULTISELECT_ANSWER`,
    TOGGLE_SINGLESELECT_ANSWER: `${ActionPrefix}.TOGGLE_SINGLESELECT_ANSWER`,
    PRIMITIVE_VALUE_CHANGE: `${ActionPrefix}.PRIMITIVE_VALUE_CHANGE`,
    PRIMITIVE_VALUE_END_EDITING: `${ActionPrefix}.PRIMITIVE_VALUE_END_EDITING`,
    DATE_DURATION_CHANGE: `${ActionPrefix}.DATE_DURATION_CHANGE`,
    DURATION_CHANGE: `${ActionPrefix}.DURATION_CHANGE`,
    PHONE_NUMBER_CHANGE: `${ActionPrefix}.PHONE_NUMBER_CHANGE`,
    GROUP_QUESTION_VALUE_CHANGE: `${ActionPrefix}.GROUP_QUESTION_VALUE_CHANGE`,
    REPEATABLE_GROUP_QUESTION_VALUE_CHANGE: `${ActionPrefix}.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE`,
};

const TaskActionMap = new Map([
    [TaskActionNames.ON_FORM_LOAD, TaskActions.onFormLoad],
    [TaskActionNames.ON_RE_SCHEDULED, TaskActions.onReScheduled],
    [TaskActionNames.ON_STATUS_CHANGE, TaskActions.onStatusChange],
    [TaskActionNames.ON_STATUS_TOGGLE, TaskActions.toggleStatusSelector],
    [TaskActionNames.ON_PREVIOUS, TaskActions.onPrevious],
    [TaskActionNames.ON_NEXT, TaskActions.onNext],
    [TaskActionNames.ON_SAVE, TaskActions.onSave],
    [TaskActionNames.TOGGLE_MULTISELECT_ANSWER, ObservationsHolderActions.toggleMultiSelectAnswer],
    [TaskActionNames.TOGGLE_SINGLESELECT_ANSWER, ObservationsHolderActions.toggleSingleSelectAnswer],
    [TaskActionNames.PRIMITIVE_VALUE_CHANGE, ObservationsHolderActions.onPrimitiveObsUpdateValue],
    [TaskActionNames.PRIMITIVE_VALUE_END_EDITING, ObservationsHolderActions.onPrimitiveObsEndEditing],
    [TaskActionNames.DATE_DURATION_CHANGE, ObservationsHolderActions.onDateDurationChange],
    [TaskActionNames.DURATION_CHANGE, ObservationsHolderActions.onDurationChange],
    [TaskActionNames.PHONE_NUMBER_CHANGE, ObservationsHolderActions.onPhoneNumberChange],
    [TaskActionNames.GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onGroupQuestionChange],
    [TaskActionNames.REPEATABLE_GROUP_QUESTION_VALUE_CHANGE, ObservationsHolderActions.onRepeatableGroupQuestionChange],
]);


export {TaskActions, TaskActionNames, TaskActionMap}
