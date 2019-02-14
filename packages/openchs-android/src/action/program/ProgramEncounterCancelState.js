import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import {ObservationsHolder, Form, ProgramEncounter} from "openchs-models";
import _ from "lodash";

class ProgramEncounterCancelState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, programEncounter, filteredFormElements) {
        super([], formElementGroup, wizard, false, filteredFormElements);
        this.programEncounter = programEncounter;
    }

    getEntity() {
        return this.programEncounter;
    }

    getEntityType() {
        return Form.formTypes.ProgramEncounterCancellation;
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [ProgramEncounter.validationKeys.CANCEL_LOCATION] : [];
    }

    static createOnLoad(programEncounter, form, formElementGroup, filteredFormElements) {
        let formElementGroupPageNumber = formElementGroup.displayOrder;
        return new ProgramEncounterCancelState(formElementGroup, new Wizard(form.numberOfPages, formElementGroupPageNumber, formElementGroupPageNumber), programEncounter, filteredFormElements);
    }

    clone() {
        return new ProgramEncounterCancelState(this.formElementGroup, this.wizard.clone(), this.programEncounter.cloneForEdit(), this.filteredFormElements);
    }

    get observationsHolder() {
        return new ObservationsHolder(this.programEncounter.cancelObservations);
    }

    validateEntity(context) {
        const validationResults = [];
        const locationValidation = this.validateLocation(
            this.programEncounter.cancelLocation,
            ProgramEncounter.validationKeys.CANCEL_LOCATION,
            context
        );
        validationResults.push(locationValidation);
        return validationResults;
    }

    getEffectiveDataEntryDate() {
        return this.programEncounter.cancelDateTime;
    }

    getNextScheduledVisits(ruleService, context) {
        return ruleService.getNextScheduledVisits(this.getEntity(), this.getEntityType());
    }
}

export default ProgramEncounterCancelState;