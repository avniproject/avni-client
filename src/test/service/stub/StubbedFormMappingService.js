import Form from "../../../js/models/application/Form";
import EntityFactory from '../../models/EntityFactory';
import EncounterType from "../../../js/models/EncounterType";

class StubbedFormMappingService {
    constructor(serviceData) {
        this.serviceData = serviceData;
    }

    findFormForProgramEnrolment() {
        const form = Form.safeInstance();
        form.addFormElementGroup(EntityFactory.createSafeFormElementGroup(form));
        form.addFormElementGroup(EntityFactory.createSafeFormElementGroup(form));
        return form;
    }

    findEncounterTypesForProgram(program) {
        return this.serviceData.programEncounterTypes;
    }
}

export default StubbedFormMappingService;