import StubbedMessageService from "../../service/stub/StubbedMessageService";
import StubbedConceptService from "../../service/stub/StubbedConceptService";
import StubbedDecisionConfigService from "../../service/stub/StubbedDecisionConfigService";
import StubbedConfigService from "../../service/stub/StubbedConfigService";

class TestContext {
    getService(type) {
        if (type.name === "MessageService")
            return new StubbedMessageService();
        else if (type.name === "ConceptService")
            return new StubbedConceptService();
        else if (type.name === "DecisionConfigService")
            return new StubbedDecisionConfigService();
        else if (type.name === "ConfigService")
            return new StubbedConfigService();
        return {
            getDecision: function () {
                return [{name: "Treatment", code: "ABC001", value: "The patient should be referred to the hospital immediately as he may having tuberculosis", alert: "ALERT MESSAGE"}]
            }
        };
    }

    getBean(type) {
        return this.getService(type);
    }

    navigator() {
        return {
            pop: function () {
            }
        }
    }
}

export default TestContext;