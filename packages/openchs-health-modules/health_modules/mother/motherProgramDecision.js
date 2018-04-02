import C from '../common';
import _ from "lodash";

const getNextScheduledVisits = require('./motherVisitSchedule').getNextScheduledVisits;

const getDecisions = function (programEnrolment, today, programEncounter) {
    var decisions = [];
    const highRiskConditions = [];


    analyseOtherRisks();
    analyzeHistoryBasedComplications();

    if (highRiskConditions.length >= 0) {
        decisions.push({name: 'High Risk Conditions', value: highRiskConditions});
    }
    return decisions;

    function addIfNotExists(conceptName) {
        console.log('(MotherProgramDecision) Adding if not exists to preg complications: ' + conceptName);
        if (!observationExistsInEntireEnrolment(conceptName))
            highRiskConditions.push(conceptName);
    }

    function getObservationValueFromEntireEnrolment(conceptName) {
        return programEnrolment.getObservationReadableValueInEntireEnrolment(conceptName, programEncounter);
    }

    function observationExistsInEntireEnrolment(conceptName) {
        return !_.isNil(programEnrolment.getObservationReadableValueInEntireEnrolment(conceptName, programEncounter));
    }

    function analyseOtherRisks() {
        const height = getObservationValueFromEntireEnrolment('Height');
        if (height !== undefined && height <= 145)
            addIfNotExists('Short Stature');

        if (programEnrolment.individual.getAgeInYears(today) > 30)
            addIfNotExists('Old age pregnancy');

        if (programEnrolment.individual.getAgeInYears(today) < 18)
            addIfNotExists('Under age pregnancy');

        if (programEnrolment.getObservationValue('Number of abortion') > 0)
            addIfNotExists('Previous Abortion(s)');

        if (programEnrolment.getObservationValue('Gravida') >= 5)
            addIfNotExists('Grand Multipara');
    }

    function addObsHistoryRisk(obstetricsHistory, answer, risk){
        if (C.contains(obstetricsHistory, answer)) {
            addIfNotExists(risk);
        }
    }

    function analyzeHistoryBasedComplications() {
        const obstetricsHistory = getObservationValueFromEntireEnrolment('Obstetrics History');

        addObsHistoryRisk(obstetricsHistory, 'Post Partum Haemorrhage', 'Previous Post Partum Haemorrhage');
        addObsHistoryRisk(obstetricsHistory, 'Intrauterine Death', 'Previous Intrauterine Death');
        addObsHistoryRisk(obstetricsHistory, 'Threatened Abortion', 'Previous Threatened Abortion');
        addObsHistoryRisk(obstetricsHistory, '3 or more than 3 spontaneous abortions', 'Previous Abortion(s)');
        addObsHistoryRisk(obstetricsHistory, 'LSCS/C-section', 'Previous LSCS/C-section');
        addObsHistoryRisk(obstetricsHistory, 'Still Birth', 'Previous Still Birth');
        addObsHistoryRisk(obstetricsHistory, 'Pre-term labour', 'Previous Pre-term labour');
        addObsHistoryRisk(obstetricsHistory, 'Retained Placenta', 'Previous Retained Placenta');
        addObsHistoryRisk(obstetricsHistory, 'Instrumental Delivery', 'Previous Instrumental Delivery');
        addObsHistoryRisk(obstetricsHistory, 'Prolonged labour', 'Previous Prolonged labour');
        addObsHistoryRisk(obstetricsHistory, 'Intrauterine Growth Retardation', 'Previous Intrauterine Growth Retardation');
        addObsHistoryRisk(obstetricsHistory, 'Pre Eclampsia/ Eclampsia', 'Previous Pre Eclampsia/ Eclampsia');
        addObsHistoryRisk(obstetricsHistory, 'Pregnancy Induced Hypertension', 'Previous Pregnancy Induced Hypertension');
        addObsHistoryRisk(obstetricsHistory, 'Post Neonatal death within first 28 days', 'Previous Neonatal death within first 28 days');
        addObsHistoryRisk(obstetricsHistory, 'Intrapartum Death', 'Previous Intrapartum Death');
        addObsHistoryRisk(obstetricsHistory, 'Ante Partum Haemorrhage', 'Previous Ante Partum Haemorrhage');
        addObsHistoryRisk(obstetricsHistory, 'Multiple Births', 'Previous Multiple Births');
    }
};

const getEnrolmentSummary= function (programEnrolment, context, today) {
    let summary = [];
    const lmpDate = programEnrolment.getObservationValue('Last Menstrual Period');
    let daysFromLMP = C.getDays(lmpDate, today);
    let gestationalAge = _.round(daysFromLMP / 7, 1);
    summary.push({name: 'Gestational Age', value: gestationalAge});
    summary.push({name: 'Estimated Date of Delivery', value: programEnrolment.getObservationValue('Estimated Date of Delivery')});
    summary.push({name: 'High Risk Conditions', value: programEnrolment.getObservationValue('High Risk Conditions')});
    return summary;
};

export {
    getDecisions,
    getNextScheduledVisits,
    getEnrolmentSummary
}