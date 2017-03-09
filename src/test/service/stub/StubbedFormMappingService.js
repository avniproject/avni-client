import Form from "../../../js/models/application/Form";
import EntityFactory from '../../models/EntityFactory';

class StubbedFormMappingService {
    findFormForProgramEnrolment() {
        const form = Form.safeInstance();
        form.addFormElementGroup(EntityFactory.createSafeFormElementGroup(form));
        form.addFormElementGroup(EntityFactory.createSafeFormElementGroup(form));
        return form;
    }
}

export default StubbedFormMappingService;