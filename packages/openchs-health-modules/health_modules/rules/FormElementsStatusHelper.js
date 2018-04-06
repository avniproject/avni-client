import _ from "lodash";
import {FormElementStatus} from "openchs-models";
import moment from "moment";

class FormElementsStatusesHelper {
    static removeSpecialCharsRegex = new RegExp(/[-[\]{}()*+?.,\\^$|#]/g);

    static getFormElementsStatuses(handler = {}, entity, formElementGroup, today) {
        if (handler['preFilter'])
            handler['preFilter'](entity, formElementGroup, today);

        return formElementGroup.getFormElements().map((formElement) => {
            let nameWOSpecialChars = formElement.name.replace(FormElementsStatusesHelper.removeSpecialCharsRegex, '');
            let fnName = _.camelCase(nameWOSpecialChars);
            let fn = handler[fnName];
            if (_.isNil(fn)) return new FormElementStatus(formElement.uuid, true);
            return fn.bind(handler)(entity, formElement, today);
        });
    }

    static createStatusBasedOnCodedObservationMatch(programEncounter, formElement, dependentConceptName, dependentConceptValue) {
        let observationValue = programEncounter.getObservationValue(dependentConceptName);
        return new FormElementStatus(formElement.uuid, observationValue === dependentConceptValue);
    }

    static createStatusBasedOnGenderMatch(programEncounter, formElement, genderValue) {
        return new FormElementStatus(formElement.uuid, programEncounter.programEnrolment.individual.gender.name === genderValue);
    }

    static weeksBetween(arg1, arg2) {
        return moment.duration(moment(arg1).diff(moment(arg2))).asWeeks();
    }
}

export default FormElementsStatusesHelper;