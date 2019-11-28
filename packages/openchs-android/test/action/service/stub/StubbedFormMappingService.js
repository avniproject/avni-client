import {Form} from 'avni-models';
import EntityFactory from "../../../EntityFactory";

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

    findRegistrationForm() {
        return Form.safeInstance();
    }

    findEncounterTypesForProgram(program) {
        return this.serviceData.programEncounterTypes;
    }
}

export default StubbedFormMappingService;