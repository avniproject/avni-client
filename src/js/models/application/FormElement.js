import ResourceUtil from "../../utility/ResourceUtil";
import FormElementGroup from './FormElementGroup';
import Concept from '../Concept';
import General from '../../utility/General';

class FormElement {
    static schema = {
        name: 'FormElement',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            name: 'string',
            displayOrder: 'int',
            mandatory: 'bool',
            keyValues: {type: 'list', objectType: 'KeyValue'},
            concept: 'Concept',
            usedInSummary: 'bool',
            generated: 'bool',
            formElementGroup: 'FormElementGroup'
        }
    };

    static fromResource(resource, entityService) {
        var formElementGroup = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "formElementGroupUUID"), FormElementGroup.schema.name);
        var concept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "conceptUUID"), Concept.schema.name);

        var formElement = General.assignFields(resource, new FormElement(), ["uuid", "name", "displayOrder", "mandatory", "usedInSummary", "generated", "concept"], [], ["keyValues"]);
        formElement.formElementGroup = formElementGroup;
        formElement.concept = concept;

        return formElement;
    }
}

export default FormElement;