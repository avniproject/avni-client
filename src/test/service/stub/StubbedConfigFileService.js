class StubbedConfigFileService {
    getDecisionConfig() {
        return {
            decisionCode: 'const getDecision = ' +
                    'function (encounter) { ' +
                        'console.log(encounter.getObservationValue("foo"));' +
                        'return encounter.getObservationValue("foo");' +
                    '};'
        };
    }
}

export default StubbedConfigFileService;