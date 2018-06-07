import General from "./utility/General";
import ResourceUtil from "./utility/ResourceUtil";
import BaseEntity from "./BaseEntity";
import Individual from "./Individual";
import _ from "lodash";
import IndividualRelation from "./IndividualRelation";
import ValidationResult from "./application/ValidationResult";

class IndividualRelative extends BaseEntity {
    static schema = {
        name: 'IndividualRelative',
        primaryKey: 'uuid',
        properties: {
            uuid: 'string',
            relation: 'IndividualRelation',
            individual: 'Individual',
            relative: 'Individual',
            enterDateTime: {type: 'date', optional: true},
            exitDateTime: {type: 'date', optional: true}
        }
    };

    static createEmptyInstance() {
        const individualRelative = new IndividualRelative();
        individualRelative.uuid = General.randomUUID();
        individualRelative.individual = Individual.createEmptyInstance();
        individualRelative.relative = Individual.createEmptyInstance();
        individualRelative.relation = IndividualRelation.createEmptyInstance();
        return individualRelative;
    }


    get toResource() {
        const resource = _.pick(this, ["uuid"]);
        resource["relationUUID"] = this.relation.uuid;
        resource.enterDateTime = General.isoFormat(this.enterDateTime);
        resource.exitDateTime = General.isoFormat(this.exitDateTime);
        resource["individualUUID"] = this.individual.uuid;
        resource["relativeIndividualUUID"] = this.relative.uuid;
        return resource;
    }

    static fromResource(resource, entityService) {
        const relation = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "relationUUID"), IndividualRelation.schema.name);
        const individual = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "individualUUID"), Individual.schema.name);
        const relative = entityService.findByKey("uuid", ResourceUtil.getUUIDFor(resource, "relativeIndividualUUID"), Individual.schema.name);

        const individualRelative = General.assignFields(resource, new IndividualRelative(), ["uuid"], ["enterDateTime", "exitDateTime"], [], entityService);
        individualRelative.relation = relation;
        individualRelative.individual = individual;
        individualRelative.relative = relative;

        return individualRelative;
    }


    cloneForEdit() {
        const individualRelative = new IndividualRelative();
        individualRelative.uuid = this.uuid;
        individualRelative.relation = this.relation.clone();
        individualRelative.enterDateTime = this.enterDateTime;
        individualRelative.exitDateTime = this.exitDateTime;
        individualRelative.individual = this.individual;
        individualRelative.relative = this.relative.cloneForReference();
        return individualRelative;
    }

    static validationKeys = {
        RELATIVE: 'RELATIVE',
        RELATION: 'RELATION',
        INDIVIDUAL: 'INDIVIDUAL',
    };

    validateRelative() {
        const emptyValidation = this.validateFieldForEmpty(this.relative.name, IndividualRelative.validationKeys.RELATIVE);
        if(!emptyValidation.success) return emptyValidation;
        return this.relative.uuid === this.individual.uuid ? new ValidationResult(false, IndividualRelative.validationKeys.RELATIVE, 'selfRelationshipNotAllowed') : emptyValidation;
    }

    validateIndividual() {
        return this.validateFieldForEmpty(this.individual.name, IndividualRelative.validationKeys.INDIVIDUAL);
    }

    validateRelation() {
        return this.validateFieldForEmpty(this.relation.name, IndividualRelative.validationKeys.RELATION);
    }

    validate() {
        const validationResults = [];
        validationResults.push(this.validateRelative());
        validationResults.push(this.validateIndividual());
        validationResults.push(this.validateRelation());
        if (!_.isNil(this.relative) && !_.isNil(this.relation)
            && _.some(this.individual.relatives, (relative) => relative.relative.uuid === this.relative.uuid && relative.relation.uuid === this.relation.uuid)) {
            validationResults.push(new ValidationResult(false, IndividualRelative.validationKeys.RELATIVE, 'relationshipAlreadyRecorded'));
            validationResults.push(new ValidationResult(false, IndividualRelative.validationKeys.RELATION, 'relationshipAlreadyRecorded'));
        }
        return validationResults;
    }


}

export default IndividualRelative;