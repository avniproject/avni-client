import C from '../common';
import _ from "lodash";
import ComplicationsBuilder from "../rules/complicationsBuilder";

const getNextScheduledVisits = require('./motherVisitSchedule').getNextScheduledVisits;

const getDecisions = function (programEnrolment, today, programEncounter) {
    var decisions = [];
    let highRiskConditions = [];


    analyseOtherRisks();
    analyzeHistoryBasedComplications();
    const historyBasedComplications = medicalHistoryBasedComplications(programEnrolment, today, programEncounter);
    highRiskConditions = highRiskConditions.concat(historyBasedComplications.value);

    if (highRiskConditions.length >= 0) {
        decisions.push({name: 'High Risk Conditions', value: highRiskConditions});
    }
    return decisions;

    function addIfNotExists(conceptName) {
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

        if (programEnrolment.getObservationValue('Number of abortions') > 0)
            addIfNotExists('Previous Abortion(s)');

        if (programEnrolment.getObservationValue('Gravida') >= 5)
            addIfNotExists('Grand Multipara');

        if (programEnrolment.getObservationValue('Gravida') == 1)
            addIfNotExists('Primigravida');
    }

    function addObsHistoryRisk(obstetricsHistory, answer, risk) {
        if (C.contains(obstetricsHistory, answer)) {
            addIfNotExists(risk);
        }
    }

    function analyzeHistoryBasedComplications() {
        const obstetricsHistory = getObservationValueFromEntireEnrolment('Obstetrics history');

        addObsHistoryRisk(obstetricsHistory, 'Post Partum Haemorrhage', 'Previous Post Partum Haemorrhage');
        addObsHistoryRisk(obstetricsHistory, 'Intrauterine death', 'Previous Intrauterine Death');
        addObsHistoryRisk(obstetricsHistory, 'Threatened abortion', 'Previous Threatened Abortion');
        addObsHistoryRisk(obstetricsHistory, '3 or more than 3 spontaneous abortions', 'Previous Abortion(s)');
        addObsHistoryRisk(obstetricsHistory, 'LSCS/C-section', 'Previous LSCS/C-section');
        addObsHistoryRisk(obstetricsHistory, 'Still Birth', 'Previous Still Birth');
        addObsHistoryRisk(obstetricsHistory, 'Pre-term labour', 'Previous Pre-term labour');
        addObsHistoryRisk(obstetricsHistory, 'Retained Placenta', 'Previous Retained Placenta');
        addObsHistoryRisk(obstetricsHistory, 'Instrumental Delivery', 'Previous Instrumental Delivery');
        addObsHistoryRisk(obstetricsHistory, 'Prolonged labour', 'Previous Prolonged labour');
        addObsHistoryRisk(obstetricsHistory, 'Intrauterine Growth Retardation', 'Previous Intrauterine Growth Retardation');
        addObsHistoryRisk(obstetricsHistory, 'Pre Eclampsia/ Eclampsia', 'Previous Pre Eclampsia/ Eclampsia');
        addObsHistoryRisk(obstetricsHistory, 'Pregnancy induced hypertension', 'Previous Pregnancy Induced Hypertension');
        addObsHistoryRisk(obstetricsHistory, 'Neonatal death within first 28 days', 'Previous Neonatal death within first 28 days');
        addObsHistoryRisk(obstetricsHistory, 'Intrapartum Death', 'Previous Intrapartum Death');
        addObsHistoryRisk(obstetricsHistory, 'Ante Partum Haemorrhage', 'Previous Ante Partum Haemorrhage');
        addObsHistoryRisk(obstetricsHistory, 'Multiple Births', 'Previous Multiple Births');
    }
};

const medicalHistoryBasedComplications = (programEnrolment, today, programEncounter) => {
    const complicationsBuilder = new ComplicationsBuilder({
        programEnrolment: programEnrolment,
        programEncounter: programEncounter,
        complicationsConcept: "High Risk Conditions",
    });
    complicationsBuilder.addComplication("Rh Negative Blood Group")
        .when.valueInRegistration("Blood group").containsAnyAnswerConceptName("AB-", "O-", "A-", "B-");

    [
        ["Hypertension", "Chronic Hypertension"],
        ["Heart-related Diseases", "Heart Disease"],
        ["Diabetes", "Diabetes"],
        ["Sickle Cell", "Sickle Cell"],
        ["Epilepsy", "Epilepsy"],
        ["Renal Disease", "Renal Disease"],
        ["HIV/AIDS", "HIV/AIDS"]
    ].forEach(([history, complication]) => {
        complicationsBuilder.addComplication(complication)
            .when.valueInRegistration("Medical history").containsAnyAnswerConceptName(history);
    });

    complicationsBuilder.addComplication("Young child")
        .when.valueInEnrolment("Age of youngest child").asAge.is.lessThanOrEqualTo(1);

    return complicationsBuilder.getComplications();
};

