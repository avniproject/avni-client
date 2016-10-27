import StubbedMessageService from "../../service/stub/StubbedMessageService";
import StubbedConceptService from "../../service/stub/StubbedConceptService";

class TestContext {
    getService(type) {
        if (type.name === "MessageService")
            return new StubbedMessageService();
        else if (type.name === "ConceptService")
            return new StubbedConceptService();
        return {
            "getDecision": function () {
                return [{name: "Treatment", code: "ABC001", value: "The patient should be referred to the hospital immediately as he may having tuberculosis", alert: "ALERT MESSAGE"}]
            }
        };
    }

    navigator() {
    }
}

export default TestContext;