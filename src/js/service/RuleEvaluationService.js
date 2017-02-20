import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import ConfigFileService from "./ConfigFileService";
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
        const exports = eval(this.getEncounterDecisionEvalExpression());
        this.encounterDecisionFn = exports.getDecision;
        this.encounterValidationFn = exports.validate;
        return super.init();
    }

    getEncounterDecision(encounter) {
        return this.encounterDecisionFn(encounter);
    }

    decorateEncounter() {
        if (_.isNil(Encounter.prototype.dynamicDataResolver)) {
            Encounter.prototype.dynamicDataResolver = new DynamicDataResolver(this.context);
            Encounter.prototype.getObservationValue = getObservationValue;
        }
    }

    getEncounterDecisionEvalExpression() {
        const decisionConfig = this.getService(ConfigFileService).getDecisionConfig();
        return `${decisionConfig.contents}`;
    }

    validateEncounter(encounter) {
        return this.encounterValidationFn(encounter);
    }
}

export default RuleEvaluationService;