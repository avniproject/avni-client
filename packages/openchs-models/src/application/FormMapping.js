import ResourceUtil from "../utility/ResourceUtil";
import Form from "./Form";
import General from "../utility/General";
import SubjectType from "../SubjectType";

class FormMapping {
    static schema = {
        name: 'FormMapping',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            form: 'Form',
            subjectType: 'SubjectType',
            entityUUID: {type: 'string', optional: true},
            observationsTypeEntityUUID: {type:'string', optional: true},
            voided: { type: 'bool', default: false }
        }
    };

    static create(uuid, form, entityUUID, observationsTypeEntityUUID) {
        let formMapping = new FormMapping();
        formMapping.uuid = uuid;
        formMapping.form = form;
        formMapping.entityUUID = entityUUID;
        formMapping.observationsTypeEntityUUID = observationsTypeEntityUUID;
        return formMapping;
    }

    static fromResource(resource, entityService) {
        const form = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "formUUID"), Form.schema.name);
        const subjectType = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "subjectTypeUUID"), SubjectType.schema.name);

        const formMapping = General.assignFields(resource, new FormMapping(), ["uuid", "voided"]);
        formMapping.entityUUID = ResourceUtil.getUUIDFor(resource, "entityUUID");
        formMapping.observationsTypeEntityUUID = ResourceUtil.getUUIDFor(resource, "observationsTypeEntityUUID");
        formMapping.form = form;
        formMapping.subjectType = subjectType;

        return formMapping;
    }
}

export default FormMapping;