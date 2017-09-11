var C = require('../common');

module.exports = {};
module.exports.getNextScheduledVisits = require('./motherVisitSchedule').getNextScheduledVisits;

module.exports.getDecisions = function (programEnrolment, today, programEncounter) {
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
        return programEnrolment.getObservationValueFromEntireEnrolment(conceptName, programEncounter);
    }

    function observationExistsInEntireEnrolment(conceptName) {
        return programEnrolment.getObservationValueFromEntireEnrolment(conceptName, programEncounter);
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

    function analyzeHistoryBasedComplications() {
        const obstetricsHistory = getObservationValueFromEntireEnrolment('Obstetrics History');

        if (C.contains(obstetricsHistory, 'Intrauterine Growth Retardation')) {
            addIfNotExists("IUGR: Intra Uterine Growth Retardation");
        }

        if (C.contains(obstetricsHistory, 'Still birth')) {
            addIfNotExists("Previous Still Birth");
        }

        if (C.contains(obstetricsHistory, 'Intrauterine Death')) {
            addIfNotExists("Previous Intrauterine Death");
        }

        if (C.contains(obstetricsHistory, 'Retained Placenta')) {
            addIfNotExists("Previous Retained Placenta");
        }

        if (C.contains(obstetricsHistory, 'Three or more than three spontaneous abortions')) {
            addIfNotExists("Previous Abortion(s)");
        }
    }
};