import {Concept} from 'openchs-models';
import General from "../../src/utility/General";

class TestConceptFactory {
    static create({uuid, dataType: dataType, name: name, answers = []} = {answers: []}) {
        const concept = new Concept();
        concept.name = name;
        concept.uuid = uuid;
        concept.datatype = dataType;
        concept.answers = [];
        answers.forEach((x) => concept.addAnswer(x));
        return concept;
    }

    static createWithDefaults({uuid = General.randomUUID(), dataType: dataType, name = General.randomUUID(), answers = []} = {answers: []}) {
        return this.create({uuid: uuid, name, dataType, answers});
    }
}

export default TestConceptFactory;
