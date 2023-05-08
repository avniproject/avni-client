import _ from "lodash";
import StubbedBaseService from "./StubbedBaseService";

class StubbedConceptService extends StubbedBaseService {
    getConceptByName(conceptName) {
        return _.find(this.serviceData, (concept) => concept.name === conceptName);
    }

    getConceptByUUID(conceptName) {
        return conceptName;
    }

    addDecisions(observations, decisions) {
    }
}

export default StubbedConceptService;
