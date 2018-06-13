import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";

class ChildPNCFormHandler {

    whenDidTheChildPassUrineForTheFirstTimeAfterBirth(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEntireEnrolment("Duration in hours between birth and first urination").is.notDefined
            .or.when.valueInEncounter("Duration in hours between birth and first urination").is.defined;
        return statusBuilder.build();
    }

    whenDidTheChildPassMeconiumForTheFirstTimeAfterBirth(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEntireEnrolment("Duration in hours between birth and meconium").is.notDefined
            .or.when.valueInEncounter("Duration in hours between birth and meconium").is.defined;
        return statusBuilder.build();
    }
}

export default ChildPNCFormHandler;