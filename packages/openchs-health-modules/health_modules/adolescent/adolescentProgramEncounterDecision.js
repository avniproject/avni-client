import _ from "lodash";
import FormElementStatus from "../../../openchs-models/src/application/FormElementStatus";

export function filterFormElements (programEncounter, formElementGroup, today) {
    return formElementGroup.formElements.map((formElement) => {
        let nameWOSpecialChars = formElement.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '');
        let fnName = _.camelCase(nameWOSpecialChars);
        let eleventhAndTwlefthStandard = new EleventhAndTwlefthStandard();
        let fn = eleventhAndTwlefthStandard[fnName];
        if (_.isNil(fn)) return new FormElementStatus(formElement.uuid, true);
        return fn(programEncounter);
    });
}

class EleventhAndTwlefthStandard {
    schoolGoing(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, true);
    }

    reasonForDroppingOut(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, true);
    }

    whatHeSheIsDoingNow(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, true);
    }
}