import General from '../../utility/General';
import ResourceUtil from "../../utility/ResourceUtil";
import BaseEntity from '../BaseEntity';
import FormElementGroup from "./FormElementGroup";
import _ from 'lodash';

class Form {
    static schema = {
        name: 'Form',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            formType: 'string',
            name: 'string',
            formElementGroups: {type:'list', objectType: 'FormElementGroup'}
        }
    };

    static safeInstance() {
        const form = new Form();
        form.formElementGroups = [];
        return form;
    }

    static fromResource(resource) {
        return General.assignFields(resource, new Form(), ["uuid", "name", "formType"]);
    }

    static associateChild(child, childEntityClass, childResource, entityService) {
        var form = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "formUUID"), Form.schema.name);
        form = General.pick(form, ["uuid"], ["formElementGroups"]);

        if (childEntityClass === FormElementGroup)
            BaseEntity.addNewChild(child, form.formElementGroups);
        else
            throw `${childEntityClass.name} not support by ${Form.name}`;
        return form;
    }

    addFormElementGroup(formElementGroup) {
        formElementGroup.form = this;
        this.formElementGroups.push(formElementGroup);
    }

    formElementGroupAt(displayOrder) {
        return _.find(this.formElementGroups, (formElementGroup) => formElementGroup.displayOrder === displayOrder);
    }

    get numberOfPages() {
        return this.formElementGroups.length;
    }

    get firstFormElementGroup() {
        return this.formElementGroups.length === 0 ? null : this.formElementGroups[0];
    }

    findFormElement(formElementName) {
        var formElement;
        _.forEach(this.formElementGroups, (formElementGroup) => {
            const foundFormElement = _.find(formElementGroup.formElements, (formElement) => formElement.name === formElementName);
            if (!_.isNil(foundFormElement)) formElement = foundFormElement;
        });
        return formElement;
    }

    static formTypes = {
        IndividualProfile: 'IndividualProfile',
        Encounter: 'Encounter',
        ProgramEncounter: 'ProgramEncounter',
        ProgramEnrolment: 'ProgramEnrolment',
        ProgramExit: 'ProgramExit'
    };
}

export default Form;