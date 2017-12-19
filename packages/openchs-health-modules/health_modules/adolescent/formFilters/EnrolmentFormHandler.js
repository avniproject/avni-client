import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";
import FormFilterHelper from "../../rules/FormFilterHelper";

export default class EnrolmentFormHandler {

    fathersOccupation(programEnrolment, formElement) {
        return this._fatherIsAlive(programEnrolment, formElement);
    }

    fathersAddiction(programEnrolment, formElement) {
        return this._fatherIsAlive(programEnrolment, formElement);
    }

    mothersOccupation(programEnrolment, formElement) {
        return this._motherIsAlive(programEnrolment, formElement);
    }

    mothersAddiction(programEnrolment, formElement) {
        return this._motherIsAlive(programEnrolment, formElement);
    }

    causeOfDeath(programEncounter, formElement) {
        return FormFilterHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'Adolescent exit reason', 'Death');
    }

    causeOfDeathUnspecifiedAbove(programEncounter, formElement) {
        return FormFilterHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'Cause of Death', 'Other');
    }


    _fatherIsAlive(programEnrolment, formElement) {
        return this._parentStatusContains(["Both Alive", "Only Father Alive"], programEnrolment, formElement);
    }

    _motherIsAlive(programEnrolment, formElement) {
        return this._parentStatusContains(["Both Alive", "Only Mother Alive"], programEnrolment, formElement);
    }

    _parentStatusContains(statuses, programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Parents life status").containsAnyAnswerConceptName(...statuses);

        return statusBuilder.build();
    }

    _getStatusBuilder(programEnrolment, formElement) {
        return new FormElementStatusBuilder({
            programEnrolment: programEnrolment,
            formElement: formElement
        });
    }
}
