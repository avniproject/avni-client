import _ from "lodash";
import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";

export default class AbortionFormHandler {

    otherAbortionComplaints(programEncounter, formElement){
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Abortion complaints").containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    dateOfDischarge(programEncounter, formElement) {
        const statusBuilder = this._formStatusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Place of abortion").containsAnswerConceptName("Institutional");
        return statusBuilder.build();
    }

    _formStatusBuilder(programEncounter, formElement) {
        return new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        })
    }
}