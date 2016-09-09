import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import DecisionConfigService from "./DecisionConfigService";
import AppState from '../hack/AppState';

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    getDecision(questionnaireName) {
        const param = AppState.questionnaireAnswers.createRuleContext();
        const evalExpression = this.evalExpression(questionnaireName, 'getDecision');
        return eval(evalExpression);
    }

    evalExpression(questionnaireName, functionName) {
        const decision = this.getService(DecisionConfigService)
            .getDecisionConfig(questionnaireName);
        return `${decision.decisionCode} ${functionName}(param);`;
    }

    validate(questionnaireName) {
        const param = AppState.questionnaireAnswers.createRuleContext();
        const evalExpression = this.evalExpression(questionnaireName, 'validate');
        return eval(evalExpression);
    }
}

export default RuleEvaluationService;