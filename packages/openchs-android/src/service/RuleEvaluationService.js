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
} from 'openchs-models';
import {
    encounterDecision,
    programEncounterDecision,
    programEnrolmentDecision,
    individualRegistrationDecision,
    familyRegistrationDecision,
    RuleRegistry
} from 'openchs-health-modules';
import ConceptService from "./ConceptService";
import ProgramEncounterService from "./program/ProgramEncounterService";
import ProgramEnrolmentService from "./ProgramEnrolmentService";
import {  Decision  } from 'openchs-models';
import FormMappingService from "./FormMappingService";
import General from "../utility/General";
import RuleService from "./RuleService";
import {  ChecklistDetail  } from 'openchs-models';
import IndividualService from "./IndividualService";
import IndividualEncounterService from "./IndividualEncounterService";
import {  Individual  } from 'openchs-models';

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
            ['Individual', (individual) => this.formMappingService.findRegistrationForm(individual.subjectType)],
            ['Encounter', (encounter) => this.formMappingService.findFormForEncounterType(encounter.encounterType, Encounter.schema.name, encounter.individual.subjectType)],
            ['ProgramEnrolment', (programEnrolment) => this.formMappingService.findFormForProgramEnrolment(programEnrolment.program, programEnrolment.individual.subjectType)],
            ['ProgramEncounter', (programEncounter) => this.formMappingService.findFormForEncounterType(programEncounter.encounterType, ProgramEncounter.schema.name, programEncounter.programEnrolment.individual.subjectType)],
            ['ChecklistItem', (checklistItem) => checklistItem.detail.form],
            ['ProgramEncounterCancellation', (programEncounter) => this.formMappingService.findFormForCancellingEncounterType(programEncounter.encounterType, programEncounter.programEnrolment.program, programEncounter.programEnrolment.individual.subjectType)],
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
        const decisionsMap = this.getAllRuleItemsFor(form, "Decision")
            .reduce((decisions, rule) => rule.fn.exec(entity, decisions, context, new Date()), defaultDecisions);
        const trimmedDecisions = {};
        _.forEach(decisionsMap, (decisions, decisionType) => {
            trimmedDecisions[decisionType] = _.reject(decisions, _.isEmpty);
        });
        General.logDebug("RuleEvaluationService", trimmedDecisions);
        return trimmedDecisions;
    }

    getDecisions(entity, entityName, context) {
        const form = this.entityFormMap.get(entityName)(entity);
        return this.getEntityDecision(form, entity, context);
    }

    updateWorkLists(workLists, context) {
        const additionalRules = this.getService(RuleService).getRulesByType('WorkListUpdation');
        return _.reduce(additionalRules, (newWorkLists, rule) => rule.fn.exec(workLists, context), workLists);
    }

    getEnrolmentSummary(enrolment, entityName='ProgramEnrolment', context) {
        const summaries = this.entityRulesMap.get(entityName).getEnrolmentSummary(enrolment, context);
        const updatedSummaries = this.getAllRuleItemsFor(enrolment.program, "EnrolmentSummary")
            .reduce((summaries, rule) => rule.fn.exec(enrolment, summaries, context, new Date()), summaries);
        const conceptService = this.getService(ConceptService);
        const summaryObservations = _.map(updatedSummaries, (summary) => {
            let concept = conceptService.conceptFor(summary.name);
            return Observation.create(concept, concept.getValueWrapperFor(summary.value), summary.abnormal);
        });
        General.logDebug("RuleEvaluationService - Summary Observations", summaryObservations);
        return summaryObservations;
    }

    validateAgainstRule(entity, form, entityName) {
        const defaultValidationErrors = [];
        if ([entity, form].some(_.isEmpty)) return defaultValidationErrors;
        const validationErrors = this.getAllRuleItemsFor(form, "Validation")
            .reduce((validationErrors, rule) => rule.fn.exec(entity, validationErrors), defaultValidationErrors);
        General.logDebug("RuleEvaluationService - Validation Errors", validationErrors);
        return validationErrors;
    }

    getNextScheduledVisits(entity, entityName, visitScheduleConfig) {
        const defaultVistSchedule = [];
        const form = this.entityFormMap.get(entityName)(entity);
        if (!_.isFunction(entity.getAllScheduledVisits) && [entity, form].some(_.isEmpty)) return defaultVistSchedule;
        const scheduledVisits = entity.getAllScheduledVisits(entity);
        const nextVisits = this.getAllRuleItemsFor(form, "VisitSchedule")
            .reduce((schedule, rule) => rule.fn.exec(entity, schedule, visitScheduleConfig), scheduledVisits);
        General.logDebug("RuleEvaluationService - Next Visits", nextVisits);
        return nextVisits;
    }

    getChecklists(entity, entityName, defaultChecklists = []) {
        const form = this.entityFormMap.get(entityName)(entity);
        const allChecklistDetails = this.findAll(ChecklistDetail.schema.name);
        if ([entity, form, allChecklistDetails].some(_.isEmpty)) return defaultChecklists;
        const allChecklists = this.getAllRuleItemsFor(form, "Checklists")
            .reduce((checklists, rule) => rule.fn.exec(entity, allChecklistDetails), defaultChecklists);
        // General.logDebug("RuleEvaluationService - Checklists", allChecklists);
        return allChecklists;
    }

    getFormElementsStatuses(entity, entityName, formElementGroup) {
        if ([entity, formElementGroup, formElementGroup.form].some(_.isEmpty)) return [];
        const allRules = this.getAllRuleItemsFor(formElementGroup.form, "ViewFilter");
        const defaultFormElementStatus = formElementGroup.getFormElements()
            .map((formElement) => new FormElementStatus(formElement.uuid, true, undefined));
        if (_.isEmpty(allRules)) return defaultFormElementStatus;
        return [...allRules
            .map(r => r.fn.exec(entity, formElementGroup, new Date()))
            .reduce((all, curr) => all.concat(curr), defaultFormElementStatus)
            .reduce((acc, fs) => acc.set(fs.uuid, fs), new Map())
            .values()];
    }

    getAllRuleItemsFor(entity, type) {
        const entityType = entity.constructor.schema.name;
        const applicableRules = RuleRegistry.getRulesFor(entity.uuid, type, entityType);
        const additionalRules = this.getService(RuleService).getApplicableRules(entity, type, entityType);
        return _.sortBy(applicableRules.concat(additionalRules), (r) => r.executionOrder);
    }

    isEligibleForEncounter(individual, encounterType) {
        const applicableRules = this.getAllRuleItemsFor(encounterType, "EncounterEligibilityCheck");
        return _.isEmpty(applicableRules)? true: _.last(applicableRules).fn.exec({individual});
    }

    isEligibleForProgram(individual, program) {
        const applicableRules = this.getAllRuleItemsFor(program, "EnrolmentEligibilityCheck");
        return _.isEmpty(applicableRules)? true: _.last(applicableRules).fn.exec({individual});
    }

    runOnAll(rulesToRun) {
        const conceptService = this.getService(ConceptService);
        const programEnrolmentService = this.getService(ProgramEnrolmentService);
        const individualService = this.getService(IndividualService);
        const encounterService = this.getService(IndividualEncounterService);
        const programEncounterService = this.getService(ProgramEncounterService);
        const getAllEntitiesOfType = {
            "Individual": () => this.getAll(Individual.schema.name).filtered('voided = null or voided = false'),
            "Encounter": () => this.getAll(Encounter.schema.name),
            "ProgramEnrolment": () =>
                this.getAll(ProgramEnrolment.schema.name).filtered('programExitDateTime!=null'),
            "ProgramEncounter": () => this.getAll(ProgramEncounter.schema.name).filtered('encounterDateTime != null and cancelDateTime = null')
        };
        const saveEntityOfType = {
            "Individual": (individual) => individualService.register(individual),
            "Encounter": (encounter) => encounterService.saveOrUpdate(encounter),
            "ProgramEnrolment": (enrolment, nextScheduledVisits) =>
                programEnrolmentService.enrol(enrolment, this.getChecklists(enrolment, "ProgramEnrolment"), nextScheduledVisits),
            "ProgramEncounter": (entity, nextScheduledVisits) => programEncounterService.saveOrUpdate(entity, nextScheduledVisits)
        };
        rulesToRun.map(([schema, type]) => {
            let allEntities = getAllEntitiesOfType[schema]().map(e => e.cloneForEdit());
            allEntities.forEach((entity, idx) => {
                let nextScheduledVisits = [];
                switch (type) {
                    case Rule.types.Decision: {
                        General.logDebug('RuleEvaluationService', `${schema} - Running ${Rule.types.Decision} on ${idx + 1}/${allEntities.length}`);
                        const decisions = this.getDecisions(entity, schema);
                        conceptService.addDecisions(entity.observations, decisions.enrolmentDecisions);
                        conceptService.addDecisions(entity.observations, decisions.encounterDecisions);
                        conceptService.addDecisions(entity.observations, decisions.registrationDecisions);
                        break;
                    }
                    case Rule.types.VisitSchedule: {
                        General.logDebug('RuleEvaluationService', `${schema} - Running ${Rule.types.VisitSchedule} on ${idx + 1}/${allEntities.length}`);
                        nextScheduledVisits = this.getNextScheduledVisits(entity, schema);
                        break;
                    }
                    default:
                        break;
                }
                saveEntityOfType[schema](entity, nextScheduledVisits);
            });
        });
    }
}

export default RuleEvaluationService;
