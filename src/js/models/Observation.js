import _ from "lodash";

class Observation {
    static schema = {
        name: 'Observation',
        properties: {
            conceptUUID: 'string',
            valueJSON: 'string'
        }
    };

    constructor(conceptUUID, answer){
        this.conceptUUID = conceptUUID;
        this.valueJSON = {answer : answer}
    }

    toggleMultiSelectAnswer(answer){
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
                return item.conceptUUID === entity;
            }) !== -1;
    }

    removeFromCollection(collection, entity) {
        _.remove(collection, function (item) {
            return item.conceptUUID === entity;
        });
    }



}

export default Observation;