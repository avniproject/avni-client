import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import DecisionConfigService from "./DecisionConfigService";
import ConfigService from "./ConfigService";
import _ from 'lodash';
import DynamicDataResolver from "./DynamicDataResolver";
import {getObservationValue} from '../service/decisionSupport/AdditionalFunctions';

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getEncounterDecision(encounter) {
        if (_.isNil(encounter.prototype.dynamicDataResolver)) {
            encounter.prototype.dynamicDataResolver = new DynamicDataResolver(this.context);
            encounter.prototype.getObservationValue = getObservationValue;
        }

        const evalExpression = this.getEncounterDecisionEvalExpression('getDecision');
        return eval(evalExpression);
    }

    getEncounterDecisionEvalExpression(functionName) {
        const decisionConfig = this.getService(DecisionConfigService)
            .getDecisionConfig(this.getService(ConfigService).encounterDecisionFile);
        return `${decisionConfig.decisionCode} ${functionName}(encounter);`;
    }

    validate(encounter) {
        const evalExpression = this.getEncounterDecisionEvalExpression('validate');
        return eval(evalExpression);
    }
}

export default RuleEvaluationService;