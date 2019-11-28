import AbstractDataEntryState from "./AbstractDataEntryState";
import {ObservationsHolder} from 'avni-models';

class BeneficiaryIdentificationState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, observations = []) {
        super(validationResults, formElementGroup);
        this.observations = observations;
    }

    get observationsHolder() {
        return new ObservationsHolder(this.observations);
    }

    getEntity() {
        return this.observations;
    }

    getEntityType() {
    }

    clone() {
        const {observations, formElementGroup} = this;
        return Object.assign(super.clone(), {observations, formElementGroup});
    }
}

export default BeneficiaryIdentificationState;
