import {Observation} from 'openchs-models';
import _ from 'lodash';

class TestObsFactory {
    static create({concept, valueJSON}) {
        const observation = new Observation();
        if (!_.isNil(concept))
            observation.concept = concept;
        observation.valueJSON = valueJSON;
        return observation;
    }
}

export default TestObsFactory;
