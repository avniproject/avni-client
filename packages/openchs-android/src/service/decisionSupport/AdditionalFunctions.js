import _ from 'lodash';
import {Concept, Encounter} from 'openchs-models';
import General from "../../utility/General";

//on encounter
let getCodedAnswer = function (observation) {
    return Encounter.prototype.dynamicDataResolver.getConceptByUUID(observation.getValueWrapper().getConceptUUID()).name;
};

const getObservationValue = function (conceptName) {
    const observation = this.findObservation(conceptName);

    if (_.isNil(observation)) {
        General.logWarn('AdditionalFunctions', `No observation found for concept: ${conceptName}`);
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
//end on encounter

export {
    getObservationValue as getObservationValue
};
