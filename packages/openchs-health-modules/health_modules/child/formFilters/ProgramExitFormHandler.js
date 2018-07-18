import {FormElementStatusBuilder} from "rules-config/rules";

export default class ProgramExitFormHandler {

    dateOfDeath(programExit, formElement) {
        const statusBuilder = this._getStatusBuilder(programExit, formElement);
        statusBuilder.show().when.valueInExit("Reason for child exit").containsAnswerConceptName("Death");
        return statusBuilder.build();
    }

    causeOfDeath(programExit, formElement) {
        const statusBuilder = this._getStatusBuilder(programExit, formElement);
        statusBuilder.show().when.valueInExit("Reason for child exit").containsAnswerConceptName("Death");
        return statusBuilder.build();
    }

    placeOfDeath(programExit, formElement) {
        const statusBuilder = this._getStatusBuilder(programExit, formElement);
        statusBuilder.show().when.valueInExit("Reason for child exit").containsAnswerConceptName("Death");
        return statusBuilder.build();
    }

    provideBirthWeight(programEnrolment, formElement) {
        const statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment('Registration at child birth').is.yes;
        return statusBuilder.build();
    }

    provideCurrentWeight(programEnrolment, formElement) {
        const statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment('Registration at child birth').is.no;
        return statusBuilder.build();
    }

    _getStatusBuilder(programExit, formElement) {
        return new FormElementStatusBuilder({
            programEnrolment: programExit,
            formElement
        });
    }
}