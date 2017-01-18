import General from '../../utility/General';
import ResourceUtil from "../../utility/ResourceUtil";
import Form from './Form';
import BaseEntity from '../BaseEntity';
import FormElement from "./FormElement";

class FormElementGroup {
    static schema = {
        name: 'FormElementGroup',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            displayOrder: 'int',
            formElements: {type: 'list', objectType: 'FormElement'},
            form: 'Form'
        }
    };

    static fromResource(resource, entityService) {
        const formElementGroup = General.assignFields(resource, new FormElementGroup(), ["uuid", "name", "displayOrder"]);
        formElementGroup.form = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "formUUID"), Form.schema.name);
        return formElementGroup;
    }

    static associateChild(child, childEntityClass, childResource, entityService) {
        var formElementGroup = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "formElementGroupUUID"), FormElementGroup.schema.name);
        formElementGroup = General.pick(formElementGroup, ["uuid"], ["formElements"]);

        if (childEntityClass === FormElement)
            BaseEntity.addNewChild(child, formElementGroup.formElements);
        else
            throw `${childEntityClass.name} not support by ${FormElementGroup.name}`;
        return formElementGroup;
    }
}

export default FormElementGroup;