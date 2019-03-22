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

    otherReasonPleaseSpecify(programExit, formElement) {
        const statusBuilder = this._getStatusBuilder(programExit, formElement);
        statusBuilder.show().when.valueInExit("Reason for child exit").containsAnswerConceptName("Other");
        return statusBuilder.build();
    }


    _getStatusBuilder(programExit, formElement) {
        return new FormElementStatusBuilder({
            programEnrolment: programExit,
            formElement
        });
    }
}