import Concepts from "../../resources/sample-concepts.json";
import _ from "lodash";

class StubbedConceptService {
    getConceptByName(conceptName) {
        return _.find(Concepts, (concept)=>concept.name === conceptName);
    }

    getConceptByUUID(conceptName) {
        return conceptName;
    }
}

export default StubbedConceptService;