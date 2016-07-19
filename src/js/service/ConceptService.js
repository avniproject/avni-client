import BaseService from './BaseService.js'
import Service from '../framework/bean/Service';
import {Concept} from '../models/Concept';
import _ from 'lodash';

@Service("conceptService")
class ConceptService extends BaseService {
    constructor(db) {
        super(db);
        this.saveConcept = this.saveConcept.bind(this);
        this.getConceptByUUID = this.getConceptByUUID.bind(this);
    }

    getConceptByUUID(conceptUUID) {
        return _.merge({}, this.db.objectForPrimaryKey(Concept.schema.name, conceptUUID));
    }

    getConceptByName(conceptName) {
        return _.merge({}, this.db.objects(Concept.schema.name).filtered(`name = \"${conceptName}\"`)[0]);
    }

    saveConcept(concept) {
        const db = this.db;
        this.db.write(()=> db.create(Concept.schema.name, concept, true));
    }
}

export default ConceptService;