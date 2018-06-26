import zScores from "./zScoreCalculator";
import {RuleFactory} from 'rules-config/rules';

const AnthropometryDecision = RuleFactory("d062907a-690c-44ca-b699-f8b2f688b075", "Decision");


const addIfRequired = (decisions, name, value) => {
    if (value === -0) value = 0;
    if (value !== undefined) decisions.push({name: name, value: value});
};

const findObs = (programEncounter, conceptName) => {
    const obs = programEncounter.findObservation(conceptName);
    return obs && obs.getValue();
};

const getDecisions = (programEncounter) => {
    const decisions = {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []};
    const weight = findObs(programEncounter, "Weight");
    const height = findObs(programEncounter, "Height");
    const zScoresForChild = zScores(programEncounter.programEnrolment.individual, programEncounter.encounterDateTime, weight, height);
    addIfRequired(decisions.encounterDecisions, "Weight for age z-score", zScoresForChild.wfa);
    addIfRequired(decisions.encounterDecisions, "Height for age z-score", zScoresForChild.hfa);
    addIfRequired(decisions.encounterDecisions, "Weight for height z-score", zScoresForChild.wfh);

    return decisions;
};


@AnthropometryDecision("ce515878-0850-49ae-8f6f-dc57d8c0e8b4", "Weight for age z-score", 1.0)
class WeightForAgeZScore {
    static exec(programEncounter, decisions) {
        const weight = findObs(programEncounter, "Weight");
        const height = findObs(programEncounter, "Height");

        const zScoresForChild = zScores(programEncounter.programEnrolment.individual, programEncounter.encounterDateTime, weight, height);
        addIfRequired(decisions.encounterDecisions, "Weight for age z-score", zScoresForChild.wfa);
        return decisions;
    }
}

@AnthropometryDecision("70a904b6-ba9b-4b8e-869d-3f6c9b3cc19f", "Height for age z-score", 2.0)
class HeightForAgeZScore {
    static exec(programEncounter, decisions) {
        const weight = findObs(programEncounter, "Weight");
        const height = findObs(programEncounter, "Height");
        const zScoresForChild = zScores(programEncounter.programEnrolment.individual, programEncounter.encounterDateTime, weight, height);
        addIfRequired(decisions.encounterDecisions, "Height for age z-score", zScoresForChild.hfa);
        return decisions;
    }
}

@AnthropometryDecision("d9a7985c-a276-4d53-b606-862c46ede5e8", "Weight for height z-score", 3.0)
class WeightForHeightZScore {
    static exec(programEncounter, decisions) {
        const weight = findObs(programEncounter, "Weight");
        const height = findObs(programEncounter, "Height");
        const zScoresForChild = zScores(programEncounter.programEnrolment.individual, programEncounter.encounterDateTime, weight, height);
        addIfRequired(decisions.encounterDecisions, "Weight for height z-score", zScoresForChild.wfh);
        return decisions;
    }
}

export {getDecisions};