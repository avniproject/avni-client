import {FormElementStatusBuilder, FormElementStatus} from "rules-config/rules";
import _ from 'lodash';
import * as calculations from "../calculations";

export default class EnrolmentFormHandler {

    estimatedDateOfDelivery(programEnrolment, formElement) {
        const lmpDate = programEnrolment.getObservationValue('Last menstrual period');
        return _.isNil(lmpDate) ?
            new FormElementStatus(formElement.uuid, true) :
            new FormElementStatus(formElement.uuid, true, calculations.estimatedDateOfDelivery(programEnrolment));
    }

    obstetricsHistory(programEnrolment, formElement){
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Gravida").is.greaterThan(1);
        return statusBuilder.build();
    }

    otherObstetricsHistory(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Obstetrics history").containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    parityGreaterThanZero(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Parity").is.greaterThan(0);
        return statusBuilder.build();
    }

    numberOfMaleChildren(programEnrolment, formElement) {
        return this.parityGreaterThanZero(programEnrolment, formElement);
    }

    numberOfFemaleChildren(programEnrolment, formElement) {
        return this.parityGreaterThanZero(programEnrolment, formElement);
    }

    ageOfYoungestChild(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Number of male children").is.greaterThan(0)
            .or.valueInEnrolment("Number of female children").is.greaterThan(0);
        return statusBuilder.build();
    }

    isSheOnTbMedication(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInRegistration("Medical history").is.containsAnswerConceptName("TB");
        return statusBuilder.build();
    }

    hasSheBeenTakingHerTbMedicationRegularly(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Is she on TB medication?").is.containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    didSheCompleteHerTbTreatment(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Is she on TB medication?").is.containsAnswerConceptName("No");
        return statusBuilder.build();
    }

    parity(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Gravida").is.greaterThan(1);
        return statusBuilder.build();
    }

    numberOfAbortions(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Gravida").is.greaterThan(1);
        return statusBuilder.build();
    }

    _getStatusBuilder(programEnrolment, formElement) {
        return new FormElementStatusBuilder({
            programEnrolment: programEnrolment,
            formElement: formElement
        });
    }

    _showIfMotherDead(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInExit("Mother exit reason").containsAnyAnswerConceptName('Death');
        return statusBuilder.build();
    }

    causeOfDeath = this._showIfMotherDead

    dateOfDeath = this._showIfMotherDead

    placeOfDeath = this._showIfMotherDead

    deathOccurredAfterHowManyDaysOfDelivery = this._showIfMotherDead
}