import {Concept} from 'openchs-models';

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
}

export default TestConceptFactory;
