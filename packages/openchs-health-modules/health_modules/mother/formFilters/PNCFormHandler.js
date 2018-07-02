import {FormElementStatusBuilder} from "rules-config/rules";

class PNCFormHandler {
    isTheMotherUsingAnyContraceptiveMethod(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter: programEncounter, formElement: formElement});
        statusBuilder.show().when.valueInEntireEnrolment("Date of delivery").asDaysSince.is.greaterThanOrEqualTo(60);
        return statusBuilder.build();
    }

    typeOfContraceptiveMethod(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter: programEncounter, formElement: formElement});
        statusBuilder.show().when.valueInEncounter("Is the mother using any contraceptive method?").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    availedGovernmentSchemeJsy(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter: programEncounter, formElement: formElement});
        statusBuilder.show().when.valueInEntireEnrolment("Date of delivery").asDaysSince.is.greaterThanOrEqualTo(60);
        return statusBuilder.build();
    }

    otherBreastRelatedProblems(programEncounter, formElement){
        const statusBuilder = new FormElementStatusBuilder({programEncounter: programEncounter, formElement: formElement});
        statusBuilder.show().when.valueInEncounter("Any breast problems").containsAnswerConceptName("Other");
        return statusBuilder.build();
    }
}

export default PNCFormHandler;