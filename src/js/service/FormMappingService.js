import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import Form from '../models/application/Form';

@Service("FormMappingService")
class FormMappingService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    findForm(formType, entityUUID) {
        if (formType === Form.formTypes.ProgramEnrolment)
            const forms = this.findAllByKey('formType', formType, Form.schema.name);
    }
}

export default FormMappingService;