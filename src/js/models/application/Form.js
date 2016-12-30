import General from '../../utility/General';
import ResourceUtil from "../../utility/ResourceUtil";
import BaseEntity from '../BaseEntity';
import FormElementGroup from "./FormElementGroup";

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

    static fromResource(resource) {
        return General.assignFields(resource, new Form(), ["uuid", "name", "formType"]);
    }

    static associateChild(child, childEntityClass, childResource, entityService) {
        var form = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(childResource, "formUUID"), Form.schema.name);
        console.log(form);
        form = General.pick(form, ["uuid"], ["formElementGroups"]);

        if (childEntityClass === FormElementGroup)
            BaseEntity.addNewChild(child, form.formElementGroups);
        else
            throw `${childEntityClass.name} not support by ${Form.name}`;
        return form;
    }
}

export default Form;