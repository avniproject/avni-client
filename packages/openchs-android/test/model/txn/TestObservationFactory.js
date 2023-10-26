import {Observation} from 'openchs-models';

class TestObservationFactory {
    static create({concept, valueJson}) {
        const observation = new Observation();
        observation.concept = concept;
        observation.valueJSON = valueJson;
        return observation;
    }
}

export default TestObservationFactory;
