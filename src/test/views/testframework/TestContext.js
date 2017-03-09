import StubbedMessageService from "../../service/stub/StubbedMessageService";
import StubbedConceptService from "../../service/stub/StubbedConceptService";
import StubbedConfigFileService from "../../service/stub/StubbedConfigFileService";
import IndividualService from "../../../js/service/IndividualService";
import StubbedIndividualService from "../../service/stub/StubbedIndividualService";
import FormMappingService from "../../../js/service/FormMappingService";
import StubbedFormMappingService from "../../service/stub/StubbedFormMappingService";

class TestContext {
    getService(type) {
        if (type.name === "MessageService")
            return new StubbedMessageService();
        else if (type.name === "ConceptService")
            return new StubbedConceptService();
        else if (type.name === "ConfigFileService")
            return new StubbedConfigFileService();
        else if (type === IndividualService)
            return new StubbedIndividualService();
        else if (type === FormMappingService)
            return new StubbedFormMappingService();
        return {
            getDecision: function () {
                return [{name: "Treatment", code: "ABC001", value: "The patient should be referred to the hospital immediately as he may having tuberculosis", alert: "ALERT MESSAGE"}]
            }
        };
    }

    get(type) {
        return this.getBean(type);
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