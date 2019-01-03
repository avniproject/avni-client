import {FormElementStatusBuilder, FormElementStatus} from "rules-config/rules";
import C from '../../common';
import _ from 'lodash';
import {RuleCondition} from "rules-config";

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

    whatMalariaTreatmentTabletsAreAvailable(encounter, formElement) {
        const statusBuilder = this._getStatusBuilder(encounter, formElement);
        const isPfPositive = new RuleCondition({programEncounter: encounter})
            .valueInEncounter("Paracheck")
            .containsAnyAnswerConceptName("Positive for PF and PV", "Positive for PF")
            .matches();
        const notAWomanBetween16And40Years = !(new RuleCondition({programEncounter: encounter})
            .female
            .and.age.is.greaterThanOrEqualTo(16)
            .and.age.is.lessThanOrEqualTo(40)
            .matches());
        const notPregnant = !(new RuleCondition({programEncounter: encounter})
            .valueInEncounter("Complaint")
            .containsAnswerConceptName("Pregnancy")
            .matches());
        statusBuilder.show()
            .whenItem(isPfPositive && notAWomanBetween16And40Years && notPregnant).is.truthy;
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