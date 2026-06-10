import BaseService from "../BaseService";
import Service from "../../framework/bean/Service";
import {EntityQueue, IndividualRelationship} from 'avni-models';
import IndividualRelationshipTypeService from "./IndividualRelationshipTypeService";
import General from "../../utility/General";
import {IndividualRelative} from 'avni-models';
import EntityService from "../EntityService";
import {Individual} from 'avni-models';
import _ from "lodash";

@Service("individualRelationshipService")
class IndividualRelationshipService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return IndividualRelationship.schema.name;
    }

    getRelatives(individual) {
        const relationshipsWithIndividual = this.repository.findAll().filtered(`voided = false AND (individualA.uuid="${individual.uuid}" OR individualB.uuid="${individual.uuid}")`);
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

    addOrUpdateRelative(individualRelative) {
        const relatives = this.getRelatives(individualRelative.individual);
        const oldRelationWithRelative = relatives.filter(({relative}) => relative.uuid === individualRelative.relative.uuid);
        if (!_.isEmpty(oldRelationWithRelative)) {
            const oldRelation = oldRelationWithRelative[0];
            if (oldRelation.relation.uuid === individualRelative.relation.uuid) {
                return;
            }
            const voidedRelative = this.voidRelative(oldRelation);
            this.writeRecord(voidedRelative)
        }
        const relationshipType = this.getService(IndividualRelationshipTypeService).getRelationshipType(individualRelative);
        const individualRelationship = IndividualRelationship.create(individualRelative, relationshipType);
        this.writeRecord(individualRelationship);
    }

    deleteRelative(individualRelative) {
        const relationship = this.voidRelative(individualRelative);
        this.saveOrUpdate(relationship);
    }

    voidRelative(individualRelative) {
        General.logDebug('IndividualRelationshipService', 'Came to delete relative');
        const relationshipLoadedFromDb = this.findByUUID(individualRelative.relationshipUUID);
        const relationship = relationshipLoadedFromDb.cloneForEdit();
        relationship.voided = true;
        return relationship;
    }

    saveOrUpdate(relationship) {
        this.transactionManager.write(() => {
            this.writeRecord(relationship);
        });

        return relationship;
    }

    writeRecord(relationship) {
        const savedRelationship = this.repository.create(relationship, true);
        let individualA = this.getService(EntityService).findByUUID(relationship.individualA.uuid, Individual.schema.name);
        let individualB = this.getService(EntityService).findByUUID(relationship.individualB.uuid, Individual.schema.name);
        individualA.addRelationship(savedRelationship);
        individualB.addRelationship(savedRelationship);
        this.getRepository(Individual.schema.name).create(individualA, true);
        this.getRepository(Individual.schema.name).create(individualB, true);
        this.getRepository(EntityQueue.schema.name).create(EntityQueue.create(relationship, IndividualRelationship.schema.name));
        General.logDebug('IndividualRelationshipService', 'Saved IndividualRelationship');
    }

    findBySubject(subject) {
        if (_.isNil(subject)) {
            return [];
        }
        return this.getAll().filtered('individualA.uuid = $0 or individualB.uuid = $0', subject.uuid);
    }

}

export default IndividualRelationshipService;
