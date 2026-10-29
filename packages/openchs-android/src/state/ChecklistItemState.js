import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import {AbstractEncounter, ObservationsHolder, ChecklistItem, StaticFormElementGroup, ValidationResult} from "avni-models";
import _ from "lodash";


class ChecklistItemState extends AbstractDataEntryState {
    constructor(formElementGroup, wizard, isNewEntity, checklistItem, filteredFormElements) {
        super([], formElementGroup, wizard, isNewEntity, filteredFormElements);
        if(!_.isNil(checklistItem)) {
            this.checklistItem = checklistItem.clone();
        }
    }

    static defaultCompletionDateToToday(state) {
        if (_.isNil(state.checklistItem.completionDate)) state.checklistItem.setCompletionDate(new Date());
        return state;
    }

    getEntity() {
        return this.checklistItem;
    }

    getEntityType() {
        return ChecklistItem.schema.name;
    }

    static createOnLoad(checklistItem, form, isNewEntity, formElementGroup, filteredFormElements) {
        let indexOfGroup = _.findIndex(form.getFormElementGroups(), (feg) => feg.uuid === formElementGroup.uuid) + 1;
        return ChecklistItemState.defaultCompletionDateToToday(new ChecklistItemState(formElementGroup, new Wizard(form.numberOfPages, indexOfGroup, indexOfGroup), isNewEntity, checklistItem, filteredFormElements));
    }

    static createOnLoadStateForEmptyForm(checklistItem, form, isNewEntity) {
        return ChecklistItemState.defaultCompletionDateToToday(new ChecklistItemState(new StaticFormElementGroup(form), new Wizard(1), isNewEntity, checklistItem, []));
    }

    clone() {
        return new ChecklistItemState(this.formElementGroup, this.wizard.clone(), this.isNewEntity, this.checklistItem.clone(), this.filteredFormElements);
    }

    get observationsHolder() {
        return new ObservationsHolder(this.checklistItem.observations);
    }

    validateEntity() {
        const completionDateKey = AbstractEncounter.fieldKeys.COMPLETION_DATE;
        const completionDateResult = _.isNil(this.checklistItem.completionDate) ?
            ValidationResult.failure(completionDateKey, "emptyValidationMessage") : ValidationResult.successful(completionDateKey);
        return [...(this.checklistItem.validate() || []), completionDateResult];
    }

    get staticFormElementIds() {
        return this.wizard.isFirstFormPage() ? [AbstractEncounter.fieldKeys.COMPLETION_DATE] : [];
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
