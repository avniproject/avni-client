import Concepts from "../../resources/sample-concepts.json";
import _ from "lodash";

class StubbedConceptService {
    getConceptByName(conceptName) {
        return _.find(Concepts, (concept)=>concept.name === conceptName);
    }
}

export default StubbedConceptService;