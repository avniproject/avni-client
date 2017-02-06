import _ from 'lodash';
import Concept from '../../models/Concept';
import Encounter from "../../models/Encounter";

//on encounter
let getCodedAnswer = function (observation) {
    return Encounter.prototype.dynamicDataResolver.getConceptByUUID(observation.valueJSON.answer.conceptUUID).name;
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
            return _.isArray(observation.valueJSON.answer) ? getCodedAnswers(observation) : getCodedAnswer(observation);
        }
        default:
            return observation.valueJSON.answer;
    }
};

let getCodedAnswers = function (observation) {
    return observation.valueJSON.answer.map((conceptRef) => {
        const concept = Encounter.prototype.dynamicDataResolver.getConceptByUUID(conceptRef.conceptUUID);
        if (_.isNil(concept))
            console.log('No concept found for UUID: ' + conceptRef.conceptUUID);
        return concept.name;
    });
};

export {getObservationValue as getObservationValue};
