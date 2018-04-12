import * as programDecision from './motherProgramDecision';
import {getDecisions as pncEncounterDecisions} from './pncEncounterDecision';
import C from '../common';
import _ from "lodash";
import ANCFormhandler from "./formFilters/ANCFormHandler";
import FormElementsStatusHelper from "../rules/FormElementsStatusHelper";
import DeliveryFormHandler from "./formFilters/DeliveryFormHandler";
import generateRecommendations from "./recommendations";
import generateTreatment from "./treatment";
import referralAdvice from "./referral";
import generateInvestigationAdvice from "./investigations";
import generateHighRiskConditionAdvice from "./highRisk";

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
    if (programEncounter.encounterType.name === 'PNC') {
        return pncEncounterDecisions(programEncounter);
    }

    if (programEncounter.encounterType.name === 'ANC') {

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

            const mildPreEclempsiaUrineAlbuminValues = ['Trace', '+1', '+2'];
            const severePreEclempsiaUrineAlbuminValues = ['+3', '+4'];

            const isBloodPressureHigh = (systolic >= 140) || (diastolic >= 90); //can go in high risk category
            const urineAlbuminIsMild = C.contains(mildPreEclempsiaUrineAlbuminValues, urineAlbumin);
            const urineAlbuminIsSevere = C.contains(severePreEclempsiaUrineAlbuminValues, urineAlbumin);
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
                    addComplication('Pregnancy Induced Hypertension');
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
                .indexOf("PV bleeding") >= 0;
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

        }

        enrolmentDecisions = enrolmentDecisions
            .concat(generateRecommendations(programEncounter.programEnrolment, programEncounter))
            .concat(generateTreatment(programEncounter.programEnrolment, programEncounter, today))
            .concat(referralAdvice(programEncounter.programEnrolment, programEncounter));

        decisions.push(generateInvestigationAdvice(programEncounter.programEnrolment, programEncounter, today));

        let highRiskConditions = C.findValue(decisions, 'High Risk Conditions');
        const moreHighRiskConditions = generateHighRiskConditionAdvice(programEncounter.programEnrolment, programEncounter, today);
        moreHighRiskConditions.value = moreHighRiskConditions.value.concat(_.isEmpty(highRiskConditions.value) ? [] : highRiskConditions.value);

        if (!_.isEmpty(moreHighRiskConditions.value)) {
            enrolmentDecisions.push(moreHighRiskConditions);
        }

        if (investigationAdviceBuilder.exists()) decisions.push(investigationAdviceBuilder.build());
        return {
            enrolmentDecisions: enrolmentDecisions,
            encounterDecisions: decisions
        };
    } else return {enrolmentDecisions: [], encounterDecisions: []};
}

export function getNextScheduledVisits(programEncounter, today) {
    return programDecision.getNextScheduledVisits(programEncounter.programEnrolment, today, programEncounter);
}

const encounterTypeHandlerMap = new Map([['ANC', new ANCFormhandler()], ['Delivery', new DeliveryFormHandler()]]);

export function getFormElementsStatuses(programEncounter, formElementGroup, today) {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormElementsStatusHelper.getFormElementsStatuses(handler, programEncounter, formElementGroup, today);
}