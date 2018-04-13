import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";
import c from '../../common';
import _ from 'lodash';
import FormElementStatus from "../../../../openchs-models/src/application/FormElementStatus";

export default class EnrolmentFormHandler {

    estimatedDateOfDelivery(programEnrolment, formElement) {
        const lmpDate = programEnrolment.getObservationValue('Last menstrual period');
        if (!_.isNil(lmpDate)) {
            const edd = c.addDays(lmpDate, 280);
            return new FormElementStatus(formElement.uuid, true, edd);
        }
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        return statusBuilder.build();
    }

    otherObstetricsHistory(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Obstetrics history").containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    numberOfMaleChildren(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Parity").is.greaterThan(0);
        return statusBuilder.build();
    }

    numberOfFemaleChildren(programEnrolment, formElemnt) {
        return this.numberOfMaleChildren(programEnrolment, formElemnt);
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
        statusBuilder.show().when.valueInEnrolment("Is she on medication?").is.containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    didSheCompleteHerTbTreatment(programEnrolment, formElement) {
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        statusBuilder.show().when.valueInEnrolment("Is she on medication?").is.containsAnswerConceptName("No");
        return statusBuilder.build();
    }

    _getStatusBuilder(programEnrolment, formElement) {
        return new FormElementStatusBuilder({
            programEnrolment: programEnrolment,
            formElement: formElement
        });
    }
}