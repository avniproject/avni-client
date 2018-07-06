import Service from "../framework/bean/Service";
import _ from 'lodash';
import BaseService from "./BaseService";
import {
    EntityRule,
    FormElementStatus,
    Observation,
    Encounter,
    ProgramEncounter,
    ProgramEnrolment
} from "openchs-models";
import {
    encounterDecision,
    programEncounterDecision,
    programEnrolmentDecision,
    individualRegistrationDecision,
    familyRegistrationDecision,
    RuleRegistry
} from "openchs-health-modules";
import ConceptService from "./ConceptService";
import ProgramEncounterService from "./program/ProgramEncounterService";
import ProgramEnrolmentService from "./ProgramEnrolmentService";
import RuleDependency from "../../../openchs-models/src/RuleDependency";
import Rule from "../../../openchs-models/src/Rule";
import Form from "../../../openchs-models/src/application/Form";
import Decision from "../../../openchs-models/src/Decision";
import FormMappingService from "./FormMappingService";
import General from "../utility/General";
import RuleService from "./RuleService";

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.getEntityDecision = this.getEntityDecision.bind(this);
    }

    init() {
        this.entityRulesMap = new Map([['Individual', new EntityRule(individualRegistrationDecision)],
            ['Family', new EntityRule(familyRegistrationDecision)],
            ['Encounter', new EntityRule(encounterDecision)],
            ['ProgramEnrolment', new EntityRule(programEnrolmentDecision)],
            ['ProgramEncounter', new EntityRule(programEncounterDecision)],]);

        this.entityFormMap = new Map([
            ['Individual', (individual) => this.formMappingService.findRegistrationForm(individual)],
            ['Encounter', (encounter) => this.formMappingService.findFormForEncounterType(encounter.encounterType, Encounter.schema.name)],
            ['ProgramEnrolment', (programEnrolment) => this.formMappingService.findFormForProgramEnrolment(programEnrolment.program)],
            ['ProgramEncounter', (programEncounter) => this.formMappingService.findFormForEncounterType(programEncounter.encounterType, ProgramEncounter.schema.name)],
        ]);
        this.entityRulesMap.forEach((entityRule, key) => {
            entityRule.setFunctions(entityRule.ruleFile);
        });
        this.formMappingService = this.getService(FormMappingService);
    }

    getEntityDecision(form, entity, context) {
        const defaultDecisions = {
            "enrolmentDecisions": [],
            "encounterDecisions": [],
            "registrationDecisions": []
        };
        if ([form, entity].some(_.isEmpty)) return defaultDecisions;
        const applicableRules = RuleRegistry.getRulesFor(form.uuid, "Decision");
        const additionalRules = this.getService(RuleService).getApplicableRules(form, "Decision");
        const decisions = _.sortBy(applicableRules.concat(additionalRules), (r) => r.executionOrder)
            .reduce((decisions, rule) => rule.fn.exec(entity, decisions, context, new Date()), defaultDecisions);
        General.logDebug("RuleEvaluationService", decisions);
        return decisions;
    }

    getDecisions(entity, entityName, context) {
        const form = this.entityFormMap.get(entityName)(entity);
        return this.getEntityDecision(form, entity, context);
    }

    getEnrolmentSummary(entity, entityName, context) {
        let summary = this.entityRulesMap.get(entityName).getEnrolmentSummary(entity, context);
        const conceptService = this.getService(ConceptService);
        let summaryWithObservations = [];
        summary.forEach((summaryElement) => {
            let concept = conceptService.conceptFor(summaryElement.name);
            summaryWithObservations.push(Observation.create(concept, concept.getValueWrapperFor(summaryElement.value)));
        });
        return summaryWithObservations;
    }

    validateAgainstRule(entity, form, entityName) {
        const defaultValidationErrors = [];
        if ([entity, form].some(_.isEmpty)) return defaultValidationErrors;
        const applicableRules = RuleRegistry.getRulesFor(form.uuid, "Validation");
        const additionalRules = this.getService(RuleService).getApplicableRules(form, "Validation");
        const validationErrors = _.sortBy(applicableRules.concat(additionalRules), (r) => r.executionOrder)
            .reduce((validationErrors, rule) => rule.fn.exec(entity, validationErrors), defaultValidationErrors);
        General.logDebug("RuleEvaluationService - Validation Errors", validationErrors);
        return validationErrors;
    }

    getNextScheduledVisits(entity, entityName, visitScheduleConfig) {
        const defaultVistSchedule = [];
        const form = this.entityFormMap.get(entityName)(entity);
        if ([entity, form].some(_.isEmpty)) return defaultVistSchedule;
        const applicableRules = RuleRegistry.getRulesFor(form.uuid, "VisitSchedule");
        const additionalRules = this.getService(RuleService).getApplicableRules(form, "VisitSchedule");
        const scheduledVisits = entity.getAllScheduledVisits(entity);
        const nextVisits = _.sortBy(applicableRules.concat(additionalRules), (r) => r.executionOrder)
            .reduce((schedule, rule) => rule.fn.exec(entity, schedule, visitScheduleConfig), scheduledVisits);
        General.logDebug("RuleEvaluationService - Next Visits", nextVisits);
        return nextVisits;
    }

    getChecklists(enrolment) {
        const defaultChecklists = [];
        const form = this.entityFormMap.get("ProgramEnrolment")(enrolment);
        if ([enrolment, form].some(_.isEmpty)) return defaultChecklists;
        const applicableRules = RuleRegistry.getRulesFor(form.uuid, "Checklists");
        const additionalRules = this.getService(RuleService).getApplicableRules(form, "Checklists");
        const allChecklists = _.sortBy(applicableRules.concat(additionalRules), (r) => r.executionOrder)
            .reduce((checklists, rule) => rule.fn.exec(enrolment, checklists), defaultChecklists);
        General.logDebug("RuleEvaluationService - Checklists", allChecklists);
        return allChecklists;
    }

    getFormElementsStatuses(entity, entityName, formElementGroup) {
        if ([entity, formElementGroup, formElementGroup.form].some(_.isEmpty)) return [];
        const applicableRules = RuleRegistry.getRulesFor(formElementGroup.form.uuid, "ViewFilter");
        const additionalRules = this.getService(RuleService).getApplicableRules(formElementGroup.form, "ViewFilter");
        const defaultFormElementStatus = formElementGroup.getFormElements()
            .map((formElement) => new FormElementStatus(formElement.uuid, true, undefined));
        if (_.isEmpty(additionalRules.concat(applicableRules))) return defaultFormElementStatus;
        return [..._.sortBy(applicableRules.concat(additionalRules), (r) => r.executionOrder)
            .map(r => r.fn.exec(entity, formElementGroup, new Date()))
            .reduce((all, curr) => all.concat(curr), defaultFormElementStatus)
            .reduce((acc, fs) => acc.set(fs.uuid, fs), new Map())
            .values()];
    }

    runOnAll() {
        const conceptService = this.getService(ConceptService);
        const programEnrolmentService = this.getService(ProgramEnrolmentService);
        const programEncounterService = this.getService(ProgramEncounterService);
        const saveEntityOfType = {
            "ProgramEnrolment": (enrolment, nextScheduledVisits) =>
                programEnrolmentService.enrol(enrolment, this.getChecklists(enrolment), nextScheduledVisits),
            "ProgramEncounter": () => programEncounterService.saveOrUpdate(entity, nextScheduledVisits)
        };
        ["ProgramEnrolment", "ProgramEncounter"].map((schema) => {
            let allEntities = this.getAll(schema).map((entity) => entity.cloneForEdit());
            allEntities.forEach((entity) => {
                const decisions = this.getDecisions(entity, schema);
                const nextScheduledVisits = this.getNextScheduledVisits(entity, schema);
                conceptService.addDecisions(entity.observations, decisions.enrolmentDecisions);
                conceptService.addDecisions(entity.observations, decisions.encounterDecisions);
                saveEntityOfType[schema](entity, nextScheduledVisits);
            });
        });
    }
}

export default RuleEvaluationService;