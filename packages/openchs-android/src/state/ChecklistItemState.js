import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import {AbstractEncounter, ObservationsHolder, ChecklistItem, StaticFormElementGroup} from "avni-models";
import _ from "lodash";


class ChecklistItemState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, isNewEntity, checklistItem, filteredFormElements) {
        super([], formElementGroup, wizard, isNewEntity, filteredFormElements);
        this.checklistItem = checklistItem.clone();
        this.checklistItem.setCompletionDate(_.isNil(this.checklistItem.completionDate) ? new Date() : this.checklistItem.completionDate);
    }

    getEntity() {
        return this.checklistItem;
    }

    getEntityType() {
        return ChecklistItem.schema.name;
    }

    static createOnLoad(checklistItem, form, isNewEntity, formElementGroup, filteredFormElements) {
        let indexOfGroup = _.findIndex(form.getFormElementGroups(), (feg) => feg.uuid === formElementGroup.uuid) + 1;
        return new ChecklistItemState(formElementGroup, new Wizard(form.numberOfPages, indexOfGroup, indexOfGroup), isNewEntity, checklistItem, filteredFormElements);
    }

    static createOnLoadStateForEmptyForm(checklistItem, form, isNewEntity) {
        return  new ChecklistItemState(new StaticFormElementGroup(form), new Wizard(1), isNewEntity, checklistItem, []);
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

    getChecklists(ruleService, context) {
        return ruleService.getChecklists(this.checklistItem, this.getEntityType(), [this.checklistItem.checklist]);
    }

    getEffectiveDataEntryDate() {
        return this.checklistItem.completionDate;
    }
}

export default ChecklistItemState;
