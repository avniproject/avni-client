import _ from "lodash";
import FormElementStatus from "../../../openchs-models/src/application/FormElementStatus";

export function filterFormElements (programEncounter, formElementGroup, today) {
    return formElementGroup.formElements.map((formElement) => {
        let nameWOSpecialChars = formElement.name.replace(/[-[\]{}()*+?.,\\^$|#]/g, '');
        let fnName = _.camelCase(nameWOSpecialChars);
        let eleventhAndTwlefthStandard = new EleventhAndTwlefthStandard();
        let fn = eleventhAndTwlefthStandard[fnName];
        if (_.isNil(fn)) return new FormElementStatus(formElement.uuid, true);
        return fn(programEncounter, formElement);
    });
}

class EleventhAndTwlefthStandard {
    schoolGoing(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, true);
    }

    reasonForDroppingOut(programEncounter, formElement) {
        let observationValue = programEncounter.getObservationValue('School going');
        return new FormElementStatus(formElement.uuid, observationValue === 'Dropped Out');
    }

    whatHeSheIsDoingNow(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, true);
    }
}