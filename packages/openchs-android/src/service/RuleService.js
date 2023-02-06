import BaseService from './BaseService.js'
import _ from 'lodash';
import Service from '../framework/bean/Service';
import {RuleDependency, Rule} from "avni-models";
import General from "../utility/General";
import {common, motherCalculations} from 'avni-health-modules';
import * as models from 'avni-models';

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
            common: common,
            motherCalculations: motherCalculations,
            models: models
        };
        eval(RuleDependency.getCode(ruleDependency));
        /**********/
        this.allRules = {...rulesConfig};
        General.logDebug("RuleService", "\n>>>>>>>>>RULES LOADED<<<<<<<<<\n")
    }

    getApplicableRules(ruledEntity, ruleType, ruledEntityType) {
        General.logDebug("RuleService",
            `Getting Rules of Type ${ruleType} for ${ruledEntityType} - ${ruledEntity.name} ${ruledEntity.uuid}`);
        const rules = this.findAll()
            .map(_.identity)
            .filter(rule =>
                rule.voided === false && rule.type === ruleType &&
                rule.entity.uuid === ruledEntity.uuid && rule.entity.type === ruledEntityType);
        return this.getRuleFunctions(rules);
    }

    getRuleFunctions(rules = []) {
        return _.defaults(rules, [])
            .filter(ar => _.isFunction(this.allRules[ar.fnName]) && _.isFunction(this.allRules[ar.fnName].exec))
            .map(x => {
                x.fn = this.allRules[x.fnName];
                return x;
            });
    }

    getRulesByType(type) {
        return this.getRuleFunctions(
            this.db.objects(Rule.schema.name)
            .filtered(`voided = false and type=$0`, type)
            .map(_.identity));
    }

    getSchema() {
        return Rule.schema.name;
    }
}

export default RuleService;
