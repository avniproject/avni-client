import {FormElementStatusBuilder} from "rules-config/rules";

class BirthFormHandler {
    whenDidBreastFeedingStart(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
        statusBuilder.show().when.valueInEncounter("Breast feeding within 1 hour of birth").is.no;
        return statusBuilder.build();
    }

    otherBirthDefects(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
        statusBuilder.show().when.valueInEncounter("Birth Defects").containsAnswerConceptName("Other");
        return statusBuilder.build();
    }
}

export default BirthFormHandler;