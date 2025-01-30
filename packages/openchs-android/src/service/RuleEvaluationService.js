import Service from "../framework/bean/Service";
import _ from "lodash";
import lodash from "lodash";
import BaseService from "./BaseService";
import * as models from 'avni-models';
import {
    ChecklistDetail,
    Encounter,
    EntityRule,
    FormElementStatus,
    Individual,
    Observation,
    OrganisationConfig,
    ProgramEncounter,
    ProgramEnrolment,
    Rule,
    RuleFailureTelemetry
} from 'avni-models';
import {
    common,
    encounterDecision,
    familyRegistrationDecision,
    individualRegistrationDecision,
    motherCalculations,
    programEncounterDecision,
    programEnrolmentDecision,
    RuleRegistry
} from "avni-health-modules";
import ConceptService from "./ConceptService";
import ProgramEncounterService from "./program/ProgramEncounterService";
import ProgramEnrolmentService from "./ProgramEnrolmentService";
import FormMappingService from "./FormMappingService";
import General from "../utility/General";
import RuleService from "./RuleService";
import IndividualService from "./IndividualService";
import EncounterService from "./EncounterService";
import EntityService from "./EntityService";
import * as rulesConfig from "rules-config";
import {EditFormRuleResponse} from "rules-config";
import moment from "moment";
import GroupSubjectService from "./GroupSubjectService";
import ProgramService from "./program/ProgramService";
import individualServiceFacade from "./facade/IndividualServiceFacade";
import addressLevelServiceFacade from "./facade/AddressLevelServiceFacade";
import MessageService from './MessageService';
import {Groups, ReportCardResult, NestedReportCardResult, RuleDependency} from "openchs-models";
import {JSONStringify} from "../utility/JsonStringify";
import UserInfoService from "./UserInfoService";
import PrivilegeService from './PrivilegeService';
import AuthService from "./AuthService";

const GlobalRuleUUID = "8ae72815-5670-40a4-b8b6-e457d0dff8ad";

function getImports(globalFn) {
    return {rulesConfig, common, lodash, moment, motherCalculations, log: console.log, globalFn};
}

function executeLineListFunction(lineListFunction, reportCard, saveFailedRules) {
    try {
        return lineListFunction();
    } catch (e) {
        General.logDebug("Rule-Failure", `LineList function failed for ReportCard: ${reportCard.name}, ${reportCard.uuid}`);
        General.logDebug("Rule-Failure", e);
        saveFailedRules(e, reportCard.uuid, '', 'ReportCard', reportCard.uuid, null, null);
        return [];
    }
}

function getGlobalRuleFunction(ruleService) {
    const globalRuleDependency = ruleService.findByUUID(GlobalRuleUUID, RuleDependency.schema.name);
    if (!_.isNil(globalRuleDependency)) {
        try {
            return eval(globalRuleDependency.code);
        } catch (e) {
            General.logDebug("RuleEvaluationService", "Global Rule failed");
            General.logError("RuleEvaluationService", e);
            ruleService.saveFailedRules(e, GlobalRuleUUID, null, 'GlobalRule', GlobalRuleUUID, null, null);
        }
        return null;
    }
}

@Service("ruleEvaluationService")
class RuleEvaluationService extends BaseService {
    constructor(db, context) {
        super(db, context);
        this.getEntityDecision = this.getEntityDecision.bind(this);

        //this is deprecated
        global.ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
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
        this.I18n = this.getService(MessageService).getI18n();
        this.formMappingService = this.getService(FormMappingService);
        this.conceptService = this.getService(ConceptService);
        this.groupSubjectService = this.getService(GroupSubjectService);
        this.services = {
            individualService: individualServiceFacade,
            addressLevelService: addressLevelServiceFacade,
        };
        this.globalRuleFunction = getGlobalRuleFunction(this);
    }

