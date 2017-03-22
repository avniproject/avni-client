import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import ConfigFileService from "./ConfigFileService";
import _ from 'lodash';
import DynamicDataResolver from "./DynamicDataResolver";
import {getObservationValue} from '../service/decisionSupport/AdditionalFunctions';
import Encounter from "../models/Encounter";
import AbstractEncounter from "../models/AbstractEncounter";
import ValidationResult from '../models/application/ValidationResult';

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.decorateEncounter();
        const configFileService = this.getService(ConfigFileService);

        var exports = RuleEvaluationService.getExports(configFileService.getEncounterDecisionFile());
        if (!_.isNil(exports)) {
            this.encounterDecisionFn = exports.getDecision;
            this.encounterValidationFn = exports.validate;
        }
        exports = RuleEvaluationService.getExports(configFileService.getProgramEnrolmentFile());
        if (!_.isNil(exports)) {
            this.getNextScheduledDateFn = exports.getNextScheduledDate;
        }
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

    static getExports(configFile) {
        if (!_.isNil(configFile))
            return eval(`${configFile.contents}`);
        return null;
    }

    validateEncounter(encounter) {
        if (_.isNil(this.encounterValidationFn)) {
            return ValidationResult.successful(AbstractEncounter.validationKeys.EXTERNAL_RULE);
        } else {
            const validationResult = this.encounterValidationFn(encounter);
            validationResult.formIdentifier = AbstractEncounter.validationKeys.EXTERNAL_RULE;
            return validationResult;
        }
    }

    getNextScheduledDate(enrolment) {
        return _.isNil(this.getNextScheduledDateFn) ? null : this.getNextScheduledDateFn(enrolment);
    }
}

export default RuleEvaluationService;