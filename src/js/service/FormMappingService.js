import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import FormMapping from "../models/application/FormMapping";
import _ from 'lodash';
import Form from '../models/application/Form';

@Service("FormMappingService")
class FormMappingService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getSchema() {
        return FormMapping.schema.name;
    }

    findForm(entity) {
        const formMapping = this.findByKey('entityUUID', entity.uuid);
        return formMapping.form;
    }

    findFormForProgramEnrolment(program) {
        const formMapping = this.findByCriteria(`entityUUID="${program.uuid}" AND form.formType="${Form.formTypes.ProgramEnrolment}"`);
        return formMapping.form;
    }
}

export default FormMappingService;