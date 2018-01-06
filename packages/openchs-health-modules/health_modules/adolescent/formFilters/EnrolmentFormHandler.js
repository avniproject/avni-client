import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";

export default class EnrolmentFormHandler {

    causeOfDeath(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInExit("Adolescent exit reason").containsAnyAnswerConceptName('Death');
        return statusBuilder.build();
    }

    causeOfDeathUnspecifiedAbove(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show()
            .when.valueInExit("Adolescent exit reason").containsAnyAnswerConceptName('Death')
            .and.valueInExit("Cause of Death").containsAnyAnswerConceptName('Other');
        return statusBuilder.build();
    }

    ageAtMarriage(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInExit("Adolescent exit reason").containsAnyAnswerConceptName('Marriage');
        return statusBuilder.build();
    }

    _getStatusBuilder(programEnrolment, formElement) {
        return new FormElementStatusBuilder({
            programEnrolment: programEnrolment,
            formElement: formElement
        });
    }
}
