import FormElementStatusBuilder from "../../rules/FormElementStatusBuilder";
import c from '../../common';
import _ from 'lodash';
import FormElementStatus from "../../../../openchs-models/src/application/FormElementStatus";

export default class EnrolmentFormHandler {

    estimatedDateOfDelivery(programEnrolment, formElement) {
        const lmpDate = programEnrolment.getObservationValue('Last Menstrual Period');
        if(!_.isNil(lmpDate)){
            const edd = c.addDays(lmpDate, 280);
            return new FormElementStatus(formElement.uuid, true, edd);
        }
        let statusBuilder = this._getStatusBuilder(programEnrolment, formElement);
        return statusBuilder.build();
    }

    _getStatusBuilder(programEnrolment, formElement) {
        return new FormElementStatusBuilder({
            programEnrolment: programEnrolment,
            formElement: formElement
        });
    }


}