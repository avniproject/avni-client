import BaseService from './BaseService.js'
import _ from 'lodash';
import Service from '../framework/bean/Service';
import Rule from "../../../openchs-models/src/Rule";
import RuleDependency from "../../../openchs-models/src/RuleDependency";
import General from "../utility/General";

@Service("ruleService")
class RuleService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.getApplicableRules = this.getApplicableRules.bind(this);
    }

    init() {
        const ruleDependency = this.findOnly(RuleDependency.schema.name);
        if (!ruleDependency) return;
        let rulesConfig = undefined;
        eval(RuleDependency.getCode(ruleDependency));
        this.allRules = {...rulesConfig};
    }

    getApplicableRules(form, type) {
        General.logDebug("RuleService", `Getting Rules of Type ${type} for Form - ${form.name} ${form.uuid}`);
        const rules = this.db.objects(Rule.schema.name)
            .filtered(`voided = false and form.uuid=$0 and type=$1`, form.uuid, type)
            .map(_.identity);
        return _.defaults(rules, [])
            .filter(ar => _.isFunction(this.allRules[ar.fnName]) && _.isFunction(this.allRules[ar.fnName].exec))
            .map(ar => ({...ar, fn: this.allRules[ar.fnName]}));
    }

}

export default RuleService;