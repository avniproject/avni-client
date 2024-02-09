import {Concept, KeyValue} from 'openchs-models';
import General from "../../src/utility/General";
import _ from 'lodash';

class TestConceptFactory {
    static create({uuid, dataType: dataType, name: name, answers = [], keyValues = []} = {answers: []}) {
        const concept = new Concept();
        concept.name = name;
        concept.uuid = uuid;
        concept.datatype = dataType;
        concept.answers = [];
        concept.keyValues = _.map(keyValues, KeyValue.fromResource);
        answers.forEach((x) => concept.addAnswer(x));
        return concept;
    }

    static createWithDefaults({uuid = General.randomUUID(), dataType: dataType, name = General.randomUUID(), answers = [], keyValues = []} = {answers: []}) {
        return this.create({uuid: uuid, name, dataType, answers, keyValues});
    }
}

export default TestConceptFactory;
