import FormElementsStatusHelper from "../../../../rules-config/src/rules/FormElementsStatusHelper";

export default class EleventhAndTwelfthStandardFormHandler {
    reasonForDroppingOut(programEncounter, formElement) {
        return FormElementsStatusHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'School going', 'Dropped Out');
    }

    inWhichStandardHeSheIsStudying(programEncounter, formElement) {
        return FormElementsStatusHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'School going', 'Yes');
    }

    areYouTakingRegularTreatmentForSickleCellDisease(programEncounter, formElement) {
        return FormElementsStatusHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'Is there any other condition you want to mention about him/her?', 'Sickle cell disease');
    }

    isThereAnyProblemRegardingMenstruation(programEncounter, formElement) {
        return FormElementsStatusHelper.createStatusBasedOnGenderMatch(programEncounter, formElement, 'Female');
    }

    howDidTheAccidentHappen(programEncounter, formElement) {
        return FormElementsStatusHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'Road accident in past 6 months', 'Yes');
    }
}