import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import ConfigFileService from "./ConfigFileService";
import _ from "lodash";
import DynamicDataResolver from "./DynamicDataResolver";
import {getObservationValueFromEntireEnrolment, observationExistsInEntireEnrolment, getObservationValue, observationExists, getCodedAnswers} from "../service/decisionSupport/AdditionalFunctions";
import {Encounter, Individual, ProgramEncounter, ProgramEnrolment, EntityRule} from "openchs-models";

import General from "../utility/General";

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.decorateEncounter();
        const configFileService = this.getService(ConfigFileService);

        this.entityRulesMap = new Map([['Individual', new EntityRule(configFileService.getIndividualRegistrationFile())],
            ['Encounter', new EntityRule(configFileService.getEncounterDecisionFile())],
            ['ProgramEncounter', new EntityRule(configFileService.getProgramEncounterFile())],
            ['ProgramEnrolment', new EntityRule(configFileService.getProgramEnrolmentFile())]]);
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

            ProgramEnrolment.prototype.getObservationValueFromEntireEnrolment = getObservationValueFromEntireEnrolment;
            ProgramEnrolment.prototype.observationExistsInEntireEnrolment = observationExistsInEntireEnrolment;
        }
    }

    static getExports(configFile) {
        if (!_.isNil(configFile)) {
            try {
                General.logDebug('RuleEvaluationService', `Evaluating ${configFile}`);
                const object = eval(`${configFile.contents}`);
                General.logDebug('RuleEvaluationService', `${configFile} evaluated.`);
                return object;
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