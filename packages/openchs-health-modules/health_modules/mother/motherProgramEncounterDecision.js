import * as programDecision from './motherProgramDecision';
import {getDecisions as abortionEncounterDecisions} from "./abortionEncounterDecisions";
import C from '../common';
import _ from "lodash";
import ANCFormhandler from "./formFilters/ANCFormHandler";
import ANCLabTestResultsFormHandler from "./formFilters/ANCLabTestResultsFormHandler";
import PNCFormHandler from "./formFilters/PNCFormHandler";
import AbortionFormhandler from "./formFilters/AbortionFormHandler";
import {RuleFactory} from 'rules-config/rules';
import DeliveryFormHandler from "./formFilters/DeliveryFormHandler";
import {generateRecommendations, generateReasonsForRecommendations} from './recommendations';
import generateTreatment from "./treatment";
import {immediateReferralAdvice, referralAdvice} from "./referral";
import generateInvestigationAdvice from "./investigations";
import generateHighRiskConditionAdvice, {getHighRiskConditionsInDeliveryEncounter} from "./highRisk";
import {gestationalAgeCategoryAsOn, eddBasedOnGestationalAge, gestationalAgeForEDD} from "./calculations";
import {FormElementsStatusHelper} from "rules-config/rules";

const ANCFormDecision = RuleFactory("3a95e9b0-731a-4714-ae7c-10e1d03cebfe", "Decision");
const PNCFormDecision = RuleFactory("78b1400e-8100-4ba6-b78e-fef580f7fb77", "Decision");
const AbortionDecision = RuleFactory("32428a7e-d553-4172-b697-e8df3bbfb61d", "Decision");
const DeliveryDecision = RuleFactory("cc6a3c6a-c3cc-488d-a46c-d9d538fcc9c2", "Decision");
const LabTestsDecision = RuleFactory("9ed7e0a9-6122-41ee-8413-1cef6792e2c6", "Decision");
const ANCFormFilters = RuleFactory("3a95e9b0-731a-4714-ae7c-10e1d03cebfe", "ViewFilter");
const PNCFormFilters = RuleFactory("78b1400e-8100-4ba6-b78e-fef580f7fb77", "ViewFilter");
const AbortionFormFilters = RuleFactory("32428a7e-d553-4172-b697-e8df3bbfb61d", "ViewFilter");
const DeliveryFormFilters = RuleFactory("cc6a3c6a-c3cc-488d-a46c-d9d538fcc9c2", "ViewFilter");


@ANCFormFilters("8b320b90-4a00-4bca-9709-acbf1d6b1359", "All ANC Form Filters", 1.0, {})
class ANCFormFilter {
    static exec(programEncounter, formElementGroup, today) {
        return getFormElementsStatuses(programEncounter, formElementGroup, today);
    }
}

@PNCFormFilters("db907bf6-5bd4-463d-9ae6-5f3eacc8c29a", "All PNC Form Filters", 1.0, {})
class PNCFormFilter {
    static exec(programEncounter, formElementGroup, today) {
        return getFormElementsStatuses(programEncounter, formElementGroup, today);
    }
}

@AbortionFormFilters("26856d5f-ca57-4e19-a16a-f1466b21b2d6", "All Abortion Form Filters", 1.0, {})
class AbortionFormFilter {
    static exec(programEncounter, formElementGroup, today) {
        return getFormElementsStatuses(programEncounter, formElementGroup, today);
    }
}

@DeliveryFormFilters("a0ef845f-cad5-4255-b24e-88cbb9006356", "All Delivery Form Filters", 1.0, {})
class DeliveryFormFilter {
    static exec(programEncounter, formElementGroup, today) {
        return getFormElementsStatuses(programEncounter, formElementGroup, today);
    }
}

@ANCFormDecision("9b3b65f7-e740-487f-b770-eb1558a7ed93", "All ANC Form Decisions", 1.0)
class AllANCFormDecision {
    static exec(programEncounter, decisions, context, today) {
        return getDecisions(programEncounter, today);
    }
}

@PNCFormDecision("b7498281-1d8a-4c0d-9577-a2142d503cf7", "All PNC Form Decisions", 1.0)
class AllPNCFormDecision {
    static exec(programEncounter, decisions, context, today) {
        return getDecisions(programEncounter, today);
    }
}

