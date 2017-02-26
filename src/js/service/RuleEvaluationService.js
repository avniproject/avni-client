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
        return _.isNil(this.encounterValidationFn) ? null : this.encounterValidationFn(encounter);
    }

    getNextScheduledDate(enrolment) {
        return _.isNil(this.getNextScheduledDateFn) ? null : this.getNextScheduledDateFn(enrolment);
    }
}

export default RuleEvaluationService;