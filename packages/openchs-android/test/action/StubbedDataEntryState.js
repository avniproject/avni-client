import AbstractDataEntryState from "../../src/state/AbstractDataEntryState";
import {ObservationsHolder} from 'openchs-models';
import WorkListState from "../../src/state/WorkListState";
import WorkLists from "openchs-models/src/application/WorkLists";
import WorkList from "openchs-models/src/application/WorkList";

class StubbedDataEntryState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, observations, workLists) {
        super(validationResults, formElementGroup, wizard, false, formElementGroup.getFormElements());
        this.observations = observations;
        this.workListState = new WorkListState(workLists, ()=> ({}));
    }

    get observationsHolder() {
        return new ObservationsHolder(this.observations);
    }

    clone() {
        let newState = super.clone(new StubbedDataEntryState(this.validationResults, this.formElementGroup, this.wizard, this.observations));
        newState.workListState = this.workListState;
        return newState;
    }

    validateEntity() {
        return this.validationResults;
    }

    getEntity() {
        return this.observationsHolder;
    }

    getEntityType() {
        return 'Foo';
    }

    getNextScheduledVisits() {
        return [];
    }

    getEffectiveDataEntryDate() {
        return new Date();
    }
}

export default StubbedDataEntryState;