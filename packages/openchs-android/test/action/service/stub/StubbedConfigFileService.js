class StubbedConfigFileService {
    getEncounterDecisionFile() {
        return {
            name: 'encounterDecision',
            contents: 'const getDecisions = ' +
            'function (encounter) { ' +
            'console.log(encounter.getObservationValue("foo"));' +
            'return [];' +
            '};' +
            'module.exports = function() {return {getDecisions: getDecisions};}'
        };
    }

    getProgramEnrolmentFile() {
        return {name: 'programEnrolmentDecisions'};
    }

    getIndividualRegistrationFile(){
        return {name: 'individualRegistrationDecisions'};
    }

    getProgramEncounterFile() {
        return {name: 'programEncounterDecisions'};
    }
}

export default StubbedConfigFileService;