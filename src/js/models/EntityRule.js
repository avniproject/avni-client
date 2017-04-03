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

        return this.decisionFn(entity);
    }

    validate(entity) {
        if (_.isNil(this.validationFn)) return [];

        const validationResult = this.validationFn(entity);
        validationResult.formIdentifier = BaseEntity.fieldKeys.EXTERNAL_RULE;
        return validationResult;
    }
}

export default EntityRule;