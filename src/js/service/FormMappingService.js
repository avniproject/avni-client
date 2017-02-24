import BaseService from "./BaseService";
import Service from "../framework/bean/Service";
import FormMapping from "../models/application/FormMapping";

@Service("FormMappingService")
class FormMappingService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    findForm(entity) {
        const formMapping = this.findByKey('entityUUID', entity.uuid, FormMapping.schema.name);
        return formMapping.form;
    }
}

export default FormMappingService;