import BaseService from './BaseService.js'
import _ from 'lodash';
import Service from '../framework/bean/Service';
import Rule from "../../../openchs-models/src/Rule";
import RuleDependency from "../../../openchs-models/src/RuleDependency";
import General from "../utility/General";
import { C } from "openchs-health-modules";

@Service("ruleService")
class RuleService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
        this.getApplicableRules = this.getApplicableRules.bind(this);
    }

    init() {
        const ruleDependency = this.findOnly(RuleDependency.schema.name);
        if (!ruleDependency) return;
        /**********/
        /*variables used inside the eval*/
        let rulesConfig = undefined;
        /*keeping it long to avoid name conflicts*/
        let ruleServiceLibraryInterfaceForSharingModules = {
            log: console.log,
            calculations: C
        };
        eval(RuleDependency.getCode(ruleDependency));
        /**********/
        this.allRules = {...rulesConfig};
        General.logDebug("RuleService", "\n>>>>>>>>>RULES LOADED<<<<<<<<<\n")
    }

    getApplicableRules(form, type) {
        General.logDebug("RuleService", `Getting Rules of Type ${type} for Form - ${form.name} ${form.uuid}`);
        const rules = this.db.objects(Rule.schema.name)
            .filtered(`voided = false and form.uuid=$0 and type=$1`, form.uuid, type)
            .map(_.identity);
        if(rules.length == 0) {
            General.logDebug("RuleService", `No Rules of Type ${type} for Form - ${form.name} ${form.uuid} exists`);
        }
        return _.defaults(rules, [])
            .filter(ar => _.isFunction(this.allRules[ar.fnName]) && _.isFunction(this.allRules[ar.fnName].exec))
            .map(ar => ({...ar, fn: this.allRules[ar.fnName]}));
    }

}

export default RuleService;