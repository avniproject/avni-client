import _ from 'lodash';
import Concept from '../../models/Concept';
import Encounter from "../../models/Encounter";

//on encounter
let getCodedAnswer = function (observation) {
    return Encounter.prototype.dynamicDataResolver.getConceptByUUID(observation.getValueWrapper().getConceptUUID()).name;
};

const getObservationValue = function (conceptName) {
    const observation = _.find(this.observations, (observation) => {
        return observation.concept.name === conceptName;
    });

    if (_.isNil(observation)) {
        console.log(`No observation found for concept: ${conceptName}`);
        return undefined;
    }

    switch (observation.concept.datatype) {
        case Concept.dataType.Coded: {
            return _.isArray(observation.getValue()) ? getCodedAnswers(observation) : getCodedAnswer(observation);
        }
        default:
            return observation.getValue();
    }
};

let getCodedAnswers = function (observation) {
    return observation.getValue().map((conceptUUID) => {
        const concept = Encounter.prototype.dynamicDataResolver.getConceptByUUID(conceptUUID);
        if (_.isNil(concept))
            console.log('No concept found for UUID: ' + conceptUUID);
        return concept.name;
    });
};

export {getObservationValue as getObservationValue};
