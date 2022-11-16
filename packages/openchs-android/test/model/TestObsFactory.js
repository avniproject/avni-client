import {Observation} from 'openchs-models';

class TestObsFactory {
    static create({concept, valueJSON}) {
        const observation = new Observation();
        observation.concept = concept;
        observation.valueJSON = valueJSON;
        return observation;
    }
}

export default TestObsFactory;
