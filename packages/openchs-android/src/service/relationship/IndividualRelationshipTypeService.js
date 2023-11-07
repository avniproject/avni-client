import BaseService from "./../BaseService";
import Service from "../../framework/bean/Service";
import {IndividualRelationshipType} from 'avni-models';
import _ from 'lodash';
import IndividualRelationGenderMappingService from "./IndividualRelationGenderMappingService";
import General from "../../utility/General";
import {AlertMessage} from "../../views/common/AlertMessage";

function logAlertAndThrowError(applicableRelationshipTypes, title, message) {
    General.logDebug("IndividualRelationshipTypeService", applicableRelationshipTypes);
    AlertMessage(title, message);
    throw Error(title);
}

@Service("individualRelationshipTypeService")
class IndividualRelationshipService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    getSchema() {
        return IndividualRelationshipType.schema.name;
    }


    isRelationshipTypeApplicable(relationshipType, possibleRelationsWithIndividual, relation) {
        return _.some(possibleRelationsWithIndividual, (possibleRelation) =>
            (possibleRelation.uuid === relationshipType.individualAIsToBRelation.uuid && relation.uuid === relationshipType.individualBIsToARelation.uuid) || (possibleRelation.uuid === relationshipType.individualBIsToARelation.uuid && relation.uuid === relationshipType.individualAIsToBRelation.uuid));
    }

    getRelationshipType(individualRelative) {
        const relationshipTypes = this.db.objects(IndividualRelationshipType.schema.name)
            .filtered(`voided=false`)
            .filtered(`individualAIsToBRelation.uuid="${individualRelative.relation.uuid}" OR individualBIsToARelation.uuid="${individualRelative.relation.uuid}"`);
        General.logDebug("IndividualRelationshipTypeService", "Attempting to determine relationshipType based on gender");
        const possibleRelationsWithIndividual = this.getService(IndividualRelationGenderMappingService).getRelationsForGender(individualRelative.individual.gender);
        const applicableRelationshipTypes = relationshipTypes
            .filter(rt => this.isRelationshipTypeApplicable(rt, possibleRelationsWithIndividual, individualRelative.relation));
        if (applicableRelationshipTypes.length === 1) {
            return applicableRelationshipTypes[0];
        } else if (applicableRelationshipTypes.length < 1) {
            logAlertAndThrowError(applicableRelationshipTypes,
              `Unsupported Relationship Type`,
              `If needed, create relationshipType "${individualRelative.relation.name}" for individual with gender "${individualRelative.individual.gender.name}"`);

        } else if (applicableRelationshipTypes.length > 1) {
            logAlertAndThrowError(applicableRelationshipTypes,
              `Non determinate Relationship Type`,
              `Please delete or correct relationshipTypes "${individualRelative.relation.name}" for individual with gender "${individualRelative.individual.gender.name}"`);
        }
    }
}

export default IndividualRelationshipService;
