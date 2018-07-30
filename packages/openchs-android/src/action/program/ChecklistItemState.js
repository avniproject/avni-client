import AbstractDataEntryState from "../../state/AbstractDataEntryState";
import Wizard from "../../state/Wizard";
import {AbstractEncounter, ObservationsHolder, ChecklistItem} from "openchs-models";


class ChecklistItemState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, isNewEntity, checklistItem, filteredFormElements) {
        super([], formElementGroup, wizard, isNewEntity, filteredFormElements);
        this.checklistItem = checklistItem;
    }

    getEntity() {
        return this.checklistItem;
    }

    getEntityType() {
        return ChecklistItem.schema.name;
    }

    static createOnLoad(checklistItem, form, isNewEntity, formElementGroup, filteredFormElements) {
        const formElementGroupPageNumber = formElementGroup.displayOrder;
        return new ChecklistItemState(formElementGroup, new Wizard(form.numberOfPages, formElementGroupPageNumber, formElementGroupPageNumber), isNewEntity, checklistItem, filteredFormElements);
    }

    clone() {
        return new ChecklistItemState(this.formElementGroup, this.wizard.clone(), this.isNewEntity, this.checklistItem.clone(), this.filteredFormElements);
    }

    get observationsHolder() {
        return new ObservationsHolder(this.checklistItem.observations);
    }

    validateEntity() {
        return this.checklistItem.validate();
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? [AbstractEncounter.fieldKeys.COMPLETION_DATE] : [];
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.checklistItem, this.formElementGroup.form, ChecklistItem.schema.name);
    }

    executeRule(ruleService, context) {
        return [];
    }

    getNextScheduledVisits(ruleService, context) {
        return null;
    }

    getEffectiveDataEntryDate() {
        return this.checklistItem.completionDate;
    }
}

export default ChecklistItemState;