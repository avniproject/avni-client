import zScores from "./zScoreCalculator";


const addIfRequired = (decisions, name, value) => {
    if (value === -0) value = 0;
    if (value !== undefined) decisions.push({name: name, value: value});
};

const findObs = (programEncounter, conceptName) => {
    const obs = programEncounter.findObservation(conceptName);
    return obs && obs.getValue();
};

const getDecisions = (programEncounter)=> {
    const decisions = {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []};
    const weight = findObs(programEncounter, "Weight");
    const height = findObs(programEncounter, "Height");
    const zScoresForChild = zScores(programEncounter.programEnrolment.individual, programEncounter.encounterDateTime, weight, height);

    addIfRequired(decisions.encounterDecisions, "Weight for age z-score", zScoresForChild.wfa);
    addIfRequired(decisions.encounterDecisions, "Height for age z-score", zScoresForChild.hfa);
    addIfRequired(decisions.encounterDecisions, "Weight for height z-score", zScoresForChild.wfh);

    return decisions;
};

export {getDecisions};