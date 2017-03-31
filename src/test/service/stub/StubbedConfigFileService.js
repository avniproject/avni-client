class StubbedConfigFileService {
    getEncounterDecisionFile() {
        return {
            contents: 'const getDecision = ' +
            'function (encounter) { ' +
            'console.log(encounter.getObservationValue("foo"));' +
            'return encounter.getObservationValue("foo");' +
            '};' +
            'module.exports = function() {return {getDecision: getDecision};}'
        };
    }

    getProgramEnrolmentFile() {
        return null;
    }
}

export default StubbedConfigFileService;