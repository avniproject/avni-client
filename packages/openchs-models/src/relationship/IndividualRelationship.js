import General from "../utility/General";
import ResourceUtil from "../utility/ResourceUtil";
import BaseEntity from "../BaseEntity";
import Individual from "../Individual";
import _ from "lodash";
import IndividualRelationshipType from "./IndividualRelationshipType";

class IndividualRelationship extends BaseEntity {
    static schema = {
        name: 'IndividualRelationship',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            relationship: 'IndividualRelationshipType',
            individualA: 'Individual',
            individualB: 'Individual',
            enterDateTime: {type: 'date', optional: true},
            exitDateTime: {type: 'date', optional: true},
            exitObservations: {type: 'list', objectType: 'Observation'},
            voided: {type: 'bool', default: false}
        }
    };

    static createEmptyInstance() {
        const individualRelationship = new IndividualRelationship();
        individualRelationship.uuid = General.randomUUID();
        individualRelationship.individualA = Individual.createEmptyInstance();
        individualRelationship.individualB = Individual.createEmptyInstance();
        individualRelationship.relationship = IndividualRelationshipType.createEmptyInstance();
        return individualRelationship;
    }


    get toResource() {
        const resource = _.pick(this, ["uuid"]);
        resource["individualAUUID"] = this.individualA.uuid;
        resource["individualBUUID"] = this.individualB.uuid;
        resource["relationshipTypeUUID"] = this.relationship.uuid;
        resource["voided"] = this.voided;
        resource.enterDateTime = General.isoFormat(this.enterDateTime);
        resource.exitDateTime = General.isoFormat(this.exitDateTime);

        return resource;
    }

    static fromResource(resource, entityService) {
        const relationshipType = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "relationshipTypeUUID"), IndividualRelationshipType.schema.name);
        const individualA = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "individualAUUID"), Individual.schema.name);
        const individualB = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "individualBUUID"), Individual.schema.name);

        const individualRelationship = General.assignFields(resource, new IndividualRelationship(), ["uuid", "voided"], ["enterDateTime", "exitDateTime"], [], entityService);
        individualRelationship.relationship = relationshipType;
        individualRelationship.individualA = individualA;
        individualRelationship.individualB = individualB;

        return individualRelationship;
    }

    static create(individualRelative, relationshipType) {
        const individualRelationship = IndividualRelationship.createEmptyInstance();
        individualRelationship.relationship = relationshipType;
        if(individualRelative.relation.uuid === relationshipType.individualBIsToARelation.uuid){
            individualRelationship.individualA = individualRelative.individual;
            individualRelationship.individualB = individualRelative.relative;
        } else {
            individualRelationship.individualB = individualRelative.individual;
            individualRelationship.individualA = individualRelative.relative;
        }
        return individualRelationship;
    }



    cloneForEdit() {
        const individualRelationship = new IndividualRelationship();
        individualRelationship.uuid = this.uuid;
        individualRelationship.relationship = this.relationship.clone();
        individualRelationship.enterDateTime = this.enterDateTime;
        individualRelationship.exitDateTime = this.exitDateTime;
        individualRelationship.individualA = this.individualA;
        individualRelationship.individualB = this.individualB;
        individualRelationship.voided = this.voided;
        return individualRelationship;
    }

}

export default IndividualRelationship;