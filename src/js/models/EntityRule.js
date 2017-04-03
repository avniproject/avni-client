import _ from 'lodash';
import BaseEntity from './BaseEntity';

class EntityRule {
    constructor(ruleFile) {
        this.ruleFile = ruleFile;
    }

    setFunctions(exports) {
        if (!_.isNil(exports)) {
            this.decisionFn = exports.getDecision;
            this.validationFn = exports.validate;
        }
    }

    getDecision(entity) {
        if (_.isNil(this.decisionFn)) return [];

        const decisions = this.decisionFn(entity);
        if (_.isNil(decisions)) {
            console.log(`Validation rule didn't return anything for: ${entity.constructor.name}`);
            return [];
        } else if (_.isArray(decisions)) {
            console.log(`Validation didn't return an array for: ${entity.constructor.name}`);
            return [];
        }
        return decisions;
    }

    validate(entity) {
        if (_.isNil(this.validationFn)) return [];

        const validationResults = this.validationFn(entity);
        if (_.isNil(validationResults)) {
            console.log(`Validation rule didn't return anything for: ${entity.constructor.name}`);
            return [];
        } else if (_.isArray(validationResults)) {
            console.log(`Validation didn't return an array for: ${entity.constructor.name}`);
            return [];
        }

        validationResults.forEach((validationResult) => validationResult.formIdentifier = BaseEntity.fieldKeys.EXTERNAL_RULE);
        return validationResults;
    }
}

export default EntityRule;