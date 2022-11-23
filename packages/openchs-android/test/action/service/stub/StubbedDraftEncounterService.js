import _ from "lodash";
import StubbedBaseService from "./StubbedBaseService";

class StubbedDraftEncounterService extends StubbedBaseService {
    constructor(serviceData) {
        super(serviceData);
    }

    saveDraft() {
    }
}

export default StubbedDraftEncounterService;
