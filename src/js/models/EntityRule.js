import _ from 'lodash';
import BaseEntity from './BaseEntity';

class EntityRule {
    constructor(ruleFile) {
        this.ruleFile = ruleFile;
    }

    setFunctions(exports) {
        console.log(`Found ${JSON.stringify(_.keys(exports))} in ${this.ruleFile.toString()}`);
        if (!_.isNil(exports)) {
            this.decisionFn = exports.getDecisions;
            this.validationFn = exports.validate;
            this.getNextScheduledVisitsFn = exports.getNextScheduledVisits;
            this.getChecklistFn = exports.getChecklists;
        }
    }

    getDecisions(entity) {
        return this._safeInvokeRule(this.decisionFn, 'Decision', entity);
    }

    _safeInvokeRule(func, ruleName, ...params) {
        console.log(`Invoking rule ${ruleName} on entity: ${params[0].constructor.name}`);
        if (_.isNil(func)) return [];

        const results = func(...params);
        if (_.isNil(results)) {
            console.log(`${ruleName} rule didn't return anything for: ${params[0].constructor.name}`);
            return [];
        } else if (!_.isArray(results)) {
            console.log(`${ruleName} didn't return an array for: ${params[0].constructor.name}`);
            return [];
        }
        return results;
    }

    validate(entity, form) {
        const validationResults = this._safeInvokeRule(this.validationFn, 'Validation', entity, form);
        validationResults.forEach((validationResult) => validationResult.formIdentifier = BaseEntity.fieldKeys.EXTERNAL_RULE);
        return validationResults;
    }

    getNextScheduledVisits(entity) {
        const nextScheduledVisits = this._safeInvokeRule(this.getNextScheduledVisitsFn, 'NextScheduledVisits', entity);
        console.log(`${nextScheduledVisits.length} scheduled visits returned`);
        return nextScheduledVisits;
    }

    getChecklists(enrolment) {
        return this._safeInvokeRule(this.getChecklistFn, 'GetChecklists', enrolment);
    }
}

export default EntityRule;