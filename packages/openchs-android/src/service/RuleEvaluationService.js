import Service from "../framework/bean/Service";
import _ from 'lodash';
import BaseService from "./BaseService";
import {Encounter, Individual, ProgramEncounter, ProgramEnrolment, EntityRule, FormElementStatus} from "openchs-models";
import {
    encounterDecision,
    programEncounterDecision,
    programEnrolmentDecision,
    individualRegistrationDecision
} from "openchs-health-modules";
import ConceptService from "./ConceptService";
import IndividualService from "./IndividualService";
import IndividualEncounterService from "./IndividualEncounterService";
import ProgramEncounterService from "./program/ProgramEncounterService";
import ProgramEnrolmentService from "./ProgramEnrolmentService";

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.entityRulesMap = new Map([['Individual', new EntityRule(individualRegistrationDecision)],
            ['Encounter', new EntityRule(encounterDecision)],
            ['ProgramEnrolment', new EntityRule(programEnrolmentDecision)],
            ['ProgramEncounter', new EntityRule(programEncounterDecision)]]);
        this.entityRulesMap.forEach((entityRule, key) => {
            entityRule.setFunctions(entityRule.ruleFile);
        });
    }

    getDecisions(entity, entityName, context) {
        return this.entityRulesMap.get(entityName).getDecisions(entity, context);
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

    filterFormElements(entity, entityName, formElementGroup) {
        let fn = this.entityRulesMap.get(entityName).filterFormElements;
        return fn && fn(entity, formElementGroup) || formElementGroup.getFormElements().map((formElement) => new FormElementStatus(formElement.uuid, true, undefined));
    }

    runOnAll() {
        const conceptService = this.getService(ConceptService);
        const programEnrolmentService = this.getService(ProgramEnrolmentService);
        const programEncounterService = this.getService(ProgramEncounterService);
        ["ProgramEnrolment", "ProgramEncounter"].map((schema) => {
            let allEntities = this.getAll(schema).map((entity) => entity.cloneForEdit());
            allEntities.forEach((entity) => {
                const decisions = this.getDecisions(entity, schema);
                const nextScheduledVisits = this.getNextScheduledVisits(entity, schema);
                switch (schema) {
                    case "ProgramEnrolment": {
                        conceptService.addDecisions(entity.observations, decisions.enrolmentDecisions);
                        conceptService.addDecisions(entity.observations, decisions.encounterDecisions);
                        const checklists = this.getChecklists(entity);
                        programEnrolmentService.enrol(entity, checklists, nextScheduledVisits);
                        break;
                    }
                    case "ProgramEncounter": {
                        conceptService.addDecisions(entity.observations, decisions.enrolmentDecisions);
                        conceptService.addDecisions(entity.observations, decisions.encounterDecisions);
                        programEncounterService.saveOrUpdate(entity, nextScheduledVisits);
                        break;
                    }
                    default:
                        break;
                }
            });

        });
    }
}

export default RuleEvaluationService;