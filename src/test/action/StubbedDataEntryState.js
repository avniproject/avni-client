import AbstractDataEntryState from "../../js/state/AbstractDataEntryState";
import ObservationsHolder from "../../js/models/ObservationsHolder";

class StubbedDataEntryState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, observations) {
        super(validationResults, formElementGroup, wizard);
        this.observations = observations;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.observations);
    }

    clone() {
        return super.clone(new StubbedDataEntryState(this.validationResults, this.formElementGroup, this.wizard, this.observations));
    }
}

export default StubbedDataEntryState;