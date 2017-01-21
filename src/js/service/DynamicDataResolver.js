import _ from "lodash";
import ConceptService from "./ConceptService";

class DynamicDataResolver {
    constructor(context) {
        this.context = context;
    }

    getConceptByUUID(conceptUUID) {
        return this.context.get(ConceptService).getConceptByUUID(conceptUUID);
    }
}

export default DynamicDataResolver;