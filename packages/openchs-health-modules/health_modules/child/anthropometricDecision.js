import zScores from "./zScoreCalculator";
import {RuleFactory} from 'rules-config/rules';
import weightForAgeScoresGirls from './anthropometry/wfa_girls';
import weightForAgeScoresBoys from './anthropometry/wfa_boys';
import _ from "lodash";
import C from "../common";

const AnthropometryDecision = RuleFactory("d062907a-690c-44ca-b699-f8b2f688b075", "Decision");

const  zScoreGradeStatusMappingWeightForAge = {
        '1': 'Normal',
        '1': 'Normal',
        '1': 'Normal',
        '1': 'Normal',
        '1': 'Normal',
        '2': 'Underweight',
        '3': 'Severely Underweight'
};

const zScoreGradeStatusMappingHeightForAge = {
    '1': 'Normal',
    '1': 'Normal',
    '1': 'Normal',
    '1': 'Normal',
    '1': 'Normal',
    '2': 'Stunted',
    '3': 'Severely stunted'
};

//ordered map
//KEY:status, value: max z-score for the particular satatus

const zScoreGradeStatusMappingWeightForHeight = [
    ["Severely wasted", -3],
    ["Wasted", -2],
    ["Normal", 1],
    ["Possible risk of overweight", 2],
    ["Overweight", 3],
    ["Obese", Infinity],
];



const weightForHeightStatus = function(zScore) {
    let found = _.find(zScoreGradeStatusMappingWeightForHeight, function(currentStatus){
        return zScore <= currentStatus[1];
    });
    return found && found[0];
}




const getGradeforZscore = (zScore) =>{
    let grade
    if(zScore<=-3)
    {
        grade = 3;
    }
    else if(zScore>-3 && zScore<-2)
    {
        grade = 2;
    }
    else if(zScore>=-2)
    {
        grade = 1;
    }

    return grade;

}


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

    var Gender = _.get(programEncounter.programEnrolment.individual, "gender.name");

    var wfaGrade = getGradeforZscore(zScoresForChild.wfa);
    var wfaStatus = zScoreGradeStatusMappingWeightForAge[wfaGrade];

    var hfaGrade = getGradeforZscore(zScoresForChild.hfa);
    var hfaStatus = zScoreGradeStatusMappingHeightForAge[hfaGrade];

     var wfhStatus = weightForHeightStatus(zScoresForChild.wfh);
     console.log("wfh status: "+wfhStatus+", wfhzscore:"+zScoresForChild.wfh);

    addIfRequired(decisions.encounterDecisions, "Weight for age z-score", zScoresForChild.wfa);
    addIfRequired(decisions.encounterDecisions, "Weight for age Grade", wfaGrade);
    addIfRequired(decisions.encounterDecisions, "Weight for age Status", wfaStatus? [wfaStatus]: []);

    addIfRequired(decisions.encounterDecisions, "Height for age z-score", zScoresForChild.hfa);
    addIfRequired(decisions.encounterDecisions, "Height for age Grade", hfaGrade);
    addIfRequired(decisions.encounterDecisions, "Height for age Status", hfaStatus? [hfaStatus]: []);

    addIfRequired(decisions.encounterDecisions, "Weight for height z-score", zScoresForChild.wfh);
    addIfRequired(decisions.encounterDecisions, "Weight for Height Status", wfhStatus? [wfhStatus]: []);

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