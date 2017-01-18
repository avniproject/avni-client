import _ from "lodash";
import ResourceUtil from '../../utility/ResourceUtil';
import Form from './Form';

class FormMapping {
    static schema = {
        name: 'FormMapping',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            form: 'Form',
            relatedEntity: 'string'
        }
    };

    static fromResource(resource, entityService) {
        var form = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "formUUID"), Form.schema.name);
        var programEnrolment = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "programEnrolmentUUID"), ProgramEnrolment.schema.name);

        var programEncounter = General.assignFields(resource, new ProgramEncounter(), ["uuid"], ["scheduledDateTime", "actualDateTime"], ["observations"]);
        programEncounter.followupType = form;
        programEncounter.programEnrolment = programEnrolment;

        return programEncounter;
    }
}

export default FormMapping;