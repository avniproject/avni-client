import C from '../common';

import weightForAgeScoresGirls from './anthropometricReference/wfa_girls_0_5_zscores';
import weightForAgeScoresBoys from './anthropometricReference/wfa_boys_0_5_zscores';

import heightForAgeScoresGirls0_2 from  './anthropometricReference/lhfa_girls_0_2_zscores';
import heightForAgeScoresBoys0_2 from  './anthropometricReference/lhfa_boys_0_2_zscores';
import heightForAgeScoresGirls2_5 from  './anthropometricReference/lhfa_girls_2_5_zscores';
import heightForAgeScoresBoys2_5 from  './anthropometricReference/lhfa_boys_2_5_zscores';

import weightForHeightScoresGirls0_2 from  './anthropometricReference/wfl_girls_0_2_zscores';
import weightForHeightScoresBoys0_2 from  './anthropometricReference/wfl_boys_0_2_zscores';
import weightForHeightScoresGirls2_5 from './anthropometricReference/wfh_girls_2_5_zscores';
import weightForHeightScoresBoys2_5 from  './anthropometricReference/wfh_boys_2_5_zscores';

function Decision(name, value) {
    this.name = name;
    this.value = value;
}

function SingleValueCodedDecision(name, value) {
    this.name = name;
    if (value === undefined) this.value = [];
    else this.value = [value];
}

var zScoreGradeMappingWeightForAge = {
    'SD3': 1,
    'SD2': 1,
    'SD1': 1,
    'SD0': 1,
    'SD1neg': 1,
    'SD2neg': 2,
    'SD3neg': 3
};
var zScoreStatusMappingWeightForAge = {
    'SD3': 'Normal',
    'SD2': 'Normal',
    'SD1': 'Normal',
    'SD0': 'Normal',
    'SD1neg': 'Normal',
    'SD2neg': 'Underweight',
    'SD3neg': 'Severely Underweight'
};
var zScoreStatusMappingHeightForAge = {
    'SD3': 'Normal',
    'SD2': 'Normal',
    'SD1': 'Normal',
    'SD0': 'Normal',
    'SD1neg': 'Normal',
    'SD2neg': 'Stunted',
    'SD3neg': 'Severely stunted'
};
var zScoreGradeMappingHeightForAge = {
    'SD3': 1,
    'SD2': 1,
    'SD1': 1,
    'SD0': 1,
    'SD1neg': 1,
    'SD2neg': 2,
    'SD3neg': 3
};
var zScoreStatusMappingBMIForAge = {
    'SD3': 'Obese',
    'SD2': 'Overweight',
    'SD1': 'Possible risk of overweight',
    'SD0': 'Normal',
    'SD1neg': 'Normal',
    'SD2neg': 'Wasted',
    'SD3neg': 'Severely wasted'
};
var zScoreStatusMappingWeightForHeight = {
    'SD3': 'Obese',
    'SD2': 'Overweight',
    'SD1': 'Possible risk of overweight',
    'SD0': 'Normal',
    'SD1neg': 'Normal',
    'SD2neg': 'Wasted',
    'SD3neg': 'Severely wasted'
};


/* Todo
 1. null checks
 2. Refactor for - Height will not be calculated everytime. Need to get height from the last encounter that has it
 Same might be true for weight
 */
