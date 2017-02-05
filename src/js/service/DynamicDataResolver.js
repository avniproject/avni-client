import ConceptService from "./ConceptService";

class DynamicDataResolver {
    constructor(context) {
        this.context = context;
    }

    getConceptByUUID(conceptUUID) {
        return this.context.getBean(ConceptService).getConceptByUUID(conceptUUID);
    }
}

export default DynamicDataResolver;