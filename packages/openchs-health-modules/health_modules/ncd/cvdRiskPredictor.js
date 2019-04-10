import C from '../common';
import riskChartCVD from './metadata/riskPredictionChartCVD.json';

const getCvdRisk = function (programEncounter) {

    var riskLevelRiskClassificationMapping = {
        1: 'Low',
        2: 'Moderate',
        3: 'High',
        4: 'Very High',
        5: 'Very High'
    };

    var riskLevelRiskPercentMapping = {
        1: '<10%',
        2: '10 to <20%',
        3: '20 to <30%',
        4: '30 to <40%',
        5: '>40%'
    };

    return getCvdRiskLevel(programEncounter);

    function getCvdRiskLevel(programEncounter) {
        const ageInYrs = programEncounter.individual.getAgeInYears();
        const isSmoker = programEncounter.getObservationValue('Smoking (Current or in last one year)') === "Yes";
        const gender = programEncounter.individual.gender.name;
        const hasDiabetes = programEncounter.getObservationValue('Suffering from diabetes') === "Yes";
        const systolic = programEncounter.getObservationValue('Systolic');

        var masterTable;
        if (hasDiabetes) {
            masterTable = riskChartCVD['With Diabetes'];
        }
        else masterTable = riskChartCVD['Without Diabetes'];

        var matchingRow = masterTable.find(function (row) {
            return row['gender'] === gender && (ageInYrs >= row['ageGroup'] && ageInYrs < row['ageGroup'] + 10) && row['smoker'] === isSmoker && (systolic >= row['systolic'] && systolic < row['systolic'] + 20);
        });
        matchingRow.riskClassification = riskLevelRiskClassificationMapping[matchingRow['risklevel']];
        matchingRow.riskPercentage = riskLevelRiskPercentMapping[matchingRow['risklevel']];
        return matchingRow;
    }
};

module.exports = {
    getCvdRisk: getCvdRisk
};

