import {Form} from 'avni-models';
import EntityFactory from "../../../EntityFactory";
import StubbedBaseService from "./StubbedBaseService";

class StubbedFormMappingService extends StubbedBaseService {
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

    findActiveEncounterTypesForProgram(program){
        return this.serviceData.programEncounterTypes;
    }
}

export default StubbedFormMappingService;
