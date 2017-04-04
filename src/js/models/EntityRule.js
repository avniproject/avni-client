import _ from 'lodash';
import BaseEntity from './BaseEntity';

class EntityRule {
    constructor(ruleFile) {
        this.ruleFile = ruleFile;
    }

    setFunctions(exports) {
        if (!_.isNil(exports)) {
            this.decisionFn = exports.getDecisions;
            this.validationFn = exports.validate;
            this.getNextScheduledVisitsFn = exports.getNextScheduledVisitsFn;
        }
    }

    getDecisions(entity) {
        return this._safeInvokeRule(this.decisionFn, entity, 'Decision');
    }

    _safeInvokeRule(func, entity, ruleName) {
        if (_.isNil(func)) return [];

        const results = func(entity);
        if (_.isNil(results)) {
            console.log(`${ruleName} rule didn't return anything for: ${entity.constructor.name}`);
            return [];
        } else if (!_.isArray(results)) {
            console.log(`${ruleName} didn't return an array for: ${entity.constructor.name}`);
            return [];
        }
        return results;
    }

    validate(entity) {
        const validationResults = this._safeInvokeRule(this.validationFn, entity, 'Validation');
        validationResults.forEach((validationResult) => validationResult.formIdentifier = BaseEntity.fieldKeys.EXTERNAL_RULE);
        return validationResults;
    }

    getNextScheduledVisits(entity) {
        const nextScheduledVisits = this._safeInvokeRule(this.getNextScheduledVisitsFn, entity, 'NextScheduledVisits');
        console.log(`${nextScheduledVisits.length} scheduled visits returned`);
        return nextScheduledVisits;
    }
}

export default EntityRule;