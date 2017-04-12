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
            if (!_.isNil(exports))
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
            const prototypes = [Encounter.prototype, ProgramEncounter.prototype, ProgramEnrolment.prototype];
            prototypes.forEach((currentPrototype) => {
                currentPrototype.dynamicDataResolver = dynamicDataResolver;
                currentPrototype.getObservationValue = getObservationValue;
                currentPrototype.observationExists = observationExists;
                currentPrototype.getCodedAnswers = getCodedAnswers;
            });
        }
    }

    static getExports(configFile) {
        if (!_.isNil(configFile)) {
            try {
                return eval(`${configFile.contents}`);
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

    getChecklists(enrolment) {
        return this.entityRulesMap.get(ProgramEnrolment.name).getChecklists(enrolment);
    }
}

export default RuleEvaluationService;