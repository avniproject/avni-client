import _ from "lodash";
import {FormElementStatus} from "openchs-models";

class FormFilterHelper {
    static removeSpecialCharsRegex = new RegExp(/[-[\]{}()*+?.,\\^$|#]/g);

    static filterFormElements(handler, entity, formElementGroup, today) {
        return formElementGroup.formElements.map((formElement) => {
            let nameWOSpecialChars = formElement.name.replace(FormFilterHelper.removeSpecialCharsRegex, '');
            let fnName = _.camelCase(nameWOSpecialChars);
            // console.log(`Resolved function name=${fnName}`);
            let fn = handler[fnName];
            if (_.isNil(fn)) return new FormElementStatus(formElement.uuid, true);
            return fn(entity, formElement);
        });
    }

    static createStatusBasedOnCodedObservationMatch(programEncounter, formElement, dependentConceptName, dependentConceptValue) {
        let observationValue = programEncounter.getObservationValue(dependentConceptName);
        return new FormElementStatus(formElement.uuid, observationValue === dependentConceptValue);
    }

    static createStatusBasedOnGenderMatch(programEncounter, formElement, genderValue) {
        return new FormElementStatus(formElement.uuid, programEncounter.programEnrolment.individual.gender.name === genderValue);
    }
}

export default FormFilterHelper;