    getIndividualUUID(entity, entityName) {
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
                return entity.getCurrentWorkItem().id;
            default:
                return "entity not mapped";
        }
    };

    getEntityDecision(form, entity, context, entityName, entityContext) {
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

        if (!_.isNil(form.decisionRule) && !_.isEmpty(_.trim(form.decisionRule))) {
            const individualUUID = this.getIndividualUUID(entity, entityName);
            try {
                let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
                const ruleFunc = eval(form.decisionRule);
                const ruleDecisions = ruleFunc({
                    params: _.merge({decisions: defaultDecisions, entity, entityContext, services: this.services}, this.getCommonParams()),
                    imports: getImports(this.globalRuleFunction)
                });
                const decisionsMap = this.validateDecisions(ruleDecisions, form.uuid, individualUUID);
                const trimmedDecisions = trimDecisionsMap(decisionsMap);
                General.logDebug("RuleEvaluationService", trimmedDecisions);
                return trimmedDecisions;
            } catch (e) {
                General.logDebug("RuleEvaluationService", `form.uuid: ${form.uuid} entityName: ${entityName}`);
                this.saveFailedRules(e, form.uuid, individualUUID,
                    'Decision', form.uuid, entityName, entity.uuid);
            }
        } else {
            const decisionsMap = rulesFromTheBundle.reduce((decisions, rule) => {
                const d = this.runRuleAndSaveFailure(rule, entityName, entity, decisions, new Date(), context, entityContext);
                return this.validateDecisions(d, rule.uuid, this.getIndividualUUID(entity, entityName));
            }, defaultDecisions);
            const trimmedDecisions = trimDecisionsMap(decisionsMap);
            General.logDebug("RuleEvaluationService", trimmedDecisions);
            return trimmedDecisions;
        }
        return defaultDecisions;
    }

    getRuleServiceLibraryInterfaceForSharingModules() {
        return {
            log: console.log,
            common,
            motherCalculations,
            models
        };
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
        const values = _.flatten([decision.value]);
        decision.value = nameConcept.datatype !== 'Coded' ? decision.value : values.filter(conceptName => this.checkConceptForRule(conceptName, ruleUUID, individualUUID));
        return decision;
    }

    checkConceptForRule(conceptName, ruleUUID, individualUUID) {
        try {
            this.conceptService.findConcept(conceptName);
            return true;
        } catch (error) {
            this.saveFailedRules(error, ruleUUID, individualUUID,
                'Validation', ruleUUID, 'Individual', individualUUID);
            return false;
        }
    }

    getDecisions(entity, entityName, context, entityContext = {}) {
        const formMapKey = _.get(context, 'usage') === 'Exit' ? 'ProgramExit' : entityName;
        const form = this.entityFormMap.get(formMapKey)(entity);
        return this.getEntityDecision(form, entity, context, entityName, entityContext);
    }

    updateWorkLists(workLists, context, entityName) {
        const orgConfig = this.findOnly(OrganisationConfig.schema.name);
        if (_.isEmpty(orgConfig)) return workLists;
        const worklistUpdationRule = orgConfig.worklistUpdationRule;
        if (!_.isNil(worklistUpdationRule) && !_.isEmpty(_.trim(worklistUpdationRule))) {
            try {
                const ruleFunc = eval(worklistUpdationRule);
                return ruleFunc({
                    params: _.merge({context, workLists, services: this.services}, this.getCommonParams()),
                    imports: {rulesConfig, common, lodash, moment, models, globalFn: this.globalRuleFunction}
                });
            } catch (e) {
                General.logDebug("Rule-Failure", `New worklist updation rule failed  ${orgConfig.uuid} `);
                this.saveFailedRules(e, orgConfig.uuid, this.getIndividualUUID(workLists, "WorkList"),
                    'WorkListUpdation', orgConfig.uuid, entityName, context.entity.uuid);
            }
        } else {
            const additionalRules = this.getService(RuleService).getRulesByType('WorkListUpdation');
            return _.reduce(additionalRules, (newWorkLists, rule) => this.runRuleAndSaveFailure(rule, 'WorkList', workLists, null, null, context), workLists);
        }

        return workLists;
    }

    runEditFormRule(form, entity, entityName) {
        if (_.isEmpty(form.editFormRule)) {
            return EditFormRuleResponse.createEditAllowedResponse();
        } else {
            try {
                const ruleFunc = eval(form.editFormRule);
                const ruleResponse = ruleFunc({
                    params: _.merge({entity, form, services: this.services}, this.getCommonParams()),
                    imports: getImports(this.globalRuleFunction)
                });
                return EditFormRuleResponse.createEditRuleResponse(ruleResponse);
            } catch (e) {
                General.logDebug("Rule-Failure", `EditFormRule failed: ${JSONStringify(e)}`);
                this.saveFailedRules(e, form.uuid, this.getIndividualUUID(entity, entityName), 'EditForm', form.uuid, entityName, entity.uuid);
                return EditFormRuleResponse.createEditAllowedResponse();
            }
        }
    }

    runRuleAndSaveFailure(rule, entityName, entity, ruleTypeValue, config, context, entityContext) {
        try {
            if (entityName === 'WorkList') {
                ruleTypeValue = entity;
                return rule.fn.exec(entity, context, entityContext)
            } else {
                General.logDebug("Rule-to-run", `Rule context and config: ${JSONStringify(context)}, ${JSONStringify(config)}, ${JSONStringify(entityContext)}`);
                General.logDebug("Rule-to-run", `Rule function: ${rule.name}, uuid: ${rule.uuid}, ${JSONStringify(rule.fn)}`);
                return _.isNil(context) ?
                    rule.fn.exec(entity, ruleTypeValue, config, entityContext) :
                    rule.fn.exec(entity, ruleTypeValue, context, config, entityContext);
            }
        } catch (error) {
            General.logDebug("Rule-Failure", `Rule failed: ${rule.name}, uuid: ${rule.uuid}`, error.message);
            this.saveFailedRules(error, rule.uuid, this.getIndividualUUID(entity, entityName),
                'Decision', rule.uuid, entityName, entity.uuid);
            return ruleTypeValue;
        }
    }

    failedRuleExistsInDB(ruleUUID, errorMessage, individualUUID, sourceId, entityId) {
        return this.getAll(RuleFailureTelemetry.schema.name)
            .filtered('ruleUuid=$0 AND errorMessage=$1 AND individualUuid=$2 AND sourceId=$3 AND entityId=$4',
                ruleUUID,
                errorMessage,
                individualUUID,
                sourceId,
                entityId
            ).length > 0;
    }

    saveFailedRules(error, ruleUUID, individualUUID, sourceType, sourceUUID, entityType, entityUUID) {
        if (!this.failedRuleExistsInDB(ruleUUID, error.message, individualUUID, sourceUUID, entityUUID)) {
            const entityService = this.getService(EntityService);
            let ruleFailureTelemetry = RuleFailureTelemetry.create({
                errorMessage: error.message,
                stacktrace: error.stack,
                ruleUUID: ruleUUID,
                individualUUID: individualUUID,
                sourceType: sourceType,
                sourceId: sourceUUID,
                entityType: entityType,
                entityId: entityUUID,
                appType: 'Android'
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
            this.saveFailedRules(error, '', this.getIndividualUUID(enrolment, entityName),
                'EnrolmentSummary', enrolment.program.uuid, entityName, enrolment.uuid);
            return [];
        }
    }

    getEnrolmentSummary(enrolment, entityName = 'ProgramEnrolment', context) {
        const program = enrolment.program;
        let rulesFromTheBundle = this.getAllRuleItemsFor(program, "EnrolmentSummary", "Program");
        if (!_.isNil(program.enrolmentSummaryRule) && !_.isEmpty(_.trim(program.enrolmentSummaryRule))) {
            return this._getEnrolmentSummaryFromEntityRule(enrolment, entityName);
        } else if (!_.isEmpty(rulesFromTheBundle)) {
            return this._getEnrolmentSummaryFromBundledRules(rulesFromTheBundle, enrolment, entityName, context);
        }
        return [];
    }

    getSubjectSummary(individual, entityName = 'Individual', context) {
        const subjectType = individual.subjectType;
        if (!_.isNil(subjectType.subjectSummaryRule) && !_.isEmpty(_.trim(subjectType.subjectSummaryRule))) {
            try {
                let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
                const ruleFunc = eval(subjectType.subjectSummaryRule);
                let summaries = ruleFunc({
                    params: _.merge({summaries: [], individual, context, services: this.services}, this.getCommonParams()),
                    imports: getImports(this.globalRuleFunction)
                });
                summaries = this.validateSummaries(summaries, subjectType.uuid, this.getIndividualUUID(individual, entityName));
                return _.map(summaries, (summary) => {
                    const concept = this.conceptService.conceptFor(summary.name);
                    return Observation.create(concept, concept.getValueWrapperFor(summary.value), summary.abnormal);
                });
            } catch (e) {
                General.logDebug("Rule-Failure",
                    `Subject Summary Rule failed for: ${subjectType.name} Subject type`);
                this.saveFailedRules(e, subjectType.uuid, this.getIndividualUUID(individual, entityName),
                    'SubjectSummary', subjectType.uuid, entityName, individual.uuid);
                return [];
            }
        }
        return [];
    }

    validatedStatuses(subjectProgramEligibilityStatuses) {
        const individualService = this.getService(IndividualService);
        const programService = this.getService(ProgramService);
        return _.filter(subjectProgramEligibilityStatuses, ({subjectUUID, programUUID}) =>
            individualService.existsByUuid(subjectUUID) && programService.existsByUuid(programUUID));
    }

    async getSubjectProgramEligibilityStatuses(individual, programs, authToken) {
        const subjectType = individual.subjectType;
        try {
            let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
            const ruleFunc = eval(subjectType.programEligibilityCheckRule);
            const subjectProgramEligibilityStatuses = await ruleFunc({
                params: _.merge({individual, programs, authToken, services: this.services}, this.getCommonParams()),
                imports: getImports(this.globalRuleFunction)
            });
            const validStatuses = this.validatedStatuses(subjectProgramEligibilityStatuses);
            if (_.size(validStatuses) !== _.size(subjectProgramEligibilityStatuses)) {
                General.logDebug("RuleEvaluationService", `Skipped some statuses as valid program or subject cannot be found in the system`);
            }
            return validStatuses;
        } catch (e) {
            General.logDebug("Rule-Failure",
                `Subject Program Eligibility Rule failed for: ${subjectType.name} Subject type ${e.message} ${e.stack}`);
            this.saveFailedRules(e, subjectType.uuid, this.getIndividualUUID(individual, 'Individual'),
                'EnrolmentEligibilityCheck', subjectType.uuid, 'Individual', individual.uuid);
            throw Error(e.message);
        }
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
            let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
            const ruleFunc = eval(program.enrolmentSummaryRule);
            let summaries = ruleFunc({
                params: _.merge({summaries: [], programEnrolment: enrolment, services: this.services}, this.getCommonParams()),
                imports: getImports(this.globalRuleFunction)
            });
            summaries = this.validateSummaries(summaries, enrolment.uuid, enrolment.individual.uuid);
            const summaryObservations = _.map(summaries, (summary) => {
                const concept = this.conceptService.conceptFor(summary.name);
                return Observation.create(concept, concept.getValueWrapperFor(summary.value), summary.abnormal);
            });
            return summaryObservations;
        } catch (e) {
            General.logDebug("Rule-Failure",
                `New Enrolment Summary Rule failed for: ${enrolment.program.name} program`);
            this.saveFailedRules(e, program.uuid, this.getIndividualUUID(enrolment, entityName),
                'EnrolmentSummary', program.uuid, entityName, enrolment.uuid);
            return [];
        }
    }

    validateAgainstRule(entity, form, entityName, entityContext = {}) {
        const defaultValidationErrors = [];
        if ([entity, form].some(_.isEmpty)) return defaultValidationErrors;
        const rulesFromTheBundle = this.getAllRuleItemsFor(form, "Validation", "Form")
        if (!_.isNil(form.validationRule) && !_.isEmpty(_.trim(form.validationRule))) {
            return this.validateViaFormRule(form, entity, entityContext, entityName);
        } else if (!_.isEmpty(rulesFromTheBundle)) {
            return this._validateViaBundleRule(rulesFromTheBundle, entityName, entity, entityContext, defaultValidationErrors);
        } else {
            return defaultValidationErrors;
        }
    }

    async validateAgainstRuleAsync(entity, form, entityName, entityContext = {}) {
        const defaultValidationErrors = [];
        if ([entity, form].some(_.isEmpty)) return defaultValidationErrors;
        const rulesFromTheBundle = this.getAllRuleItemsFor(form, "Validation", "Form")
        if (!_.isNil(form.validationRule) && !_.isEmpty(_.trim(form.validationRule))) {
            return await this.validateViaFormRuleAsync(form, entity, entityContext, entityName);
        } else if (!_.isEmpty(rulesFromTheBundle)) {
            return this._validateViaBundleRule(rulesFromTheBundle, entityName, entity, entityContext, defaultValidationErrors);
        } else {
            return defaultValidationErrors;
        }
    }

    validateViaFormRule(form, entity, entityContext, entityName) {
        try {
            let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
            const ruleFunc = eval(form.validationRule);
            return ruleFunc({
                params: _.merge({entity, entityContext, services: this.services}, this.getCommonParams()),
                imports: getImports(this.globalRuleFunction)
            });
        } catch (e) {
            console.log(e);
            General.logDebug("Rule-Failure", `Validation failed for: ${form.name} form name`);
            this.saveFailedRules(e, form.uuid, this.getIndividualUUID(entity, entityName),
                'Validation', form.uuid, entityName, entity.uuid);
        }
    }

    async validateViaFormRuleAsync(form, entity, entityContext, entityName) {
        return await this.validateViaFormRuleAsyncInternal(form, entity, entityContext, entityName)
            .catch((e) => {
                console.log(e);
                General.logDebug("Rule-Failure", `Validation failed for: ${form.name} form name`);
                this.saveFailedRules(e, form.uuid, this.getIndividualUUID(entity, entityName),
                    'Validation', form.uuid, entityName, entity.uuid);
            });
    }

    async validateViaFormRuleAsyncInternal(form, entity, entityContext, entityName) {
        try {
            let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
            const authService = this.context.getService(AuthService);
            const authToken = await authService.getAuthProviderService().getAuthToken();
            const ruleFunc = eval(form.validationRule);
            return ruleFunc({
                params: _.merge({entity, entityContext, services: this.services, authToken: authToken}, this.getCommonParams()),
                imports: getImports(this.globalRuleFunction)
            });
        } catch (e) {
            console.log(e);
            General.logDebug("Rule-Failure", `Validation failed for: ${form.name} form name`);
            this.saveFailedRules(e, form.uuid, this.getIndividualUUID(entity, entityName),
                'Validation', form.uuid, entityName, entity.uuid);
        }
    }

    _validateViaBundleRule(rulesFromTheBundle, entityName, entity, entityContext, defaultValidationErrors) {
        const validationErrors = rulesFromTheBundle.reduce(
            (validationErrors, rule) => this.runRuleAndSaveFailure(rule, entityName, entity, validationErrors, null, null, entityContext),
            defaultValidationErrors
        );
        General.logDebug("RuleEvaluationService - Validation Errors", validationErrors);
        return validationErrors;
    }

    getNextScheduledVisits(entity, entityName, visitScheduleConfig, entityContext = {}) {
        const defaultVisitSchedule = [];
        const form = this.entityFormMap.get(entityName)(entity);
        if (!_.isFunction(entity.getAllScheduledVisits) && [entity, form].some(_.isEmpty)) return defaultVisitSchedule;
        const scheduledVisits = entity.getAllScheduledVisits(entity);
        const rulesFromTheBundle = this.getAllRuleItemsFor(form, "VisitSchedule", "Form");
        if (!_.isNil(form.visitScheduleRule) && !_.isEmpty(_.trim(form.visitScheduleRule))) {
            try {
                let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
                const ruleFunc = eval(form.visitScheduleRule);
                const nextVisits = ruleFunc({
                    params: _.merge({visitSchedule: scheduledVisits, entity, entityContext, services: this.services}, this.getCommonParams()),
                    imports: getImports(this.globalRuleFunction)
                });
                this.checkIfScheduledVisitsAreValid(nextVisits);
                return nextVisits;
            } catch (e) {
                General.logDebug("Rule-Failure", `Visit Schedule failed for form: ${form.uuid}`);
                this.saveFailedRules(e, form.uuid, this.getIndividualUUID(entity, entityName));
            }
        } else if (!_.isEmpty(rulesFromTheBundle)) {
            const nextVisits = rulesFromTheBundle
                .reduce((schedule, rule) => {
                    General.logDebug(`RuleEvaluationService`, `Executing Rule: ${rule.name} Class: ${rule.fnName}`);
                    return this.runRuleAndSaveFailure(rule, entityName, entity, schedule, visitScheduleConfig, null, entityContext);
                }, scheduledVisits);
            General.logDebug("RuleEvaluationService - Next Visits", nextVisits);
            try {
                this.checkIfScheduledVisitsAreValid(nextVisits);
                return nextVisits;
            } catch (e) {
                General.logDebug("Rule-Failure", `Visit Schedule (old) failed for form: ${form.uuid}`);
                this.saveFailedRules(e, form.uuid, this.getIndividualUUID(entity, entityName));
            }
        }
        return defaultVisitSchedule;
    }

    checkIfScheduledVisitsAreValid(nextVisits) {
        if (_.some(nextVisits, visit => _.isNil(visit.earliestDate))) {
            throw new Error("Visit(s) scheduled without earliestDate");
        }
    }

    getChecklists(entity, entityName, defaultChecklists = []) {
        const form = this.entityFormMap.get(entityName)(entity);
        const allChecklistDetails = this.findAll(ChecklistDetail.schema.name);
        if ([entity, form, allChecklistDetails].some(_.isEmpty)) return defaultChecklists;
        if (!_.isNil(form.checklistsRule) && !_.isEmpty(_.trim(form.checklistsRule))) {
            try {
                const ruleFunc = eval(form.checklistsRule);
                const allChecklists = ruleFunc({
                    params: _.merge({entity, checklistDetails: allChecklistDetails, services: this.services}, this.getCommonParams()),
                    imports: getImports(this.globalRuleFunction)
                });
                return allChecklists;
            } catch (e) {
                General.logDebug("Rule-Failure", `New checklist rule failed for form: ${form.uuid}`);
                this.saveFailedRules(e, form.uuid, this.getIndividualUUID(entity, entityName),
                    'Checklist', form.uuid, entityName, entity.uuid);
            }
        } else {
            const allChecklists = this.getAllRuleItemsFor(form, "Checklists", "Form")
                .reduce((checklists, rule) => this.runRuleAndSaveFailure(rule, entityName, entity, allChecklistDetails), defaultChecklists);
            return allChecklists;
        }
        return defaultChecklists;
    }

    runFormElementGroupRule(formElementGroup, entity, entityName, entityContext, mapOfBundleFormElementStatuses) {
        if (_.isNil(formElementGroup.rule) || _.isEmpty(_.trim(formElementGroup.rule))) {
            return formElementGroup.getFormElements().flatMap((formElement) => {
                if (formElement.groupUuid) {
                    const size = this.getRepeatableObservationSize(formElement, entity);
                    return _.range(size).map(questionGroupIndex => {
                        const formElementStatus = this.getDefaultFormElementStatusIfNotFoundInBundleFESs(mapOfBundleFormElementStatuses, {
                            uuid: formElement.uuid,
                            questionGroupIndex
                        });
                        formElementStatus.addQuestionGroupInformation(questionGroupIndex);
                        return formElementStatus;
                    })
                }
                return this.getDefaultFormElementStatusIfNotFoundInBundleFESs(mapOfBundleFormElementStatuses, {uuid: formElement.uuid, questionGroupIndex: null});
            });
        }
        try {
            let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
            const ruleFunc = eval(formElementGroup.rule);
            return ruleFunc({
                params: _.merge({formElementGroup, entity, services: this.services, entityContext}, this.getCommonParams()),
                imports: getImports(this.globalRuleFunction)
            });
        } catch (e) {
            General.logDebug("Rule-Failure", `New form element group rule failed for: ${formElementGroup.uuid}`);
            this.saveFailedRules(e, formElementGroup.uuid, this.getIndividualUUID(entity, entityName),
                'FormElementGroup', formElementGroup.uuid, entityName, entity.uuid);
        }
    }

    getTheChildFormElementStatues(childFormElement, entity, entityName, entityContext, mapOfBundleFormElementStatuses) {
        const size = this.getRepeatableObservationSize(childFormElement, entity);
        return _.range(size)
            .map(questionGroupIndex => {
                const formElementStatus = this.runFormElementStatusRule(childFormElement, entity, entityName,
                    entityContext, questionGroupIndex, mapOfBundleFormElementStatuses);
                if (formElementStatus)
                    formElementStatus.addQuestionGroupInformation(questionGroupIndex);
                return formElementStatus;
            })
            .filter(fs => !_.isNil(fs))
            .reduce((all, curr) => all.concat(curr), [])
    }

    getRepeatableObservationSize(formElement, entity) {
        const parentFormElement = formElement.getParentFormElement();
        const questionGroupObservations = entity.findObservation(parentFormElement.concept.uuid);
        const questionGroupObs = questionGroupObservations && questionGroupObservations.getValueWrapper();
        return questionGroupObs ? questionGroupObs.size() : 1;
    }

    /**
     * Priority ordering for obtaining final FormElementsStatus of a FormElement is as follows:
     * 1. create a default FormElementsStatus
     * 2. from rulesFromTheBundle
     * 3. from rule defined using AppDesigner
     *
     * @param entity
     * @param entityName
     * @param formElementGroup
     * @param entityContext
     * @returns {any[]|*[]}
     */
    getFormElementsStatuses(entity, entityName, formElementGroup, entityContext = {}) {
        if ([entity, formElementGroup, formElementGroup.form].some(_.isEmpty)) return [];
        const rulesFromTheBundle = this.getAllRuleItemsFor(formElementGroup.form, "ViewFilter", "Form");
        const mapOfBundleFormElementStatuses = (!_.isEmpty(rulesFromTheBundle)) ?
            rulesFromTheBundle
                .map(r => this.runRuleAndSaveFailure(r, entityName, entity, formElementGroup, new Date(), null, entityContext))
                .reduce((all, curr) => all.concat(curr), [])
                .reduce(this.updateMapUsingKeyPattern(), new Map()) : new Map();
        const allFEGFormElements = formElementGroup.getFormElements();
        const formElementStatusAfterGroupRule = this.runFormElementGroupRule(formElementGroup, entity, entityName, entityContext, mapOfBundleFormElementStatuses);
        let mapOfFormElementStatuses = new Map();
        const visibleFormElementsUUIDs = _.filter(formElementStatusAfterGroupRule, ({visibility}) => visibility === true).map(({uuid}) => uuid);
        const applicableFormElements = allFEGFormElements
            .filter((fe) => _.includes(visibleFormElementsUUIDs, fe.uuid));
        if (!_.isEmpty(formElementStatusAfterGroupRule)) {
            mapOfFormElementStatuses = formElementStatusAfterGroupRule
                .reduce(this.updateMapUsingKeyPattern(), mapOfFormElementStatuses);
        }
        if (!_.isEmpty(allFEGFormElements) && !_.isEmpty(visibleFormElementsUUIDs)) {
            mapOfFormElementStatuses = applicableFormElements
                .map(formElement => {
                    if (formElement.groupUuid) {
                        return this.getTheChildFormElementStatues(formElement, entity, entityName, entityContext, mapOfBundleFormElementStatuses);
                    }
                    return this.runFormElementStatusRule(formElement, entity, entityName, entityContext, null, mapOfBundleFormElementStatuses);
                })
                .filter(fs => !_.isNil(fs))
                .reduce((all, curr) => all.concat(curr), [])
                .reduce(this.updateMapUsingKeyPattern(), mapOfFormElementStatuses);
        }
        return [...mapOfFormElementStatuses.values()];
    }

    updateMapUsingKeyPattern() {
        return (acc, fs) => acc.set(`${fs.uuid}-${fs.questionGroupIndex || 0}`, fs);
    }

    runFormElementStatusRule(formElement, entity, entityName, entityContext, questionGroupIndex, mapOfBundleFormElementStatuses) {
        if (_.isNil(formElement.rule) || _.isEmpty(_.trim(formElement.rule))) {
            return this.getDefaultFormElementStatusIfNotFoundInBundleFESs(mapOfBundleFormElementStatuses, {uuid: formElement.uuid, questionGroupIndex});
        }
        try {
            let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
            const ruleFunc = eval(formElement.rule);
            return ruleFunc({
                params: _.merge({formElement, entity, questionGroupIndex, services: this.services, entityContext}, this.getCommonParams()),
                imports: getImports(this.globalRuleFunction)
            });
        } catch (e) {
            General.logDebug("Rule-Failure", `New Rule failed for: ${formElement.name}`);
            this.saveFailedRules(e, formElement.uuid, this.getIndividualUUID(entity, entityName),
                'FormElement', formElement.uuid, entityName, entity.uuid);
            return null;
        }
    }

    /**
     * When we do not have a rule defined for a FormElement,
     * check if a FormElementStatus is available for the same in mapOfBundleFormElementStatuses.
     * If yes, return that, else return a newly created default FormElementStatus.
     *
     * @param mapOfBundleFormElementStatuses
     * @param fs has two properties: uuid and questionGroupIndex
     * @returns {*}
     */
    getDefaultFormElementStatusIfNotFoundInBundleFESs(mapOfBundleFormElementStatuses, fs) {
        return (mapOfBundleFormElementStatuses && mapOfBundleFormElementStatuses.get(`${fs.uuid}-${fs.questionGroupIndex || 0}`))
            || new FormElementStatus(fs.uuid, true, null);
    }

    getAllRuleItemsFor(entity, type, entityTypeHardCoded) {
        const entityType = _.get(entity, 'constructor.schema.name', entityTypeHardCoded);
        const applicableRules = RuleRegistry.getRulesFor(entity.uuid, type, entityType);


        const additionalRules = this.getService(RuleService).getApplicableRules(entity, type, entityType);
        return _.sortBy(applicableRules.concat(additionalRules), (r) => r.executionOrder);
    }

    isEligibleForEncounter(individual, encounterType) {
        const rulesFromTheBundle = this.getAllRuleItemsFor(encounterType, "EncounterEligibilityCheck", "EncounterType");
        if (!_.isNil(encounterType.encounterEligibilityCheckRule) && !_.isEmpty(_.trim(encounterType.encounterEligibilityCheckRule))) {
            try {
                let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
                const ruleFunc = eval(encounterType.encounterEligibilityCheckRule)
                return ruleFunc({
                    params: _.merge({entity: individual, services: this.services}, this.getCommonParams()),
                    imports: getImports(this.globalRuleFunction)
                });
            } catch (e) {
                General.logDebug("Rule-Faiure", e);
                General.logDebug("Rule-Failure", `New encounter eligibility failed for: ${encounterType.name} encounter name`);
                this.saveFailedRules(e, encounterType.uuid, individual.uuid,
                    'EncounterEligibilityCheck', encounterType.uuid, 'Individual', individual.uuid);
            }
        } else if (!_.isEmpty(rulesFromTheBundle)) {
            return this.runRuleAndSaveFailure(_.last(rulesFromTheBundle), 'Encounter', {individual}, true);
        }
        return true;
    }

    isEligibleForProgram(individual, program) {
        const rulesFromTheBundle = this.getAllRuleItemsFor(program, "EnrolmentEligibilityCheck", "Program");
        // TODO: Move the rules in the bundle to actual entities.
        if (!_.isNil(program.enrolmentEligibilityCheckRule) && !_.isEmpty(_.trim(program.enrolmentEligibilityCheckRule))) {
            try {
                let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
                const ruleFunc = eval(program.enrolmentEligibilityCheckRule);
                return ruleFunc({
                    params: _.merge({entity: individual, program, services: this.services}, this.getCommonParams()),
                    imports: getImports(this.globalRuleFunction)
                });
            } catch (e) {
                General.logDebug("Rule-Failure", e);
                General.logDebug("Rule-Failure", `New enrolment eligibility failed for: ${program.name} program name`);
                this.saveFailedRules(e, program.uuid, individual.uuid,
                    'EnrolmentEligibilityCheck', program.uuid, 'Individual', individual.uuid);
            }
        } else if (!_.isEmpty(rulesFromTheBundle)) {
            return this.runRuleAndSaveFailure(_.last(rulesFromTheBundle), 'Encounter', {individual}, true);
        }
        return true;
    }

    isManuallyEligibleForProgram(subject, program, subjectProgramEligibility) {
        if (!_.isNil(program.manualEnrolmentEligibilityCheckRule) && !_.isEmpty(_.trim(program.manualEnrolmentEligibilityCheckRule))) {
            try {
                let ruleServiceLibraryInterfaceForSharingModules = this.getRuleServiceLibraryInterfaceForSharingModules();
                const ruleFunc = eval(program.manualEnrolmentEligibilityCheckRule);
                return ruleFunc({
                    params: _.merge({entity: subjectProgramEligibility, subject, program, services: this.services}, this.getCommonParams()),
                    imports: getImports(this.globalRuleFunction)
                });
            } catch (e) {
                General.logDebug("Rule-Failure", e);
                General.logDebug("Rule-Failure", `Manual enrolment eligibility failed for: ${program.name} program name`);
                this.saveFailedRules(e, program.uuid, subject.uuid,
                    'ManualEnrolmentEligibilityCheckRule', program.uuid, 'Individual', subject.uuid);
            }
        }

        return true;
    }

    executeDashboardCardRule(reportCard, ruleInput) {
        try {
            const ruleFunc = eval(reportCard.query);
            const result = ruleFunc({
                params: _.merge({db: this.db, ruleInput: ruleInput}, this.getCommonParams()),
                imports: getImports(this.globalRuleFunction)
            });
            return result;
        } catch (error) {
            General.logError("Rule-Failure", `DashboardCard report card rule failed for uuid: ${reportCard.uuid}, name: ${reportCard.name}`);
            General.logError("Rule-Failure", error);
            this.saveFailedRules(error, reportCard.uuid, '',
                'ReportCard', reportCard.uuid, null, null);
            return reportCard.nested ?
                reportCard.createNestedErrorResults(this.I18n.t("Error"), this.I18n.t("queryExecutionError"))
                : ReportCardResult.create(this.I18n.t("Error"), this.I18n.t("queryExecutionError"), false, true);
        }
    }

    isOldStyleQueryResult(queryResult) {
        //The result can either be an array or a RealmResultsProxy. We are verifying this by looking for existence of the length key.
        return queryResult.length !== undefined;
    }

    getDashboardCardResult(reportCard, ruleInput) {
        const queryResult = this.executeDashboardCardRule(reportCard, ruleInput);
        if (!queryResult.hasErrorMsg && this.isOldStyleQueryResult(queryResult)) {
            return ReportCardResult.create(queryResult.length, null, true);
        } else if (reportCard.nested) {
            return _.map(queryResult.reportCards, (result, index) => {
                return NestedReportCardResult.fromQueryResult(result, reportCard, index);
            });
        } else {
            return ReportCardResult.fromQueryResult(queryResult);
        }
    }

    getDashboardCardQueryResult(reportCard, ruleInput) {
        const queryResult = this.executeDashboardCardRule(reportCard, ruleInput);
        if (this.isOldStyleQueryResult(queryResult)) {//The result can either be an array or a RealmResultsProxy. We are looking for existence of the length key.
            return queryResult;
        } else if (reportCard.nested) {
            const selectedCardItem = queryResult.reportCards.find((x, index) => reportCard.itemKey === reportCard.getCardId(index));
            return executeLineListFunction(selectedCardItem.lineListFunction, reportCard, this.saveFailedRules);
        } else {
            return _.isFunction(queryResult.lineListFunction) ? executeLineListFunction(queryResult.lineListFunction, reportCard, this.saveFailedRules) : null;
        }
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
            "ProgramEncounter": () => this.getAll(ProgramEncounter.schema.name).filtered('encounterDateTime != null and cancelDateTime = null').sorted('encounterDateTime')
        };
        const saveEntityOfType = {
            "Individual": (individual, nextScheduledVisits) => individualService.register(individual, nextScheduledVisits),
            "Encounter": (encounter, nextScheduledVisits) => encounterService.saveOrUpdate(encounter, nextScheduledVisits),
            "ProgramEnrolment": (enrolment, nextScheduledVisits) => programEnrolmentService.enrol(enrolment, this.getChecklists(enrolment, "ProgramEnrolment"), nextScheduledVisits),
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

    evaluateLinkFunction(linkFunction, menuItem, user, authToken) {
        try {
            const ruleFunc = eval(linkFunction);
            return ruleFunc({
                params: _.merge({moment: moment, token: authToken}, this.getCommonParams())
            });
        } catch (e) {
            General.logDebug("Rule-Failure", e);
            General.logDebug("Rule-Failure",
                `Link function failed for: ${menuItem.toString()} Menu Item`);
            // this.saveFailedRules(e, menuItem.uuid, user.uuid);
            return null;

        }
    }

    getCommonParams() {
        const user = this.getService(UserInfoService).getUserInfo();
        const myUserGroups = this.getService(PrivilegeService).ownedGroups();
        return {user, myUserGroups};
    }

}

export default RuleEvaluationService;
