import AbstractDataEntryState from "./AbstractDataEntryState";
import _ from "lodash";
import {StaticFormElementGroup, Task, ObservationsHolder} from 'avni-models';
import Wizard from "./Wizard";

class TaskState extends AbstractDataEntryState {
    constructor(task, validationResults, formElementGroup, wizard, filteredFormElements) {
        super(validationResults, formElementGroup, wizard, false, filteredFormElements);
        this.task = task;
        this.displayTaskStatusSelector = false;
        this.taskStatusList = [];
        this.displayProgressIndicator = false;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.task.observations);
    }

    get staticFormElementIds() {
        return [];
    }

    static createOnLoadState(task, form, formElementGroup, filteredFormElements, formElementStatuses) {
        const indexOfGroup = _.findIndex(form.getFormElementGroups(), (feg) => feg.uuid === formElementGroup.uuid) + 1;
        const state = new TaskState(task, [], formElementGroup, new Wizard(form.numberOfPages, indexOfGroup, indexOfGroup), filteredFormElements);
        state.observationsHolder.updatePrimitiveCodedObs(filteredFormElements, formElementStatuses);
        return state;
    }

    static createOnLoadStateForEmptyForm(task, form) {
        return new TaskState(task, [], new StaticFormElementGroup(form), new Wizard(1), []);
    }

    static createEmptyFormOnLoad(task) {
        return new TaskState(task.cloneForEdit());
    }

    static createEmptyState() {
        return new TaskState();
    }

    getEntity() {
        return this.task;
    }

    getEntityType() {
        return Task.schema.name;
    }

    clone() {
        const newState = new TaskState();
        newState.task = _.isNil(this.task) ? this.task : this.task.cloneForEdit();
        newState.displayTaskStatusSelector = this.displayTaskStatusSelector;
        newState.taskStatusList = this.taskStatusList;
        newState.displayProgressIndicator = this.displayProgressIndicator;
        super.clone(newState);
        return newState;
    }

    validateEntity(context) {
        return [];
    }

    getEffectiveDataEntryDate() {
        return this.task.completedOn;
    }

}


export default TaskState;
