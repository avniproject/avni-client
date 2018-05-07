import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";

class ChildDeliveryFormHandler {
    dateOfDelivery(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter: programEncounter, formElement: formElement});
        statusBuilder.show().when.valueInEntireEnrolment("Date of delivery").is.notDefined
            .or.when.valueInEncounter("Date of delivery").is.defined;
        return statusBuilder.build();
    }

    whenDidBreastFeedingStart(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter: programEncounter, formElement: formElement});
        statusBuilder.show().when.valueInEncounter("Breast feeding within 1 hour of birth").is.no;
        return statusBuilder.build();
    }

}

export default ChildDeliveryFormHandler;