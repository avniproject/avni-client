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


    toggleMultiSelectAnswer(answerUUID) {
        if (Observation.isAnswerAlreadyPresent(this.valueJSON.answer, answerUUID)) {
            Observation.removeAnswer(this.valueJSON.answer, answerUUID);
        }
        else {
            this.valueJSON.answer.push(answerUUID);
        }
    }

    toggleSingleSelectAnswer(answerUUID) {
        if(this.valueJSON.answer.conceptUUID === answerUUID){
            this.valueJSON = "";
        }else {
            this.valueJSON = {answer : {conceptUUID : answerUUID}};
        }
    }

    //TODO the methods are very similar to the ones in BaseEntity. see if they can be merged
    static isAnswerAlreadyPresent(selectedAnswers, answer) {
        return _.findIndex(selectedAnswers, function (item) {
                return item.conceptUUID === answer;
            }) !== -1;
    }

    static removeAnswer(selectedAnswers, answer) {
        _.remove(selectedAnswers, function (item) {
            return item.conceptUUID === answer;
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

    hasNoAnswer(){
        return _.isEmpty(this.valueJSON.answer)
    }

}

export default Observation;