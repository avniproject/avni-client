import Service from "../framework/bean/Service";
import _ from "lodash";
import BaseService from "./BaseService";
import {
    ChecklistDetail,
    Encounter,
    EntityRule,
    FormElementStatus,
    Individual,
    Observation,
    ProgramEncounter,
    ProgramEnrolment,
    Rule,
    RuleFailureTelemetry,
} from 'avni-models';
import {
    encounterDecision,
    familyRegistrationDecision,
    individualRegistrationDecision,
    programEncounterDecision,
    programEnrolmentDecision,
    RuleRegistry,
    common
} from "openchs-health-modules";
import ConceptService from "./ConceptService";
import ProgramEncounterService from "./program/ProgramEncounterService";
import ProgramEnrolmentService from "./ProgramEnrolmentService";
import FormMappingService from "./FormMappingService";
import General from "../utility/General";
import RuleService from "./RuleService";
import IndividualService from "./IndividualService";
import EncounterService from "./EncounterService";
import EntityService from "./EntityService";
import { FormElementStatusBuilder, VisitScheduleBuilder, complicationsBuilder as ComplicationsBuilder } from "rules-config";
import * as rulesConfig from "rules-config";
import lodash from "lodash";
import moment from "moment";

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
            ['ProgramExit', (programEnrolment) => this.formMappingService.findFormForProgramExit(programEnrolment.program, programEnrolment.individual.subjectType)],
            ['ProgramEncounter', (programEncounter) => this.formMappingService.findFormForEncounterType(programEncounter.encounterType, ProgramEncounter.schema.name, programEncounter.programEnrolment.individual.subjectType)],
            ['ChecklistItem', (checklistItem) => checklistItem.detail.form],
            ['ProgramEncounterCancellation', (programEncounter) => this.formMappingService.findFormForCancellingEncounterType(programEncounter.encounterType, programEncounter.programEnrolment.program, programEncounter.programEnrolment.individual.subjectType)],
            ['IndividualEncounterCancellation', (individualEncounter) => this.formMappingService.findFormForCancellingEncounterType(individualEncounter.encounterType, null, individualEncounter.individual.subjectType)]
        ]);
        this.entityRulesMap.forEach((entityRule, key) => {
            entityRule.setFunctions(entityRule.ruleFile);
        });
        this.formMappingService = this.getService(FormMappingService);
        this.conceptService = this.getService(ConceptService);
    }

    getIndividualUUID = (entity, entityName) => {
        switch (entityName) {
            case 'Individual':
                return entity.uuid;
            case 'ProgramEnrolment':
                return entity.individual.uuid;
            case 'ProgramEncounter':
                return entity.programEnrolment.individual.uuid;
            case 'Encounter':
                return entity.individual.uuid;
            case 'WorkList':
                return entity.getCurrentWorkItem().parameters.subjectUUID;
            default:
                return "entity not mapped";
        }
    };

    getEntityDecision(form, entity, context, entityName) {
        const defaultDecisions = {
            "enrolmentDecisions": [],
            "encounterDecisions": [],
            "registrationDecisions": []
        };
        const trimDecisionsMap = (decisionsMap) => {
            const trimmedDecisions = {};
            _.forEach(decisionsMap, (decisions, decisionType) => {
                trimmedDecisions[decisionType] = _.reject(decisions, _.isEmpty);
            });
            return trimmedDecisions;
        };

        if ([form, entity].some(_.isEmpty)) return defaultDecisions;
        const rulesFromTheBundle = this.getAllRuleItemsFor(form, "Decision", "Form");

        if (_.isEmpty(rulesFromTheBundle)) {
            if (!_.isNil(form.decisionRule) && !_.isEmpty(_.trim(form.decisionRule))) {
                const individualUUID = this.getIndividualUUID(entity, entityName);
                try {
                    const ruleFunc = eval(form.decisionRule);
                    const ruleDecisions = ruleFunc({
                        params: { decisions: defaultDecisions, entity },
                        imports: { rulesConfig, common, lodash, moment }
                    });
                    const decisionsMap = this.validateDecisions(ruleDecisions, form.uuid, individualUUID);
                    const trimmedDecisions = trimDecisionsMap(decisionsMap);
                    General.logDebug("RuleEvaluationService", trimmedDecisions);
                    return trimmedDecisions;
                } catch (e) {
                    console.log(`form.uuid: ${form.uuid} entityName: ${entityName}`);
                    this.saveFailedRules(e, form.uuid, individualUUID);
                }
            }
        } else {
            const decisionsMap = rulesFromTheBundle.reduce((decisions, rule) => {
                const d = this.runRuleAndSaveFailure(rule, entityName, entity, decisions, new Date(), context);
                return this.validateDecisions(d, rule.uuid, this.getIndividualUUID(entity, entityName));
            }, defaultDecisions);
            const trimmedDecisions = trimDecisionsMap(decisionsMap);
            General.logDebug("RuleEvaluationService", trimmedDecisions);
            return trimmedDecisions;
        }
        return defaultDecisions;
    }

    //this is required because we check for the concept name after generating decisions
    validateDecisions(decisionsMap, ruleUUID, individualUUID) {
        return _.merge(..._.map(decisionsMap, (decisions, decisionType) => {
            return {
                [decisionType]: decisions
                    .filter(decision => this.checkConceptForRule(decision.name, ruleUUID, individualUUID))
                    .map(decision => this.filterValues(decision, ruleUUID, individualUUID))
            }
        }));
    }

    filterValues(decision, ruleUUID, individualUUID) {
        const nameConcept = this.conceptService.findConcept(decision.name);
        decision.value = nameConcept.datatype !== 'Coded' ? decision.value : decision.value.filter(conceptName => this.checkConceptForRule(conceptName, ruleUUID, individualUUID));
        return decision;
    }

    checkConceptForRule(conceptName, ruleUUID, individualUUID) {
        try {
            this.conceptService.findConcept(conceptName);
            return true;
        } catch (error) {
            this.saveFailedRules(error, ruleUUID, individualUUID);
            return false;
        }
    }

    getDecisions(entity, entityName, context) {
        const formMapKey = _.get(context, 'usage') === 'Exit' ? 'ProgramExit' : entityName;
        const form = this.entityFormMap.get(formMapKey)(entity);
        return this.getEntityDecision(form, entity, context, entityName);
    }

    updateWorkLists(workLists, context) {
        const additionalRules = this.getService(RuleService).getRulesByType('WorkListUpdation');
        return _.reduce(additionalRules, (newWorkLists, rule) => this.runRuleAndSaveFailure(rule, 'WorkList', workLists, null, null, context), workLists);
    }

    runRuleAndSaveFailure(rule, entityName, entity, ruleTypeValue, config, context) {
        try {
            if (entityName === 'WorkList') {
                ruleTypeValue = entity;
                return rule.fn.exec(entity, context)
            } else {
                return _.isNil(context) ?
                    rule.fn.exec(entity, ruleTypeValue, config) :
                    rule.fn.exec(entity, ruleTypeValue, context, config);
            }
        } catch (error) {
            General.logDebug("Rule-Failure", `Rule failed: ${rule.name}, uuid: ${rule.uuid}`);
            this.saveFailedRules(error, rule.uuid, this.getIndividualUUID(entity, entityName));
            return ruleTypeValue;
        }
    }

    failedRuleExistsInDB(ruleUUID, errorMessage, individualUUID) {
        return this.getAll(RuleFailureTelemetry.schema.name)
            .filtered('ruleUuid=$0 AND errorMessage=$1 AND individualUuid=$2',
                ruleUUID,
                errorMessage,
                individualUUID
            ).length > 0;
    }

    saveFailedRules(error, ruleUUID, individualUUID) {
        if (!this.failedRuleExistsInDB(ruleUUID, error.message, individualUUID)) {
            const entityService = this.getService(EntityService);
            let ruleFailureTelemetry = RuleFailureTelemetry.create({
                errorMessage: error.message,
                stacktrace: error.stack,
                ruleUUID: ruleUUID,
                individualUUID: individualUUID,
            });
            entityService.saveAndPushToEntityQueue(ruleFailureTelemetry, RuleFailureTelemetry.schema.name);
        }
    }

    //check if summary name is present in concepts
    validateSummaries(s, ruleUUID, individualUUID) {
        return s.filter(obj => this.checkConceptForRule(obj.name, ruleUUID, individualUUID))
    }

    getEnrolmentSummaryFromCore(entityName, enrolment, context) {
        try {
            return this.entityRulesMap.get(entityName).getEnrolmentSummary(enrolment, context);
        } catch (error) {
            this.saveFailedRules(error, '', this.getIndividualUUID(enrolment, entityName));
            return [];
        }
    }

    getEnrolmentSummary(enrolment, entityName = 'ProgramEnrolment', context) {
        const program = enrolment.program;
        let rulesFromTheBundle = this.getAllRuleItemsFor(program, "EnrolmentSummary", "Program");
        if (_.isEmpty(rulesFromTheBundle)) {
            if (!_.isNil(program.enrolmentSummaryRule) && !_.isEmpty(_.trim(program.enrolmentSummaryRule))) {
                return this._getEnrolmentSummaryFromEntityRule(enrolment, entityName);
            }
        } else {
            return this._getEnrolmentSummaryFromBundledRules(rulesFromTheBundle, enrolment, entityName, context);
        }
        return [];
    }

    _getEnrolmentSummaryFromBundledRules(rulesFromTheBundle, enrolment, entityName, context) {
        const summaries = this.getEnrolmentSummaryFromCore(entityName, enrolment, context);
        const updatedSummaries = rulesFromTheBundle
            .reduce((summaries, rule) => {
                const s = this.runRuleAndSaveFailure(rule, entityName, enrolment, summaries, new Date(), context);
                return this.validateSummaries(s, rule.uuid, this.getIndividualUUID(enrolment, entityName));
            }, summaries);
        const summaryObservations = _.map(updatedSummaries, (summary) => {
            const concept = this.conceptService.conceptFor(summary.name);
            return Observation.create(concept, concept.getValueWrapperFor(summary.value), summary.abnormal);
        });
        General.logDebug("RuleEvaluationService - Summary Observations", summaryObservations);
        return summaryObservations;
    }

    _getEnrolmentSummaryFromEntityRule(enrolment, entityName) {
        const program = enrolment.program;
        try {
            const ruleFunc = eval(program.enrolmentSummaryRule);
            let summaries = ruleFunc({
                params: { summaries: [], programEnrolment: enrolment },
                imports: { rulesConfig, common, lodash, moment }
            });
            summaries = this.validateSummaries(summaries, enrolment.uuid);
            const summaryObservations = _.map(summaries, (summary) => {
                const concept = this.conceptService.conceptFor(summary.name);
                return Observation.create(concept, concept.getValueWrapperFor(summary.value), summary.abnormal);
            });
            return summaryObservations;
        } catch (e) {
            General.logDebug("Rule-Failure",
                `New Enrolment Summary Rule failed for: ${enrolment.program.name} program`);
            this.saveFailedRules(e, enrolment.uuid, this.getIndividualUUID(enrolment, entityName));
            return [];
        }
    }

    validateAgainstRule(entity, form, entityName) {
        const defaultValidationErrors = [];
        if ([entity, form].some(_.isEmpty)) return defaultValidationErrors;
        const rulesFromTheBundle = this.getAllRuleItemsFor(form, "Validation", "Form")
        if (_.isEmpty(rulesFromTheBundle)) {
            if (!_.isNil(form.validationRule) && !_.isEmpty(_.trim(form.validationRule))) {
                try {
                    const ruleFunc = eval(form.validationRule);
                    return ruleFunc({
                        params: { entity },
                        imports: { rulesConfig, common, lodash, moment }
                    });
                } catch (e) {
                    console.log(e);
                    General.logDebug("Rule-Failure", `New enrolment decision failed for: ${form.name} form name`);
                    this.saveFailedRules(e, form.uuid, this.getIndividualUUID(form, entityName));
                }
            }
        }
        else {
            const validationErrors = rulesFromTheBundle.reduce(
                (validationErrors, rule) => this.runRuleAndSaveFailure(rule, entityName, entity, validationErrors),
                defaultValidationErrors
            );
            General.logDebug("RuleEvaluationService - Validation Errors", validationErrors);
            return validationErrors;
        }
        return defaultValidationErrors;
    }

    getNextScheduledVisits(entity, entityName, visitScheduleConfig) {
        const defaultVisitSchedule = [];
        const form = this.entityFormMap.get(entityName)(entity);
        if (!_.isFunction(entity.getAllScheduledVisits) && [entity, form].some(_.isEmpty)) return defaultVisitSchedule;
        const scheduledVisits = entity.getAllScheduledVisits(entity);
        const rulesFromTheBundle = this.getAllRuleItemsFor(form, "VisitSchedule", "Form");
        if (_.isEmpty(rulesFromTheBundle)) {
            if (!_.isNil(form.visitScheduleRule) && !_.isEmpty(_.trim(form.visitScheduleRule))) {
                try {
                    const ruleFunc = eval(form.visitScheduleRule);
                    const nextVisits = ruleFunc({
                        params: { visitSchedule: scheduledVisits, entity },
                        imports: { rulesConfig, common, lodash, moment }
                    });
                    return nextVisits;
                } catch (e) {
                    General.logDebug("Rule-Failure", `New enrolment decision failed for form: ${form.uuid}`);
                    this.saveFailedRules(e, form.uuid, this.getIndividualUUID(entity, entityName));
                }
            }
        } else {
            const nextVisits = rulesFromTheBundle
                .reduce((schedule, rule) => {
                    General.logDebug(`RuleEvaluationService`, `Executing Rule: ${rule.name} Class: ${rule.fnName}`);
                    return this.runRuleAndSaveFailure(rule, entityName, entity, schedule, visitScheduleConfig);
                }, scheduledVisits);
            General.logDebug("RuleEvaluationService - Next Visits", nextVisits);
            return nextVisits;
        }
        return defaultVisitSchedule;
    }

    getChecklists(entity, entityName, defaultChecklists = []) {
        const form = this.entityFormMap.get(entityName)(entity);
        const allChecklistDetails = this.findAll(ChecklistDetail.schema.name);
        if ([entity, form, allChecklistDetails].some(_.isEmpty)) return defaultChecklists;
        const allChecklists = this.getAllRuleItemsFor(form, "Checklists", "Form")
            .reduce((checklists, rule) => this.runRuleAndSaveFailure(rule, entityName, entity, allChecklistDetails), defaultChecklists);
        // General.logDebug("RuleEvaluationService - Checklists", allChecklists);
        return allChecklists;
    }

    getFormElementsStatuses(entity, entityName, formElementGroup) {
        if ([entity, formElementGroup, formElementGroup.form].some(_.isEmpty)) return [];
        const rulesFromTheBundle = this.getAllRuleItemsFor(formElementGroup.form, "ViewFilter", "Form");
        const defaultFormElementStatus = formElementGroup.getFormElements()
            .map((formElement) => new FormElementStatus(formElement.uuid, true, undefined));
        if (_.isEmpty(rulesFromTheBundle)) {
            const formElementWithRules = formElementGroup
                .getFormElements()
                .filter(formElement => !_.isNil(formElement.rule) && !_.isEmpty(_.trim(formElement.rule)));
            if (_.isEmpty(formElementWithRules))
                return defaultFormElementStatus;
            return [...formElementWithRules
                .map(formElement => {
                    try {
                        const ruleFunc = eval(formElement.rule);
                        return ruleFunc({
                            params: { formElement, entity },
                            imports: { rulesConfig, common, lodash, moment }
                        });
                    } catch (e) {
                        General.logDebug("Rule-Failure", `New Rule failed for: ${formElement.name}`);
                        this.saveFailedRules(e, formElement.uuid, this.getIndividualUUID(entity, entityName));
                        return null;
                    }
                })
                .filter(fs => !_.isNil(fs))
                .reduce((all, curr) => all.concat(curr), defaultFormElementStatus)
                .reduce((acc, fs) => acc.set(fs.uuid, fs), new Map())
                .values()];
        }
        return [...rulesFromTheBundle
            .map(r => this.runRuleAndSaveFailure(r, entityName, entity, formElementGroup, new Date()))
            .reduce((all, curr) => all.concat(curr), defaultFormElementStatus)
            .reduce((acc, fs) => acc.set(fs.uuid, fs), new Map())
            .values()];
    }

    getAllRuleItemsFor(entity, type, entityTypeHardCoded) {
        const entityType = _.get(entity, 'constructor.schema.name', entityTypeHardCoded);
        const applicableRules = RuleRegistry.getRulesFor(entity.uuid, type, entityType);


        const additionalRules = this.getService(RuleService).getApplicableRules(entity, type, entityType);
        return _.sortBy(applicableRules.concat(additionalRules), (r) => r.executionOrder);
    }

    isEligibleForEncounter(individual, encounterType) {
        const rulesFromTheBundle = this.getAllRuleItemsFor(encounterType, "EncounterEligibilityCheck", "EncounterType");
        if (_.isEmpty(rulesFromTheBundle)) {
            if (!_.isNil(encounterType.encounterEligibilityCheckRule) && !_.isEmpty(_.trim(encounterType.encounterEligibilityCheckRule))) {
                try {
                    const ruleFunc = eval(encounterType.encounterEligibilityCheckRule)
                    return ruleFunc({
                        params: { entity: individual },
                        imports: { rulesConfig, common, lodash, moment }
                    });
                }
                catch (e) {
                    General.logDebug("Rule-Faiure", e);
                    General.logDebug("Rule-Failure", `New encounter eligibility failed for: ${encounterType.name} encounter name`);
                    this.saveFailedRules(e, encounterType.uuid, this.getIndividualUUID(encounterType));
                }
            }
        }
        else {
            return this.runRuleAndSaveFailure(_.last(rulesFromTheBundle), 'Encounter', { individual }, true);
        }
        return true;
    }

    isEligibleForProgram(individual, program) {
        const rulesFromTheBundle = this.getAllRuleItemsFor(program, "EnrolmentEligibilityCheck", "Program");
        if (_.isEmpty(rulesFromTheBundle)) {
            if (!_.isNil(program.enrolmentEligibilityCheckRule) && !_.isEmpty(_.trim(program.enrolmentEligibilityCheckRule))) {
                try {
                    const ruleFunc = eval(program.enrolmentEligibilityCheckRule);
                    return ruleFunc({
                        params: { entity: individual },
                        imports: { rulesConfig, common, lodash, moment }
                    });
                }
                catch (e) {
                    General.logDebug("Rule-Failure", e);
                    General.logDebug("Rule-Failure", `New enrolment eligibility failed for: ${program.name} program name`);
                    this.saveFailedRules(e, program.uuid, this.getIndividualUUID(program));
                }
            }
        }
        else {
            return this.runRuleAndSaveFailure(_.last(rulesFromTheBundle), 'Encounter', { individual }, true);
        }
        return true;
    }

    runOnAll(rulesToRun) {
        const conceptService = this.getService(ConceptService);
        const programEnrolmentService = this.getService(ProgramEnrolmentService);
        const individualService = this.getService(IndividualService);
        const encounterService = this.getService(EncounterService);
        const programEncounterService = this.getService(ProgramEncounterService);
        const getAllEntitiesOfType = {
            "Individual": () => this.getAll(Individual.schema.name).filtered('voided = null or voided = false'),
            "Encounter": () => this.getAll(Encounter.schema.name).filtered('encounterDateTime != null and cancelDateTime = null'),
            "ProgramEnrolment": () => this.getAll(ProgramEnrolment.schema.name).filtered('programExitDateTime!=null'),
            "ProgramEncounter": () => this.getAll(ProgramEncounter.schema.name).filtered('encounterDateTime != null and cancelDateTime = null')
        };
        const saveEntityOfType = {
            "Individual": (individual, nextScheduledVisits) => individualService.register(individual, nextScheduledVisits),
            "Encounter": (encounter, nextScheduledVisits) => encounterService.saveOrUpdate(encounter, nextScheduledVisits),
            "ProgramEnrolment": (enrolment, nextScheduledVisits) => programEnrolmentService.enrol(enrolment, this.getChecklists(enrolment, "ProgramEnrolment"), nextScheduledVisits),
            "ProgramEncounter": (entity, nextScheduledVisits) => programEncounterService.saveOrUpdate(entity, nextScheduledVisits).sorted('encounterDateTime')
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
