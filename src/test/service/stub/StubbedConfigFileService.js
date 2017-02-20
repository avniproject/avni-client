class StubbedConfigFileService {
    getDecisionConfig() {
        return {
            contents: 'const getDecision = ' +
                    'function (encounter) { ' +
                        'console.log(encounter.getObservationValue("foo"));' +
                        'return encounter.getObservationValue("foo");' +
                    '};' +
                    'module.exports = {getDecision: getDecision};'
        };
    }
}

export default StubbedConfigFileService;