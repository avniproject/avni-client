import ResourceUtil from "../../utility/ResourceUtil";
import Form from "./Form";
import General from "../../utility/General";

class FormMapping {
    static schema = {
        name: 'FormMapping',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            form: 'Form',
            entityUUID: {type: 'string', optional: true}
        }
    };

    static fromResource(resource, entityService) {
        const form = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "formUUID"), Form.schema.name);

        const formMapping = General.assignFields(resource, new FormMapping(), ["uuid"]);
        formMapping.entityUUID = ResourceUtil.getUUIDFor(resource, "entityUUID");
        formMapping.form = form;

        return formMapping;
    }
}

export default FormMapping;