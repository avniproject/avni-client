import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import DecisionConfigService from "./DecisionConfigService";
import AppState from '../hack/AppState';
import MessageService from "./MessageService";

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, beanStore) {
        super(db, beanStore);
    }

    init() {
        this.I18n = this.getService(MessageService).getI18n();
    }

    getDecision(questionnaireName) {
        const param = AppState.questionnaireAnswers.createRuleContext(this.I18n);
        const evalExpression = this.evalExpression(questionnaireName, 'getDecision');
        return eval(evalExpression);
    }

    evalExpression(questionnaireName, functionName) {
        const decision = this.getService(DecisionConfigService)
            .getDecisionConfig(questionnaireName);
        return `${decision.decisionCode} ${functionName}(param);`;
    }

    validate(questionnaireName) {
        const param = AppState.questionnaireAnswers.createRuleContext(this.I18n);
        const evalExpression = this.evalExpression(questionnaireName, 'validate');
        return eval(evalExpression);
    }
}

export default RuleEvaluationService;