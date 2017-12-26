import FormFilterHelper from "../../rules/FormFilterHelper";
import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";

export default class {
    reasonForDroppingAsPerTeacher(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement,
        });
        statusBuilder.show().when.addressType.equals("School")
            .or.when.addressType.equals("Boarding");
        return statusBuilder.build();
    }

    otherReasonAccordingToStudentParent(programEncounter, formElement) {
        return FormFilterHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'Reason for dropping as per student / parent', 'Other');
    }

    otherReasonAccordingToTeacher(programEncounter, formElement) {
        return FormFilterHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'Reason for dropping as per teacher', 'Other');
    }

    otherActivityPleaseSpecify(programEncounter, formElement) {
        return FormFilterHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'What he/she is doing now?', 'Other');
    }
}