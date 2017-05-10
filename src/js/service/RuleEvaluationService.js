import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import ConfigFileService from "./ConfigFileService";
import _ from "lodash";
import DynamicDataResolver from "./DynamicDataResolver";
import {getObservationValue, observationExists, getCodedAnswers} from "../service/decisionSupport/AdditionalFunctions";
import Encounter from "../models/Encounter";
import Individual from "../models/Individual";
import ProgramEncounter from "../models/ProgramEncounter";
import ProgramEnrolment from "../models/ProgramEnrolment";
import EntityRule from "../models/EntityRule";
import General from "../utility/General";
import {getObservationValueFromEntireEnrolment, observationExistsInEntireEnrolment} from "./decisionSupport/AdditionalFunctions";

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.decorateEncounter();
        const configFileService = this.getService(ConfigFileService);

        this.entityRulesMap = new Map([['Individual', new EntityRule(configFileService.getIndividualRegistrationFile())], ['Encounter', new EntityRule(configFileService.getEncounterDecisionFile())], ['ProgramEncounter', new EntityRule(configFileService.getProgramEncounterFile())], ['ProgramEnrolment', new EntityRule(configFileService.getProgramEnrolmentFile())]]);
        this.entityRulesMap.forEach((entityRule, key) => {
            const exports = RuleEvaluationService.getExports(entityRule.ruleFile);
            if (!_.isNil(exports))
                entityRule.setFunctions(exports);
        });

        this.initialised = true;
    }

    getDecisions(entity, entityName) {
        return this.entityRulesMap.get(entityName).getDecisions(entity);
    }

    decorateEncounter() {
        if (!this.initialised) {
            const dynamicDataResolver = new DynamicDataResolver(this.context);
            const allObservationHolderPrototypes = [Encounter.prototype, ProgramEncounter.prototype, ProgramEnrolment.prototype];
            allObservationHolderPrototypes.forEach((currentPrototype) => {
                currentPrototype.dynamicDataResolver = dynamicDataResolver;
                currentPrototype.getObservationValue = getObservationValue;
                currentPrototype.observationExists = observationExists;
                currentPrototype.getCodedAnswers = getCodedAnswers;
            });

            ProgramEncounter.prototype.getObservationValueFromEntireEnrolment = getObservationValueFromEntireEnrolment;
            ProgramEncounter.prototype.observationExistsInEntireEnrolment = observationExistsInEntireEnrolment;
        }
    }

    static getExports(configFile) {
        if (!_.isNil(configFile)) {
            try {
                return eval(`${configFile.contents}`);
            } catch (error) {
                General.logError('RuleEvaluationService', error);
                return null;
            }
        }

        return null;
    }

    validateAgainstRule(entity, form, entityName) {
        return this.entityRulesMap.get(entityName).validate(entity, form);
    }

    getNextScheduledVisits(entity, entityName) {
        return this.entityRulesMap.get(entityName).getNextScheduledVisits(entity);
    }

    getChecklists(enrolment) {
        return this.entityRulesMap.get('ProgramEnrolment').getChecklists(enrolment);
    }
}

export default RuleEvaluationService;