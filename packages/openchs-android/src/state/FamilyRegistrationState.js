import AbstractDataEntryState from "./AbstractDataEntryState";
import Wizard from "./Wizard";
import _ from "lodash";
import {Family, ObservationsHolder, StaticFormElementGroup} from 'avni-models';

class FamilyRegistrationState extends AbstractDataEntryState {
    constructor(validationResults, formElementGroup, wizard, genders, family, isNewEntity, filteredFormElements, workLists) {
        super(validationResults, formElementGroup, wizard, isNewEntity, filteredFormElements, workLists);
        this.genders = genders;
        this.family = family;
    }

    getEntity() {
        return this.family;
    }

    getEntityType() {
        return Family.schema.name;
    }

    static createLoadState(form, genders, family) {
        const wizard = new Wizard(_.isNil(form) ? 1 : form.numberOfPages + 1, 2);
        const familyRegistrationState = new FamilyRegistrationState([], new StaticFormElementGroup(form), wizard, genders, family, true, []);
        familyRegistrationState.form = form;
        return familyRegistrationState;
    }

    clone() {
        const newState = new FamilyRegistrationState();
        newState.family = this.family.cloneForEdit();
        newState.form = this.form;
        super.clone(newState);
        return newState;
    }

    getWorkContext() {
        return {
            familyUUID: this.family.uuid,
        };
    }

    get observationsHolder() {
        return new ObservationsHolder(this.family.observations);
    }

    movePrevious() {
        this.wizard.movePrevious();
        this.formElementGroup = this.wizard.isNonFormPage() ?
            new StaticFormElementGroup(this.formElementGroup.form) :
            this.formElementGroup.previous();
    }

    get staticFormElementIds() {
        return this.wizard.isFirstPage() ? _.keys(Family.validationKeys) : [];
    }

    validateEntity() {
        return this.family.validate();
    }

    validateEntityAgainstRule(ruleService) {
        return ruleService.validateAgainstRule(this.family, this.formElementGroup.form, 'Family');
    }

    getEffectiveDataEntryDate() {
        return this.family.registrationDate;
    }
}

export default FamilyRegistrationState;