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

    looseMotionSinceHowManyDays(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEncounter("Child PNC stool related complaints").containsAnswerConceptName("Loose stools");
        return statusBuilder.build();
    }

    greenishStoolSinceHowManyDays(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEncounter("Child PNC stool related complaints").containsAnswerConceptName("Greenish Stool");
        return statusBuilder.build();
    }

    bloodInStoolSinceHowManyDays(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEncounter("Child PNC stool related complaints").containsAnswerConceptName("Blood in stools");
        return statusBuilder.build();
    }

    notPassingStoolsSinceHowManyDays(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEncounter("Child PNC stool related complaints").containsAnswerConceptName("Not passing stools");
        return statusBuilder.build();
    }
    childCriesWhilePassingStoolSinceHowManyDays(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({programEncounter, formElement});
        statusBuilder.show().when.valueInEncounter("Child PNC stool related complaints").containsAnswerConceptName("Child cries before or while passing stool");
        return statusBuilder.build();
    }

}

export default ChildPNCFormHandler;