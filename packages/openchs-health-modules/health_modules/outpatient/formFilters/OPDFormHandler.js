import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";
import C from '../../common';
import _ from 'lodash';
import FormElementStatus from "../../../../openchs-models/src/application/FormElementStatus";

export default class {

    otherComplaint(encounter, formElement) {
        let statusBuilder = this._getStatusBuilder(encounter, formElement);
        statusBuilder.show().when.valueInEncounter("Complaint").containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    reasonForReferral(encounter, formElement) {
        let statusBuilder = this._getStatusBuilder(encounter, formElement);
        statusBuilder.show().when
            .valueInEncounter("Is outpatient referred to higher health center?").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    bmi(encounter, formElement) {
        let weight = encounter.getObservationValue('Weight');
        let height = encounter.getObservationValue('Height');

        let bmi = '';
        if (_.isNumber(height) && _.isNumber(weight)) {
            bmi = C.calculateBMI(weight, height);
        }
        return new FormElementStatus(formElement.uuid, true, bmi);

    }

    _getStatusBuilder(encounter, formElement) {
        return new FormElementStatusBuilder({
            programEncounter: encounter,
            formElement: formElement
        });
    }
}