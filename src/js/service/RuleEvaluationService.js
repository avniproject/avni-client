import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import DecisionConfigService from "./DecisionConfigService";
import ConfigService from "./ConfigService";
import _ from 'lodash';
import DynamicDataResolver from "./DynamicDataResolver";
import {getObservationValue} from '../service/decisionSupport/AdditionalFunctions';
import Encounter from "../models/Encounter";

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.decorateEncounter();
        return super.init();
    }

    getEncounterDecision(encounter) {
        return eval(this.getEncounterDecisionEvalExpression('getDecision'));
    }

    decorateEncounter() {
        if (_.isNil(Encounter.prototype.dynamicDataResolver)) {
            Encounter.prototype.dynamicDataResolver = new DynamicDataResolver(this.context);
            Encounter.prototype.getObservationValue = getObservationValue;
        }
    }

    getEncounterDecisionEvalExpression(functionName) {
        const decisionConfig = this.getService(DecisionConfigService)
            .getDecisionConfig(this.getService(ConfigService).encounterDecisionFile);
        return `${decisionConfig.decisionCode} ${functionName}(encounter);`;
    }

    validateEncounter(encounter) {
        return eval(this.getEncounterDecisionEvalExpression('validate'));
    }
}

export default RuleEvaluationService;