const getEnrolmentSummary = function (programEnrolment, context, today) {
    let summary = [];
    const lmpDate = programEnrolment.getObservationValue('Last menstrual period');
    let daysFromLMP = C.getDays(lmpDate, today);
    let gestationalAge = _.floor(daysFromLMP / 7, 0);

    const postDeliveryEncounterTypes = ["Delivery", "PNC"];
    const isPostDelivery = programEnrolment.hasAnyOfEncounterTypes(postDeliveryEncounterTypes);

    if (!isPostDelivery) {
        summary.push({name: 'Last menstrual period', value: lmpDate});
        summary.push({name: 'Gestational Age', value: gestationalAge});
        summary.push({
            name: 'Estimated Date of Delivery',
            value: programEnrolment.getObservationValue('Estimated Date of Delivery')
        });
    }

    const allEncounters = programEnrolment.getEncounters(true);
    const postDeliveryEncounters = allEncounters.filter(encounter =>
        postDeliveryEncounterTypes.includes(encounter.encounterType.name)
    );

    const relevantEncounters = isPostDelivery ? postDeliveryEncounters : allEncounters;

    const highRiskConditions = _.chain(relevantEncounters)
        .map(encounter => encounter.getObservationValue("High Risk Conditions"))
        .concat(isPostDelivery ? [] : [programEnrolment.getObservationValue('High Risk Conditions')])
        .compact()
        .flatten()
        .uniq()
        .value();

    const recommendations = _.chain(relevantEncounters)
        .map(encounter => encounter.getObservationValue("Recommendations"))
        .concat(isPostDelivery ? [] : [programEnrolment.getObservationValue('Recommendations')])
        .compact()
        .flatten()
        .uniq()
        .value();

    const treatment = _.chain(relevantEncounters)
        .map(encounter => encounter.getObservationValue("Treatment"))
        .concat(isPostDelivery ? [] : [programEnrolment.getObservationValue('Treatment')])
        .compact()
        .flatten()
        .uniq()
        .value();

    const referralAdvice = _.chain(relevantEncounters)
        .map(encounter => encounter.getObservationValue("Refer to the hospital immediately for"))
        .concat(isPostDelivery ? [] : [programEnrolment.getObservationValue('Refer to the hospital immediately for')])
        .compact()
        .flatten()
        .uniq()
        .value();

    let medicalHistory = programEnrolment.individual.getObservationValue('Medical history');
    let bloodGroup = programEnrolment.individual.getObservationValue('Blood group');

    let hivObs = programEnrolment.findObservationInEntireEnrolment("HIV/AIDS Test");
    if (!_.isEmpty(hivObs) && hivObs.getReadableValue() === "Positive" && isPostDelivery)
        summary.push({name: 'HIV/AIDS Positive', value: hivObs.getReadableValue()});

    let sicklingObs = programEnrolment.findObservationInEntireEnrolment("Sickling Test");
    if (!_.isEmpty(sicklingObs) && sicklingObs.getReadableValue() === "Positive" && isPostDelivery)
        summary.push({name: 'Sickling Positive', value: sicklingObs.getReadableValue()});

    if (!_.isEmpty(highRiskConditions)) {
        summary.push({name: 'High Risk Conditions', value: highRiskConditions});
    }
    if (!_.isNil(medicalHistory)) {
        summary.push({name: 'Medical history', value: medicalHistory});
    }
    if (!_.isNil(bloodGroup)) {
        summary.push({name: 'Blood group', value: bloodGroup});
    }
    if (!_.isEmpty(recommendations)) {
        summary.push({name: 'Recommendations', value: recommendations});
    }
    if (!_.isEmpty(treatment)) {
        summary.push({name: 'Treatment', value: treatment});
    }
    if (!_.isEmpty(referralAdvice)) {
        summary.push({name: 'Refer to the hospital immediately for', value: referralAdvice});
    }
    return summary;
};

export {
    getDecisions,
    getNextScheduledVisits,
    getEnrolmentSummary
}