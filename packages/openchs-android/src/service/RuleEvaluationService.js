import Service from "../framework/bean/Service";
import BaseService from "./BaseService";
import {Encounter, Individual, ProgramEncounter, ProgramEnrolment, EntityRule, FormElementStatus} from "openchs-models";
import {encounterDecision, programEncounterDecision, programEnrolmentDecision, individualRegistrationDecision} from "openchs-health-modules";

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, context) {
        super(db, context);
    }

    init() {
        this.entityRulesMap = new Map([['Individual', new EntityRule(individualRegistrationDecision)],
            ['Encounter', new EntityRule(encounterDecision)],
            ['ProgramEncounter', new EntityRule(programEncounterDecision)],
            ['ProgramEnrolment', new EntityRule(programEnrolmentDecision)]]);
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
        return fn && fn(entity, formElementGroup) || formElementGroup.formElements.map((formElement) => new FormElementStatus(formElement.uuid, true, undefined));
    }
}

export default RuleEvaluationService;