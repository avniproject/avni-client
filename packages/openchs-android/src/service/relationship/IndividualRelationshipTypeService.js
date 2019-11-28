import BaseService from "./../BaseService";
import Service from "../../framework/bean/Service";
import {IndividualRelationshipType} from 'avni-models';
import _ from 'lodash';
import IndividualRelationGenderMappingService from "./IndividualRelationGenderMappingService";
import General from "../../utility/General";

@Service("individualRelationshipTypeService")
class IndividualRelationshipService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return IndividualRelationshipType.schema.name;
    }


    isRelationshipTypeApplicable(relationshipType, possibleRelationsWithIndividual, relation){
        return _.some(possibleRelationsWithIndividual, (possibleRelation) =>
            (possibleRelation.uuid === relationshipType.individualAIsToBRelation.uuid && relation.uuid === relationshipType.individualBIsToARelation.uuid) || (possibleRelation.uuid === relationshipType.individualBIsToARelation.uuid && relation.uuid === relationshipType.individualAIsToBRelation.uuid));
    }

    getRelationshipType(individualRelative) {
        const relationshipTypes = this.db.objects(IndividualRelationshipType.schema.name).filtered(`individualAIsToBRelation.uuid="${individualRelative.relation.uuid}" OR individualBIsToARelation.uuid="${individualRelative.relation.uuid}"`);
        if (relationshipTypes.length === 1) {
            return relationshipTypes[0];
        }
        General.logDebug("IndividualRelationshipTypeService", "Attempting to determine relationshipType based on gender");
        const possibleRelationsWithIndividual = this.getService(IndividualRelationGenderMappingService).getRelationsForGender(individualRelative.individual.gender);
        const applicableRelationshipTypes = relationshipTypes
            .filter(rt => this.isRelationshipTypeApplicable(rt, possibleRelationsWithIndividual, individualRelative.relation));
        if (applicableRelationshipTypes.length === 1) {
            return applicableRelationshipTypes[0];
        }
        General.logDebug("IndividualRelationshipTypeService", applicableRelationshipTypes);
        throw Error(`Non determinate relationshipType`);
    }

}

export default IndividualRelationshipService;