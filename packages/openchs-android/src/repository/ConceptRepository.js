import RealmRepository from './RealmRepository';
import {Concept} from 'openchs-models';

class ConceptRepository extends RealmRepository {
    constructor(db) {
        super(db, Concept.schema.name);
    }

    findByName(conceptName) {
        const results = this.findAll().filtered('name = $0', conceptName);
        return results.length > 0 ? results[0] : null;
    }

    getAllWithMedia() {
        return this.getAllNonVoided().filtered('media.@size > 0');
    }
}

export default ConceptRepository;
