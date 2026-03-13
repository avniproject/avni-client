import RealmRepository from './RealmRepository';
import {Gender} from 'openchs-models';

class GenderRepository extends RealmRepository {
    constructor(db) {
        super(db, Gender.schema.name);
    }
}

export default GenderRepository;
