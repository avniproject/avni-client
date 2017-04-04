class StubbedConfigFileService {
    getEncounterDecisionFile() {
        return {
            contents: 'const getDecisions = ' +
            'function (encounter) { ' +
            'console.log(encounter.getObservationValue("foo"));' +
            'return [];' +
            '};' +
            'module.exports = function() {return {getDecisions: getDecisions};}'
        };
    }

    getProgramEnrolmentFile() {
        return null;
    }

    getIndividualRegistrationFile(){
        return null;
    }

    getProgramEncounterFile() {
        return null;
    }

    getProgramEnrolmentFile() {
        return null;
    }
}

export default StubbedConfigFileService;