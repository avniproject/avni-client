import ResourceUtil from "../../utility/ResourceUtil";
import FormElementGroup from "./FormElementGroup";
import Concept from "../Concept";
import General from "../../utility/General";

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
        const formElementGroup = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "formElementGroupUUID"), FormElementGroup.schema.name);
        const concept = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "conceptUUID"), Concept.schema.name);

        const formElement = General.assignFields(resource, new FormElement(), ["uuid", "name", "displayOrder", "mandatory", "usedInSummary", "generated"], []);
        formElement.formElementGroup = formElementGroup;
        formElement.concept = concept;

        //remove orphan keyValues (because KeyValue doesn't have primary key
        entityService.deleteObjects(resource["uuid"], FormElement.schema.name);
        formElement.keyValues = eval(resource["keyValues"]);

        return formElement;
    }

    static keys = {
        Select: 'MultiSelect'
    };

    static values = {
        Single: 'Single',
        Multi: 'Multi'
    }
}

export default FormElement;