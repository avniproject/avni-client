import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {EntityQueue, IndividualRelationship} from "openchs-models";
import IndividualRelationshipTypeService from "./IndividualRelationshipTypeService";
import General from "../../utility/General";
import IndividualRelative from "../../../../openchs-models/src/relationship/IndividualRelative";
import EntityService from "../EntityService";
import Individual from "../../../../openchs-models/src/Individual";

@Service("individualRelationshipService")
class IndividualRelationshipService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return IndividualRelationship.schema.name;
    }

    getRelatives(individual) {
        const relationshipsWithIndividual = this.db.objects(IndividualRelationship.schema.name).filtered(`voided = false AND (individualA.uuid="${individual.uuid}" OR individualB.uuid="${individual.uuid}")`);
        const relatives = [];
        relationshipsWithIndividual.forEach((relationship) => {
            if (relationship.individualA.uuid === individual.uuid) {
                relatives.push(new IndividualRelative(individual, relationship.individualB, relationship.relationship.individualBIsToARelation, relationship.uuid));
            } else {
                relatives.push(new IndividualRelative(individual, relationship.individualA, relationship.relationship.individualAIsToBRelation, relationship.uuid));
            }
        });
        return relatives;

    }

    addRelative(individualRelative) {
        General.logDebug('IndividualRelationshipService', 'Came to add relative');
        const relationshipType = this.getService(IndividualRelationshipTypeService).getRelationshipType(individualRelative);
        const individualRelationship = IndividualRelationship.create(individualRelative, relationshipType);
        this.saveOrUpdate(individualRelationship);
    }

    deleteRelative(individualRelative) {
        General.logDebug('IndividualRelationshipService', 'Came to delete relative');
        const relationshipLoadedFromDb = this.findByUUID(individualRelative.relationshipUUID);
        const relationship = relationshipLoadedFromDb.cloneForEdit();
        relationship.voided = true;
        this.saveOrUpdate(relationship);
    }

    saveOrUpdate(relationship) {
        const db = this.db;
        this.db.write(() => {
            const savedRelationship = db.create(IndividualRelationship.schema.name, relationship, true);
            let individualA = this.getService(EntityService).findByUUID(relationship.individualA.uuid, Individual.schema.name);
            let individualB = this.getService(EntityService).findByUUID(relationship.individualB.uuid, Individual.schema.name);
            individualA.addRelationship(savedRelationship);
            individualB.addRelationship(savedRelationship);
            db.create(EntityQueue.schema.name, EntityQueue.create(relationship, IndividualRelationship.schema.name));
            General.logDebug('IndividualRelationshipService', 'Saved IndividualRelationship');
        });

        return relationship;
    }
}

export default IndividualRelationshipService;