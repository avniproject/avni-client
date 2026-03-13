import RealmRepository from './RealmRepository';
import {FormElement} from 'openchs-models';

class FormElementRepository extends RealmRepository {
    constructor(db) {
        super(db, FormElement.schema.name);
    }
}

export default FormElementRepository;