var getDecisions = function (observationsHolder, individual, today) {
    var dateOfBirth = individual.dateOfBirth;
    var ageInMonths = C.getAgeInMonths(dateOfBirth, today);

    var weightForAgeGenderValues = individual.gender.name === 'Female' ? weightForAgeScoresGirls : weightForAgeScoresBoys;

    var heightForAgeGenderValues;
    var weightForHeightGenderValues;

    if (ageInMonths > 60) return [];
    else if (ageInMonths <= 24) {
        heightForAgeGenderValues = individual.gender.name === 'Female' ? heightForAgeScoresGirls0_2 : heightForAgeScoresBoys0_2;
        weightForHeightGenderValues = individual.gender.name === 'Female' ? weightForHeightScoresGirls0_2 : weightForHeightScoresBoys0_2;
    }
    else {
        heightForAgeGenderValues = individual.gender.name === 'Female' ? heightForAgeScoresGirls2_5 : heightForAgeScoresBoys2_5;
        weightForHeightGenderValues = individual.gender.name === 'Female' ? weightForHeightScoresGirls2_5 : weightForHeightScoresBoys2_5;
    }

    //var bmiForAgeGenderValues = individual.gender.name === 'Female' ? bmiForAgeScores.female : bmiForAgeScores.male;

    const weight = observationsHolder.getObservationValue('Weight');
    const height = observationsHolder.getObservationValue('Height');
    const length = height;

    const weightForAgeZScore = getZScore(findRowByEquality(weightForAgeGenderValues, 'Month', ageInMonths), weight);
    const heightForAgeZScore = getZScore(findRowByEquality(heightForAgeGenderValues, 'Month', ageInMonths), height);
    const weightForHeightZScore = ageInMonths > 24 ? getZScore(findNearestMatchingRow(weightForHeightGenderValues, 'Height', height), weight): getZScore(findNearestMatchingRow(weightForHeightGenderValues, 'Length', length), weight);
    const gradeForWeightForAge = zScoreGradeMappingWeightForAge[weightForAgeZScore];

 /*   const bmiForAgeZscore = ageInMonths > 24 ? getZScore(bmiForAgeGenderValues, 'Month', ageInMonths, C.calculateBMI(weight, height, ageInMonths)) : null;
    const bmiForAgeStatus = bmiForAgeZscore === null ? null : zScoreStatusMappingBMIForAge[bmiForAgeZscore];*/

    const decisions = [];
    decisions.push(new SingleValueCodedDecision('Weight for age z-score', weightForAgeZScore));
    decisions.push(new Decision('Weight for age grade', gradeForWeightForAge));
    decisions.push(new SingleValueCodedDecision('Weight for age status', zScoreStatusMappingWeightForAge[weightForAgeZScore]));
    decisions.push(new SingleValueCodedDecision('Height for age z-score', heightForAgeZScore));
    decisions.push(new Decision('Height for age grade', zScoreGradeMappingHeightForAge[heightForAgeZScore]));
    decisions.push(new SingleValueCodedDecision('Height for age status', zScoreStatusMappingHeightForAge[heightForAgeZScore]));
    decisions.push(new SingleValueCodedDecision('Weight for height z-score', weightForHeightZScore));
    decisions.push(new SingleValueCodedDecision('Weight for height status', zScoreStatusMappingWeightForHeight[weightForHeightZScore]));
    return decisions;

    function findRowByEquality(masterTable, key, value) {
        return masterTable.find(function (row) {
            return row[key] === value;
        });
    }

    function findNearestMatchingRow(masterTable, key, value) {
        var valuesForComparison = getFields(masterTable, key);

        function getFields(masterTable, key){
            var output = [];
            for (var i=0; i < masterTable.length ; ++i)
                output.push(masterTable[i][key]);
            return output;
        }

        for (var i = 0; i < valuesForComparison.length; i++) {
            var currentKeyDifference = Math.abs(value - valuesForComparison[i]);
            var nextKeyDifference = Math.abs(value - valuesForComparison[i + 1]);

            if (nextKeyDifference < currentKeyDifference) continue;

            return masterTable[i];
        }
    }

    function getZScore(matchingRow, obsValue) {
        var keys = Object.keys(matchingRow);
        for (var i = 0; i < keys.length; i++) {
            var ignoredKeys = ['Month', 'Length', 'L', 'M', 'S', 'SD'];

            var findOne = ignoredKeys.some(function (ignoredKey) {
                return keys[i] === ignoredKey;
            });
            if (findOne) continue;

            var currentKeyDifference = Math.abs(obsValue - matchingRow[keys[i]]);
            var nextKeyDifference = Math.abs(obsValue - matchingRow[keys[i + 1]]);

            if (nextKeyDifference < currentKeyDifference) continue;

            return keys[i];
        }
    }
};

export {getDecisions};