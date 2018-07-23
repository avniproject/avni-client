import AbstractDataEntryState from "../../src/state/AbstractDataEntryState";
import {ObservationsHolder} from "openchs-models";

class StubbedDataEntryState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, observations) {
        super(validationResults, formElementGroup, wizard, false, formElementGroup.getFormElements());
        this.observations = observations;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.observations);
    }

    clone() {
        return super.clone(new StubbedDataEntryState(this.validationResults, this.formElementGroup, this.wizard, this.observations));
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

    getNextScheduledVisits(){
        return [];
    }
}

export default StubbedDataEntryState;