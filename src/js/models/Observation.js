import _ from "lodash";
import Concept from './Concept';
import moment from "moment";

class Observation {
    static schema = {
        name: 'Observation',
        properties: {
            concept: 'Concept',
            valueJSON: 'string'
        }
    };

    static create(concept, answer){
        const observation = new Observation();
        observation.concept = concept;
        observation.valueJSON = {answer : answer};
        return observation;
    }

    toggleMultiSelectAnswer(answer) {
        if (this.collectionHasEntity(this.valueJSON.answer, answer)) {
            this.removeFromCollection(this.valueJSON.answer, answer);
        }
        else {
            this.valueJSON.answer.push(answer);
        }
    }

    //TODO the methods are very similar to the ones in BaseEntity. see if they can be merged
    collectionHasEntity(collection, entity) {
        return _.findIndex(collection, function (item) {
                return item.concept.uuid === entity;
            }) !== -1;
    }

    removeFromCollection(collection, entity) {
        _.remove(collection, function (item) {
            return item.concept.uuid === entity;
        });
    }

    static valueAsString(observation, conceptService) {
        switch (observation.concept.datatype) {
            case Concept.dataType.Date:
                return moment(observation.valueJSON.answer).format('DD-MMM-YYYY');
            case Concept.dataType.Coded:
                return _.isArray(observation.valueJSON.answer) ? _.join(observation.valueJSON.answer, ', ') : conceptService.getConceptByUUID(observation.valueJSON.answer.conceptUUID).name;
            default:
                return observation.valueJSON;
        }
    }

    getValue() {

    }
}

export default Observation;