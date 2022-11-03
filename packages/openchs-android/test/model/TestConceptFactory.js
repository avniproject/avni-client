import {Concept} from 'openchs-models';

class TestConceptFactory {
    static create({uuid}) {
        const concept = new Concept();
        concept.uuid = uuid;
        return concept;
    }
}

export default TestConceptFactory;
