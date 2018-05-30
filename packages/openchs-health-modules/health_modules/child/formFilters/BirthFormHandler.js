import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";

class BirthFormHandler {
    whenDidBreastFeedingStart(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter: programEncounter, formElement: formElement});
        statusBuilder.show().when.valueInEncounter("Breast feeding within 1 hour of birth").is.no;
        return statusBuilder.build();
    }

}

export default BirthFormHandler;