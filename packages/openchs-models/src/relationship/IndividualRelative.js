import Individual from "../Individual";
import _ from "lodash";
import IndividualRelation from "./IndividualRelation";
import ValidationResult from "../application/ValidationResult";

class IndividualRelative {

    constructor(individual, relative, relation, relationshipUUID) {
        this.individual = individual;
        this.relative = relative;
        this.relation = relation;
        this.relationshipUUID = relationshipUUID;
    }

    static createEmptyInstance() {
        const individualRelative = new IndividualRelative();
        individualRelative.individual = Individual.createEmptyInstance();
        individualRelative.relative = Individual.createEmptyInstance();
        individualRelative.relation = IndividualRelation.createEmptyInstance();
        return individualRelative;
    }


    cloneForEdit() {
        const individualRelative = new IndividualRelative();
        individualRelative.relation = this.relation.clone();
        individualRelative.enterDateTime = this.enterDateTime;
        individualRelative.exitDateTime = this.exitDateTime;
        individualRelative.individual = this.individual;
        individualRelative.relative = this.relative.cloneForReference();
        individualRelative.relationshipUUID = this.relationshipUUID;
        return individualRelative;
    }

    validateFieldForEmpty(value, key) {
        if (value instanceof Date) {
            return _.isNil(value) ? ValidationResult.failure(key, 'emptyValidationMessage') : ValidationResult.successful(key);
        }
        return _.isEmpty(value) ? ValidationResult.failure(key, 'emptyValidationMessage') : ValidationResult.successful(key);
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