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

        this.entityDecisionRulesMap = new Map([['Individual', this.getRegistrationDecisions.bind(this)],
            ['Encounter', this.getEncounterDecisions.bind(this)],
            ['ProgramEnrolment', this.getProgramEnrolmentDecisions.bind(this)],
            ['ProgramEncounter', this.getProgramEncounterDecisions.bind(this)],
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

    getRegistrationDecisions(individual, context) {
        const form = this.formMappingService.findRegistrationForm(individual);
        return this.getEntityDecision(form, individual, context);
    }

    getEncounterDecisions(encounter, context) {
        const form = this.formMappingService.findFormForEncounterType(encounter.encounterType, Encounter.schema.name);
        return this.getEntityDecision(form, encounter, context);
    }

    getProgramEnrolmentDecisions(programEnrolment, context) {
        const form = this.formMappingService.findFormForProgramEnrolment(programEnrolment.program);
        return this.getEntityDecision(form, programEnrolment, context);
    }

    getProgramEncounterDecisions(programEncounter, context) {
        const form = this.formMappingService.findFormForEncounterType(programEncounter.encounterType, ProgramEncounter.schema.name);
        return this.getEntityDecision(form, programEncounter, context);
    }

    getDecisions(entity, entityName, context) {
        return this.entityDecisionRulesMap.get(entityName)(entity, context);
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
        return this.entityRulesMap.get(entityName).validate(entity, form);
    }

    getNextScheduledVisits(entity, entityName, visitScheduleConfig) {
        return this.entityRulesMap.get(entityName).getNextScheduledVisits(entity, visitScheduleConfig);
    }

    getChecklists(enrolment) {
        return this.entityRulesMap.get('ProgramEnrolment').getChecklists(enrolment);
    }

    getFormElementsStatuses(entity, entityName, formElementGroup) {
        if ([entity, formElementGroup, formElementGroup.form].some(_.isEmpty)) return [];
        const applicableRules = RuleRegistry.getRulesFor(formElementGroup.form.uuid, "ViewFilter");
        const additionalRules = this.getService(RuleService).getApplicableRules(formElementGroup.form, "ViewFilter");
        if (_.isEmpty(additionalRules.concat(applicableRules))) return formElementGroup.getFormElements()
            .map((formElement) => new FormElementStatus(formElement.uuid, true, undefined));
        return [..._.sortBy(applicableRules.concat(additionalRules), (r) => r.executionOrder)
            .map(r => r.fn.exec(entity, formElementGroup, new Date()))
            .reduce((all, curr) => all.concat(curr), [])
            .reduce((acc, fs) => acc.set(fs.uuid, fs), new Map())
            .values()];
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