@AbortionDecision("98257a36-faaa-4db1-b922-6bdb65b1767c", "All Abortion Form Decisions", 1.0)
class AllAbortionFormDecision {
    static exec(programEncounter, decisions, context, today) {
        return getDecisions(programEncounter, today);
    }
}

@DeliveryDecision("06b9f646-33d9-4462-8a51-c922fe7d2ef3", "All Delivery Form Decisions", 1.0)
class AllDeliveryFormDecision {
    static exec(programEncounter, decisions, context, today) {
        return getDecisions(programEncounter, today);
    }
}

@LabTestsDecision("cc983f4f-4a10-4559-97f1-fbeeaec04449", "Lab Tests Form Decisions", 1.0)
class ANCLabTestDecision {
    static exec(programEncounter, decisions, context, today) {
        return getDecisions(programEncounter, today);
    }
}

function AdviceBuilder(type, prefixValue) {
    this.values = [];
    this.type = type;
    this.prefixValue = prefixValue;

    this.add = function (value) {
        this.values.push(value);
    };

    this.exists = function () {
        return this.values.length > 0;
    };

    this.build = function () {
        return {
            "name": this.type,
            "value": `${this.prefixValue} ${this.values.join(', ')}`
        };
    };
}

function InvestigationAdviceBuilder() {
    return new AdviceBuilder("Investigation Advice", "Send patient to FRU immediately for");
}

