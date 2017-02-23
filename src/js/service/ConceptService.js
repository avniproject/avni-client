import BaseService from "./BaseService.js";
import Service from "../framework/bean/Service";
import Concept from "../models/Concept";
import MessageService from "./MessageService";

@Service("conceptService")
class ConceptService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.saveConcept = this.saveConcept.bind(this);
        this.getConceptByUUID = this.getConceptByUUID.bind(this);
    }

    getSchema() {
        return Concept.schema.name;
    }

    getConceptByUUID(conceptUUID) {
        return this.db.objectForPrimaryKey(Concept.schema.name, conceptUUID);
    }

    getAllConcepts() {
        return this.db.objects(Concept.schema.name);
    }

    getConceptByName(conceptName) {
        return this.db.objects(Concept.schema.name).filtered(`name = \"${conceptName}\"`)[0];
    }

    saveConcept(concept) {
        const db = this.db;
        this.db.write(() => db.create(Concept.schema.name, concept, true));
        return concept;
    }
}

export default ConceptService;