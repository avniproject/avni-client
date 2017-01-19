import _ from "lodash";

class Observation {
    static schema = {
        name: 'Observation',
        properties: {
            concept: 'Concept',
            valueJSON: 'string'
        }
    };

    constructor(concept, answer){
        this.concept = concept;
        this.valueJSON = {answer : answer}
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
}

export default Observation;