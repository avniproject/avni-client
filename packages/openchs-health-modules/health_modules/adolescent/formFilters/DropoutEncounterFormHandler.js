import FormFilterHelper from "../../rules/FormFilterHelper";

export default class {
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