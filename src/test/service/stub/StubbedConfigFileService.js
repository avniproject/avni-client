class StubbedConfigFileService {
    getEncounterDecisionFile() {
        return {
            contents: 'const getDecision = ' +
            'function (encounter) { ' +
            'console.log(encounter.getObservationValue("foo"));' +
            'return encounter.getObservationValue("foo");' +
            '};' +
            'module.exports = {getDecision: getDecision};'
        };
    }

    getProgramEnrolmentFile() {
        return null;
    }
}

export default StubbedConfigFileService;