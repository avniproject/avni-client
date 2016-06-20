let instance = null;

class ConceptData {
    constructor() {
        if (!instance) {
            instance = this;
        }
        instance.concepts = require("../../config/concepts.json");
        return instance;
    }
}

export default new ConceptData().concepts;