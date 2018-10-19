import {FormElementStatusBuilder} from "rules-config/rules";

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

    whenDidTheChildPassUrineForTheFirstTimeAfterBirth(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEncounter("Child passed urine since birth").is.yes;
        return statusBuilder.build();
    }

    whenDidTheChildPassMeconiumForTheFirstTimeAfterBirth(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEncounter("Child passed meconium since birth").is.yes;
        return statusBuilder.build();
    }


    whatElseIsTheBabyBeingFed(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEncounter("Is baby exclusively breastfeeding").is.no;
        return statusBuilder.build();
    }

}

export default ChildPNCFormHandler;