export function getDecisions(programEncounter, today) {
    if (programEncounter.encounterType.name === 'Abortion') {
        return abortionEncounterDecisions(programEncounter)
    }

    if (programEncounter.encounterType.name === 'PNC') {
        let decisions = [];
        decisions = decisions.concat(generateTreatment(programEncounter.programEnrolment, programEncounter))
            .concat(immediateReferralAdvice(programEncounter.programEnrolment, programEncounter))
            .concat(referralAdvice(programEncounter.programEnrolment, programEncounter));

        return {encounterDecisions: decisions};
    }

    if (programEncounter.encounterType.name === "Delivery") {
        let decisions = {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []};
        decisions.encounterDecisions.push(
            {
                name: 'Gestational age category at birth',
                value: [gestationalAgeCategoryAsOn(programEncounter.findObservation("Date of delivery").getValue(), programEncounter.programEnrolment)]
            }
        );
        decisions.encounterDecisions.push(getHighRiskConditionsInDeliveryEncounter(programEncounter.programEnrolment, programEncounter));
        return decisions;
    }

    if (['ANC', 'Lab Tests'].includes(programEncounter.encounterType.name)) {

        let decisions = [];
        let enrolmentDecisions = [];
        const lmpDate = programEncounter.programEnrolment.getObservationValue('Last menstrual period');
        const pregnancyPeriodInWeeks = C.getWeeks(lmpDate, programEncounter.encounterDateTime);

        let investigationAdviceBuilder = new InvestigationAdviceBuilder();
        //TODO this code has duplications. Refactoring to be done. Externalise strings?
        addComplicationsObservation();
        analyseHypertensiveRisks();
        analyseAnemia();
        manageVaginalBleeding();
        analyseSexuallyTransmittedDisease();
        analyseSickling();
        analyseHepatitisB();
        analyseMalaria();
        analyseJaundice();
        analyseConvulsions();
        analyseAbdominalExamination();
        analyseOtherRisks();
        determineDurationOfPregnancy();
        eddUpdated();

        function addComplicationsObservation() {
            decisions.push({name: 'High Risk Conditions', value: []})
        }

        function analyseOtherRisks() {
            const weight = getObservationValue('Weight');
            if (!C.isNil(weight) && weight <= 35)
                addComplication('Underweight');
        }

        function addComplication(conceptName) {
            C.findValue(decisions, 'High Risk Conditions').push(conceptName);
        }

        function getObservationValueFromEntireEnrolment(conceptName) {
            return programEncounter.programEnrolment.getObservationReadableValueInEntireEnrolment(conceptName, programEncounter);
        }

        function getObservationValue(conceptName) {
            return programEncounter.getObservationValue(conceptName);
        }

        function observationExistsInEntireEnrolment(conceptName) {
            return programEncounter.programEnrolment.getObservationReadableValueInEntireEnrolment(conceptName, programEncounter);
        }

        function analyseHypertensiveRisks() {
            const systolic = getObservationValue('Systolic');
            const diastolic = getObservationValue('Diastolic');
            const urineAlbumin = getObservationValue('Urine Albumin');
            const obsHistory = getObservationValueFromEntireEnrolment('Obstetrics history');

            const mildPreEclampsiaUrineAlbuminValues = ['Trace', '+1', '+2'];
            const severePreEclampsiaUrineAlbuminValues = ['+3', '+4'];

            const isBloodPressureHigh = (systolic >= 140) || (diastolic >= 90); //can go in high risk category
            const urineAlbuminIsMild = C.contains(mildPreEclampsiaUrineAlbuminValues, urineAlbumin);
            const urineAlbuminIsSevere = C.contains(severePreEclampsiaUrineAlbuminValues, urineAlbumin);
            const obsHistoryOfPregnancyInducedHypertension = C.contains(obsHistory, 'Pregnancy induced hypertension');
            const hasConvulsions = getObservationValue('Has she been having convulsions?') === "Present"; //will be identified in hospital
            let highRiskConditions = getObservationValueFromEntireEnrolment('High Risk Conditions');
            const isEssentialHypertensive = highRiskConditions && highRiskConditions.indexOf('Essential Hypertension') >= 0;

            if (pregnancyPeriodInWeeks <= 20 && isBloodPressureHigh) {
                addComplication('Essential Hypertension');
                if (urineAlbuminIsMild || urineAlbuminIsSevere) {
                    addComplication('Superimposed Pre-Eclampsia');
                }
            } else if (pregnancyPeriodInWeeks > 20 && !isEssentialHypertensive) {
                if (!obsHistoryOfPregnancyInducedHypertension && isBloodPressureHigh) {
                    addComplication('Pregnancy induced hypertension');
                    if (hasConvulsions && (urineAlbuminIsMild || urineAlbuminIsSevere))
                        addComplication('Eclampsia');
                    else if (!hasConvulsions && urineAlbuminIsMild) addComplication('Mild Pre-Eclampsia');
                    else if (!hasConvulsions && urineAlbuminIsSevere) addComplication('Severe Pre-Eclampsia');
                }
            }
        }

        function analyseAnemia() { //anm also does this test
            var hemoglobin = getObservationValueFromEntireEnrolment('Hb');
            if (hemoglobin !== undefined && hemoglobin < 7) {
                addComplication('Severe Anemia');
            } else if (hemoglobin !== undefined && hemoglobin >= 7 && hemoglobin <= 11) {
                addComplication('Moderate Anemia');
            }
        }

        function manageVaginalBleeding() {
            let pregnancyComplaints = getObservationValueFromEntireEnrolment("Pregnancy complications");
            var vaginalBleeding = pregnancyComplaints && pregnancyComplaints
                .indexOf("Per vaginal bleeding") >= 0;
            if (vaginalBleeding && pregnancyPeriodInWeeks > 20) {
                addComplication('Ante Partum hemorrhage (APH)');
            } else if (vaginalBleeding && pregnancyPeriodInWeeks <= 20) {
                addComplication('Miscarriage');
            }
        }

        function analyseSexuallyTransmittedDisease() {
            var hivaids = getObservationValueFromEntireEnrolment('HIV/AIDS Test');
            if (hivaids === 'Positive') addComplication('HIV/AIDS Positive');

            var vdrl = getObservationValueFromEntireEnrolment('VDRL');
            if (vdrl === 'Positive') addComplication('VDRL Positive');
        }

        function analyseSickling() {
            var sickling = getObservationValueFromEntireEnrolment('Sickling Test');
            if (sickling === 'Positive') addComplication('Sickling Positive');
            var hbElectrophoresis = getObservationValueFromEntireEnrolment('Hb Electrophoresis');
            if (hbElectrophoresis === 'SS') addComplication('Sickle cell disease SS');
        }

        function analyseHepatitisB() {
            var hepatitisB = getObservationValueFromEntireEnrolment('HbsAg');
            if (hepatitisB === 'Positive') addComplication('Hepatitis B Positive');
        }

        function analyseMalaria() {
            var paracheck = getObservationValueFromEntireEnrolment("Paracheck");
            if (paracheck === 'Positive for PF' || paracheck === 'Positive for PV' || paracheck === 'Positive for PF and PV')
                addComplication('Malaria');
        }

        function analyseJaundice() {
            var jaundice = getObservationValueFromEntireEnrolment('Jaundice (Icterus)');
            if (jaundice === 'Present')
                addComplication('Jaundice Present');
        }

        function analyseConvulsions() {
            var convulsions = getObservationValueFromEntireEnrolment('Has she been having convulsions?');
            if (convulsions === 'Present')
                addComplication('Convulsions Present');
        }

        function analyseAbdominalExamination() {
            var foetalPresentation = getObservationValueFromEntireEnrolment('Foetal presentation');
            if (foetalPresentation === 'Breech' || foetalPresentation === 'Transverse') {
                addComplication('Malpresentation');
            }
            var foetalMovements = getObservationValueFromEntireEnrolment('Foetal movements');
            if (foetalMovements === 'Absent') {
                addComplication('Foetal Movements Absent');
            }
            if (foetalMovements === 'Reduced') {
                addComplication('Foetal movements reduced');
            }
        }

        function determineDurationOfPregnancy() {
            let estimatedGestationalAge = programEncounter.getObservationReadableValue('Gestational age');
            if (!_.isNil(estimatedGestationalAge)) {
                enrolmentDecisions.push({name: "Estimated Date of Delivery", value: eddBasedOnGestationalAge(estimatedGestationalAge, programEncounter.encounterDateTime)});
            }
        }

        function eddUpdated() {
            let estimatedDateOfDelivery = programEncounter.getObservationReadableValue('Estimated Date of Delivery');
            if (!_.isNil(estimatedDateOfDelivery)) {
                enrolmentDecisions.push({name: "Estimated Date of Delivery", value: estimatedDateOfDelivery});
                enrolmentDecisions.push({name: "Gestational age", value: gestationalAgeForEDD(estimatedDateOfDelivery, programEncounter.encounterDateTime)});
            }
        }

        decisions = decisions
            .concat(generateRecommendations(programEncounter.programEnrolment, programEncounter))
            .concat(...generateReasonsForRecommendations(programEncounter.programEnrolment, programEncounter))
            .concat(generateTreatment(programEncounter.programEnrolment, programEncounter, today))
            .concat(referralAdvice(programEncounter.programEnrolment, programEncounter, today))
            .concat(immediateReferralAdvice(programEncounter.programEnrolment, programEncounter, today));

        let highRiskConditions = C.findValue(decisions, 'High Risk Conditions');
        const moreHighRiskConditions = generateHighRiskConditionAdvice(programEncounter.programEnrolment, programEncounter, today);
        moreHighRiskConditions.value = moreHighRiskConditions.value.concat(_.isEmpty(highRiskConditions.value) ? [] : highRiskConditions.value);

        if (!_.isEmpty(moreHighRiskConditions.value)) {
            decisions.push(moreHighRiskConditions);
        }
        decisions.push(generateInvestigationAdvice(programEncounter.programEnrolment, programEncounter, today));
        decisions = decisions.filter((d) => !_.isEmpty(d));

        enrolmentDecisions = enrolmentDecisions.filter((d) => !_.isEmpty(d));

        enrolmentDecisions = mergeDecisionsByKey(enrolmentDecisions);
        decisions = mergeDecisionsByKey(decisions);

        return {
            enrolmentDecisions: enrolmentDecisions,
            encounterDecisions: decisions
        };
    }
}

const mergeDecisionsByKey = (decisions) => {
    const groups = _.groupBy(decisions, 'name');
    return _.map(groups, (vals, key)=> ({name:key, value: _.flatten(_.map(vals, 'value'))}));
};


export function getNextScheduledVisits(programEncounter, config, today) {
    return programDecision.getNextScheduledVisits(programEncounter.programEnrolment, today, programEncounter);
}

const encounterTypeHandlerMap = new Map([
    ['ANC', new ANCFormhandler()],
    ['Lab Tests', new ANCLabTestResultsFormHandler()],
    ['PNC', new PNCFormHandler()],
    ['Delivery', new DeliveryFormHandler()],
    ['Abortion', new AbortionFormhandler()]
]);

export function getFormElementsStatuses(programEncounter, formElementGroup, today) {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormElementsStatusHelper.getFormElementsStatusesWithoutDefaults(handler, programEncounter, formElementGroup, today);
}