import FormElementStatusBuilder from "../rules/FormElementStatusBuilder";

export default class {

    otherComplaint(encounter, formElement) {
        let statusBuilder = this._getStatusBuilder(encounter, formElement);
        statusBuilder.show().when.valueInEncounter("Complaint").containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    _getStatusBuilder(encounter, formElement) {
        return new FormElementStatusBuilder({
            programEncounter: encounter,
            formElement: formElement
        });
    }
}