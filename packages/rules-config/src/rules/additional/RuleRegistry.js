import _ from 'lodash';

class RuleRegistry {
    constructor() {
        this.rules = new Map();
    }

    _hash(programName, entity, type) {
        return `${programName}${entity}${type}`;
    }

    add(programName, entity, type, ruleData) {
        const rules = _.defaults(this.rules.get(this._hash(programName, entity, type)), []);
        this.rules.set(`${programName}${entity}${type}`, [ruleData].concat(rules).filter(r => !_.isEmpty(r)));
    }

    getAllRulesFor(programName, entity, type) {
        return _.defaults(this.rules.get(this._hash(programName, entity, type)), []);
    }
}

export default new RuleRegistry();