import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import ConfigFileService from "./ConfigFileService";
import _ from 'lodash';
import DynamicDataResolver from "./DynamicDataResolver";
import {getObservationValue} from '../service/decisionSupport/AdditionalFunctions';
import Encounter from "../models/Encounter";
import Individual from "../models/Individual";
import ProgramEncounter from "../models/ProgramEncounter";
import ProgramEnrolment from "../models/ProgramEnrolment";
import AbstractEncounter from "../models/AbstractEncounter";
import ValidationResult from '../models/application/ValidationResult';
import EntityRule from "../models/EntityRule";

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.decorateEncounter();
        const configFileService = this.getService(ConfigFileService);

        this.entityRulesMap = new Map([[Individual.name, new EntityRule(configFileService.getIndividualRegistrationFile())], [Encounter.name, new EntityRule(configFileService.getEncounterDecisionFile())], [ProgramEncounter.name, new EntityRule(configFileService.getProgramEncounterFile())], [ProgramEnrolment.name, new EntityRule(configFileService.getProgramEnrolmentFile())]]);
        this.entityRulesMap.forEach((entityRule, key) => {
            const exports = RuleEvaluationService.getExports(entityRule.ruleFile);
            entityRule.setFunctions(exports);
        });

        this.initialised = true;
    }

    getDecisions(entity) {
        return this.entityRulesMap.get(entity.constructor.name).getDecisions(entity);
    }

    decorateEncounter() {
        if (!this.initialised) {
            const dynamicDataResolver = new DynamicDataResolver(this.context);
            Encounter.prototype.dynamicDataResolver = dynamicDataResolver;
            Encounter.prototype.getObservationValue = getObservationValue;

            ProgramEncounter.prototype.dynamicDataResolver = dynamicDataResolver;
            ProgramEncounter.prototype.getObservationValue = getObservationValue;
        }
    }

    static getExports(configFile) {
        if (!_.isNil(configFile)) {
            try {
                return eval(`${configFile.contents}`)(1, 2); //1,2 is passed because of browserify adding a function infront
            } catch (error) {
                console.log(error);
                return null;
            }
        }

        return null;
    }

    validateAgainstRule(entity) {
        return this.entityRulesMap.get(entity.constructor.name).validate(entity);
    }

    getNextScheduledVisits(entity) {
        return this.entityRulesMap.get(entity.constructor.name).getNextScheduledVisits(entity);
    }
}

export default RuleEvaluationService;