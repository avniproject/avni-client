import {Form} from "openchs-models";
import EntityFactory from 'openchs-models/test/EntityFactory';

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