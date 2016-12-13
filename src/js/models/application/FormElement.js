import ResourceUtil from "../../utility/ResourceUtil";
import FormElementGroup from './FormElementGroup';
import General from '../../utility/General';

class FormElement {
    static schema = {
        name: 'FormElement',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            displayOrder: 'int',
            isMandatory: 'bool',
            keyValues: {type: 'list', objectType: 'KeyValue'},
            concept: 'Concept',
            usedInSummary: 'bool',
            isGenerated: 'bool',
            formElementGroup: 'FormElementGroup'
        }
    };

    static fromResource(resource, entityService) {
        var formElementGroup = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "formElementGroupUUID"), FormElementGroup.schema.name);

        var formElement = General.assignFields(resource, new FormElement(), ["uuid", "name", "displayOrder", "isMandatory", "usedInSummary", "isGenerated"], [], ["keyValues"]);
        formElement.formElementGroup = formElementGroup;

        return formElement;
    }
}

export default FormElement;