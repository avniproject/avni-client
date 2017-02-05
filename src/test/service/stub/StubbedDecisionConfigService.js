import _ from "lodash";

class StubbedDecisionConfigService {
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

export default StubbedDecisionConfigService;