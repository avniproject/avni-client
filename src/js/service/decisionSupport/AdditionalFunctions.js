import _ from 'lodash';
import Concept from '../../models/Concept';
import Encounter from "../../models/Encounter";

//on encounter
const getObservationValue = function (conceptName) {
    const observation = _.find(this.observations, (observation) => {
        return observation.concept.name === conceptName;
    });

    switch (observation.concept.datatype) {
        case Concept.dataType.Coded:
            return _.isArray(observation.valueJSON.answer) ?
                observation.valueJSON.answer.map((conceptRef) => Encounter.prototype.dynamicDataResolver.getConceptByUUID(conceptRef.conceptUUID).name) :
                Encounter.prototype.dynamicDataResolver.getConceptByUUID(observation.valueJSON.answer.conceptUUID).name;
        default:
            return observation.valueJSON.answer;
    }
};

export {getObservationValue as getObservationValue};
