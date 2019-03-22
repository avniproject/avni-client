import {FormElementStatus, FormElementStatusBuilder, WithName} from "rules-config/rules";
import moment from 'moment';

class DeliveryFormHandler {

    @WithName('Date of discharge')
    1(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
        statusBuilder.show().when.valueInEncounter("Place of delivery").not.containsAnswerConceptName("Home");
        return statusBuilder.build();
    }

    @WithName('Delivery outcome')
    2(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
        statusBuilder.skipAnswers("Live birth and Still birth")
            .when.valueInEncounter("Number of babies").lessThanOrEqualTo(1);
        statusBuilder.show().whenItem(true).is.truthy;
        return statusBuilder.build();
    }

    @WithName('Number of days stayed at the hospital post delivery')
    3(programEncounter, formElement) {
        const days = moment(programEncounter.getObservationReadableValue('Date of discharge'))
            .diff(programEncounter.getObservationReadableValue('Date of delivery'), 'days');
        const value = isFinite(days) ? days : undefined;
        return new FormElementStatus(formElement.uuid, true, value);
    }

    numberOfStillBornBabies(programEncounter, formElement) {
        const statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
        statusBuilder.show().when.valueInEncounter("Delivery outcome")
            .containsAnyAnswerConceptName("Live birth and Still birth", "Still Birth");
        const status = statusBuilder.build();
        // status.value = this._getNoOfStillBornBabies(programEncounter);
        return status;
    }

    genderOfStillborn1(programEncounter, formElement) {
        return this._showWhenNoOfStillbornsIsMoreThan(programEncounter, formElement, 1);
    }

    genderOfStillborn2(programEncounter, formElement) {
        return this._showWhenNoOfStillbornsIsMoreThan(programEncounter, formElement, 2);
    }

    genderOfStillborn3(programEncounter, formElement) {
        return this._showWhenNoOfStillbornsIsMoreThan(programEncounter, formElement, 3);
    }

    weightOfStillborn1 = this.genderOfStillborn1
    weightOfStillborn2 = this.genderOfStillborn2
    weightOfStillborn3 = this.genderOfStillborn3

    _showWhenNoOfStillbornsIsMoreThan(programEncounter, formElement, no) {
        const statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
        statusBuilder.show().when.valueInEncounter("Number of still born babies")
            .defined.and.greaterThanOrEqualTo(no);
        return statusBuilder.build();
    }

    _showWhenNoOfBabiesIsMoreThan(programEncounter, formElement, no) {
        const statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
        statusBuilder.show().when.valueInEncounter("Number of babies")
            .defined.and.greaterThanOrEqualTo(no);
        return statusBuilder.build();
    }

    genderOfNewBorn1(programEncounter, formElement) {
        return this._showWhenNoOfBabiesIsMoreThan(programEncounter, formElement, 1);
    }

    genderOfNewBorn2(programEncounter, formElement) {
        return this._showWhenNoOfBabiesIsMoreThan(programEncounter, formElement, 2);
    }

    genderOfNewBorn3(programEncounter, formElement) {
        return this._showWhenNoOfBabiesIsMoreThan(programEncounter, formElement, 3);
    }

    _getNoOfStillBornBabies(programEncounter) {
        const deliveryOutcome = programEncounter.getObservationReadableValue("Delivery outcome");
        const noOfBabies = programEncounter.getObservationValue("Number of babies");
        let noOfStillBornBabies = 0;
        if (deliveryOutcome === "Still Birth") {
            noOfStillBornBabies = noOfBabies;
        } else if (deliveryOutcome === "Live birth and Still birth") {
            noOfStillBornBabies = noOfBabies - 1;
        }
        return noOfStillBornBabies;
    }
}

export default DeliveryFormHandler;