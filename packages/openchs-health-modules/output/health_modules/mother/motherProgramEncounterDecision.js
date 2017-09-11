const programDecision = require('./motherProgramDecision');
var observationConditions = require('./motherProgramObservationRules').observationRules;
var C = require('../common');

module.exports = {};

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

module.exports.getDecisions = function (programEncounter, today) {

    if (programEncounter.encounterType.name === 'ANC') {

        var decisions = [];

        const lmpDate = programEncounter.programEnrolment.getObservationValue('Last Menstrual Period');
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
        analyseFoetalPresentation();
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
            console.log('(MotherProgramEncounterDecision) Adding if not exists to preg complications: ' + conceptName);
            C.findValue(decisions, 'High Risk Conditions').push(conceptName);
        }

        function getObservationValueFromEntireEnrolment(conceptName) {
            return programEncounter.programEnrolment.getObservationValueFromEntireEnrolment(conceptName, programEncounter);
        }

        function getObservationValue(conceptName) {
            return programEncounter.getObservationValue(conceptName);
        }

        function observationExistsInEntireEnrolment(conceptName) {
            return programEncounter.programEnrolment.getObservationValueFromEntireEnrolment(conceptName, programEncounter);
        }

        function analyseHypertensiveRisks() {
            const systolic = getObservationValue('Systolic');
            const diastolic = getObservationValue('Diastolic');
            const urineAlbumin = getObservationValue('Urine Albumin');
            const obsHistory = getObservationValueFromEntireEnrolment('Obstetrics History');

            const mildPreEclempsiaUrineAlbuminValues = ['Trace', '+1', '+2'];
            const severePreEclempsiaUrineAlbuminValues = ['+3', '+4'];

            if (urineAlbumin === undefined)
                investigationAdviceBuilder.add("Urine Albumin Test");

            const isBloodPressureHigh = (systolic >= 140) || (diastolic >= 90); //can go in high risk category
            const urineAlbuminIsMild = C.contains(mildPreEclempsiaUrineAlbuminValues, urineAlbumin);
            const urineAlbuminIsSevere = C.contains(severePreEclempsiaUrineAlbuminValues, urineAlbumin);
            const obsHistoryOfPregnancyInducedHypertension = C.contains(obsHistory, 'Pregnancy Induced Hypertension');
            const hasConvulsions = getObservationValue('Convulsions') === "Present"; //will be identified in hospital
            let highRiskConditions = getObservationValueFromEntireEnrolment('High Risk Conditions');
            const isChronicHypertensive = highRiskConditions && highRiskConditions.indexOf('Chronic Hypertension') >= 0;

            if (pregnancyPeriodInWeeks <= 20 && isBloodPressureHigh) {
                addComplication('Chronic Hypertension');
                if (urineAlbuminIsMild || urineAlbuminIsSevere) {
                    addComplication('Superimposed Pre-Eclampsia');
                }
            } else if (pregnancyPeriodInWeeks > 20 && !isChronicHypertensive) {
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
            if (hemoglobin === undefined) {
                investigationAdviceBuilder.add("Haemoglobin Test (Hb)");
            }
            else if (hemoglobin < 7) {
                decisions.push({
                    name: 'Treatment Advice',
                    value: "Severe Anemia. Refer to FRU for further checkup and possible transfusion"
                });
                addComplication('Severe Anemia');
            } else if (hemoglobin >= 7 && hemoglobin <= 11) {
                addComplication('Moderate Anemia');
                decisions.push({name: 'Treatment Advice', value: "Moderate Anemia. Start therapeutic dose of IFA"});
            } else if (hemoglobin > 11)
                decisions.push({
                    name: 'Treatment Advice',
                    value: "Hb normal. Proceed with Prophylactic treatment against anaemia"
                });
        }

        function manageVaginalBleeding() {
            let pregnancyComplaints = getObservationValueFromEntireEnrolment("Pregnancy Complaints");
            var vaginalBleeding = pregnancyComplaints && pregnancyComplaints
                .indexOf("PV bleeding") >= 0;
            if (vaginalBleeding && pregnancyPeriodInWeeks > 20) {
                decisions.push({name: 'Referral Advice', value: 'Send patient to FRU immediately'});
                addComplication('Ante Partum hemorrhage (APH)');
            } else if (vaginalBleeding && pregnancyPeriodInWeeks <= 20) {
                decisions.push({name: 'Referral Advice', value: 'Send patient to FRU immediately'});
                addComplication('Miscarriage');
            }
        }

        function analyseSexuallyTransmittedDisease() {
            var hivaids = getObservationValueFromEntireEnrolment('HIV/AIDS');
            if (hivaids === 'Positive') addComplication('HIV/AIDS Positive');

            var vdrl = getObservationValueFromEntireEnrolment('VDRL');
            if (vdrl === 'Positive') addComplication('VDRL Positive');
        }

        function analyseSickling() {
            var sickling = getObservationValueFromEntireEnrolment('Sickling Test');
            if (sickling === 'Positive') addComplication('Sickling Positive');
            var hbElectrophoresis = getObservationValueFromEntireEnrolment('Hb Electrophoresis');
            if (hbElectrophoresis === 'SS') addComplication('Sickle Cell Disease SS');
        }

        function analyseHepatitisB() {
            var hepatitisB = getObservationValueFromEntireEnrolment('HbsAg');
            if (hepatitisB === 'Positive') addComplication('Hepatitis B Positive');
        }

        function analyseMalaria() {
            var paracheck = getObservationValueFromEntireEnrolment('Paracheck');
            if (paracheck === 'Positive for PF' || paracheck === 'Positive for PV' || paracheck === 'Positive for PF and PV')
                addComplication('Malaria');
        }

        function analyseFoetalPresentation() {
            var foetalPresentation = getObservationValueFromEntireEnrolment('Foetal presentation');
            if (foetalPresentation === 'Breech' || foetalPresentation === 'Transverse') {
                addComplication('Malpresentation');
            }
        }

        var highRiskConditions = C.findValue(decisions, 'High Risk Conditions');
        var enrolmentDecisions = [];
        if (highRiskConditions) {
            enrolmentDecisions.push({
                name: 'High Risk Conditions',
                value: C.findValue(decisions, 'High Risk Conditions')
            })
        }
        if (investigationAdviceBuilder.exists()) decisions.push(investigationAdviceBuilder.build());
        return {
            enrolmentDecisions: enrolmentDecisions,
            encounterDecisions: decisions
        };
    } else return {enrolmentDecisions: [], encounterDecisions: []};
};

module.exports.getNextScheduledVisits = function (programEncounter, today) {
    return programDecision.getNextScheduledVisits(programEncounter.programEnrolment, today, programEncounter);
};

module.exports.getApplicableFormElements = function (formElementGroup, programEncounter, today) {
    var applicableFormElements = [];
    formElementGroup.getApplicableFormElements(programEncounter, observationConditions);
};