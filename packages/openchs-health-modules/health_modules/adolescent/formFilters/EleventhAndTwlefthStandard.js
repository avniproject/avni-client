import FormFilterHelper from "../../rules/FormFilterHelper";

export default class EleventhAndTwlefthStandard {
    reasonForDroppingOut(programEncounter, formElement) {
        return FormFilterHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'School going', 'Dropped Out');
    }

    inWhichStandardHeSheIsStudying(programEncounter, formElement) {
        return FormFilterHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'School going', 'Yes');
    }

    areYouTakingRegularTreatmentForSickleCellDisease(programEncounter, formElement) {
        return FormFilterHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'Is there any other condition you want to mention about him/her?', 'Sickle Cell Disease');
    }

    isThereAnyProblemRegardingMenstruation(programEncounter, formElement) {
        return FormFilterHelper.createStatusBasedOnGenderMatch(programEncounter, formElement, 'Female');
    }

    howDidTheAccidentHappen(programEncounter, formElement) {
        return FormFilterHelper.createStatusBasedOnCodedObservationMatch(programEncounter, formElement, 'Road accident in past 6 months', 'Yes');
    }
}