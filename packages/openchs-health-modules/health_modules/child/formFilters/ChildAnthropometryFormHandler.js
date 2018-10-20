import {FormElementStatusBuilder} from "rules-config/rules";

class ChildAnthropometryFormHandler {

    height(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
        statusBuilder.show().when.valueInEncounter("Skip capturing height").is.notDefined;
        return statusBuilder.build();
    }

    reasonForSkippingHeightCapture(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
        statusBuilder.show().when.valueInEncounter("Skip capturing height").is.yes;
        return statusBuilder.build();
    }
}

export default ChildAnthropometryFormHandler;


