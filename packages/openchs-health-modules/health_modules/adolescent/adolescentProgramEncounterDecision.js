import _ from "lodash";
import FormElementStatus from "../../../openchs-models/src/application/FormElementStatus";

export function filterFormElements (programEncounter, formElementGroup, today) {
    return formElementGroup.formElements.map((formElement) => {
        let nameWOSpecialChars = formElement.name.replace(/[-[\]{}()*+?.,\\^$|#]/g, '');
        let fnName = _.camelCase(nameWOSpecialChars);
        // console.log(`Resolved function name=${fnName}`);
        let eleventhAndTwlefthStandard = new EleventhAndTwlefthStandard();
        let fn = eleventhAndTwlefthStandard[fnName];
        if (_.isNil(fn)) return new FormElementStatus(formElement.uuid, true);
        return fn(programEncounter, formElement);
    });
}

class EleventhAndTwlefthStandard {
    static createStatusBasedOnCodedObservation(programEncounter, formElement, dependentConceptName, dependentConceptValue) {
        let observationValue = programEncounter.getObservationValue(dependentConceptName);
        return new FormElementStatus(formElement.uuid, observationValue === dependentConceptValue);
    }

    static createStatusBasedOnGender(programEncounter, formElement, genderValue) {
        return new FormElementStatus(formElement.uuid, programEncounter.programEnrolment.individual.gender.name === genderValue);
    }

    reasonForDroppingOut(programEncounter, formElement) {
        return EleventhAndTwlefthStandard.createStatusBasedOnCodedObservation(programEncounter, formElement, 'School going', 'Dropped Out');
    }

    inWhichStandardHeSheIsStudying(programEncounter, formElement) {
        return EleventhAndTwlefthStandard.createStatusBasedOnCodedObservation(programEncounter, formElement, 'School going', 'Yes');
    }

    areYouTakingRegularTreatmentForSickleCellDisease(programEncounter, formElement) {
        return EleventhAndTwlefthStandard.createStatusBasedOnCodedObservation(programEncounter, formElement, 'Is there any other condition you want to mention about him/her?', 'Sickle Cell Disease');
    }

    isThereAnyProblemRegardingMenstruation(programEncounter, formElement) {
        return EleventhAndTwlefthStandard.createStatusBasedOnGender(programEncounter, formElement, 'Female');
    }

    howDidTheAccidentHappen(programEncounter, formElement) {
        return EleventhAndTwlefthStandard.createStatusBasedOnCodedObservation(programEncounter, formElement, 'Road accident in past 6 months', 'Yes');
    }
}