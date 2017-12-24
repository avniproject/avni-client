import moment from "moment";
import {FormElementStatus} from "openchs-models";
import _ from "lodash";
import EncounterTypeFilter from "./EncounterTypeFilter";

export default class RoutineEncounterHandler {
    get visits() {
        return {
            MONTHLY: ["Annual Visit", "Half-Yearly Visit", "Quarterly Visit", "Monthly Visit"],
            QUARTERLY: ["Annual Visit", "Half-Yearly Visit", "Quarterly Visit"],
            HALF_YEARLY: ["Annual Visit", "Half-Yearly Visit"],
            ANNUAL: ["Annual Visit"]
        }
    }

    schoolGoing(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().whenItem(programEncounter.programEnrolment.individual.lowestAddressLevel.type).equals("Village");

        return statusBuilder.build();
    }

    reasonForDroppingOut(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when.valueInEncounter("School going").containsAnswerConceptName("Dropped Out");

        return statusBuilder.build();
    }

    droppedOutOfWhichStandard(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when.valueInEncounter("School going").containsAnswerConceptName("Dropped Out");

        return statusBuilder.build();
    }

    whatHeSheIsDoingNow(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when.valueInEncounter("School going").containsAnswerConceptName("Dropped Out");

        return statusBuilder.build();
    }

    otherActivityPleaseSpecify(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when.valueInEncounter("What he/she is doing now?").containsAnswerConceptName("Other");

        return statusBuilder.build();
    }

    nameOfSchool(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when
            .valueInEncounter("School going").containsAnswerConceptName("Yes")
            .and.whenItem(programEncounter.programEnrolment.individual.lowestAddressLevel.type).matchesFn((item) => _.some(["Boarding", "Village"], (ref) => ref === item))

        return statusBuilder.build();
    }

    inWhichStandardHeSheIsStudying(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when.valueInEncounter("School going").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    height(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build();
    }

    weightKg(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build();
    }

    bmi(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, false);
    }

    hemoglobinTestDone(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    hemoglobinTest(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when.valueInEncounter("Hemoglobin Test Done").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    sicklingTestDone(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    sicklingTestResult(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when.valueInEncounter("Sickling Test Done").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    ironTablets(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY).build();
    }

    fromWhere(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when.valueInEncounter("Iron tablets received").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    ironTabletsConsumedInLastMonth(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when.valueInEncounter("Iron tablets received").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    albendazoleTabletsReceived(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().whenItem(moment().month()).equals(8).or.equals(2);
        return statusBuilder.build();
    }

    isThereAnyPhysicalDefect(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isThereASwellingAtLowerBack(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isThereCleftLipCleftPalate(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isThereLargeGapBetweenToeAndFinger(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isHerNailsTonguePale(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isSheHeSeverelyMalnourished(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, false);
    }

    isThereAnyProblemInLegBone(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isThereASwellingOverThroat(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    doesSheHaveDifficultyInBreathingWhilePlaying(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    areThereDentalCarries(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isThereAWhitePatchInHerEyes(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    doesSheHaveImpairedVision(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isTherePusComingFromEar(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    doesSheHaveImpairedHearing(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    doesSheHaveSkinProblems(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    hasSheEverSufferedFromConvulsions(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isThereAnyNeurologicalMotorDefect(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isHerBehaviorDifferentFromOthers(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isSheSlowerThanOthersInLearningAndUnderstandingNewThings(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    isThereAnyDevelopmentalDelayOrDisabilitySeen(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    menstruationStarted(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when.female.and.latestValueInPreviousEncounters("Menstruation started").not.containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    ifMenstruationStartedThenAtWhatAge(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when.valueInEncounter("Menstruation started").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    absorbentMaterialUsed(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when.valueInEncounter("Menstruation started").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    menstrualDisorders(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when.female.and.latestValueInAllEncounters("Menstruation started").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    anyTreatmentTaken(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when.valueInEncounter("Menstrual disorders").containsAnyAnswerConceptName(
                "Lower Abdominal Pain", "Backache", "Leg Pain", "Nausea and Vomiting", "Headache",
            "Abnormal Vaginal Discharge", "Heavy Bleeding","Irregular Menses");

        return statusBuilder.build();
    }

    doesSheRemainAbsentDuringMenstruation(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when
            .latestValueInAllEncounters("Menstruation started").containsAnswerConceptName("Yes")
            .and.whenItem(programEncounter.programEnrolment.individual.lowestAddressLevel.type).not.equals("Village");

        return statusBuilder.build();
    }

    reasonForRemainingAbsentDuringMenstruation(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when
            .valueInEncounter("Does she remain absent during menstruation?")
            .containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    otherReasonPleaseSpecify(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when
            .valueInEncounter("Reason for remaining absent during menstruation")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    howManyDaysDoesSheTakeOffDuringMenstruation(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when
            .valueInEncounter("Does she remain absent during menstruation?")
            .containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    isThereAnyOtherConditionYouWantToMentionAboutHimHer(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build();
    }

    otherConditionsPleaseSpecify(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when
            .valueInEncounter("Is there any other condition you want to mention about him/her?")
            .containsAnswerConceptName("Other");

        return statusBuilder.build();
    }

    sicknessInLast3Months(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.QUARTERLY).build();
    }

    otherSicknessPleaseSpecify(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.QUARTERLY);
        statusBuilder.show().when
            .valueInEncounter("Sickness in last 3 months")
            .containsAnswerConceptName("Other");

        return statusBuilder.build();
    }

    hospitalizedInLast3Months(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.QUARTERLY).build();
    }

    doYouHaveAnyAddiction(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.QUARTERLY).build();
    }

    areYourFriendsAddicted(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.QUARTERLY).build();
    }

    sexuallyActive(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build();
    }

    unprotectedSex(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Sexually active").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    partners(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Sexually active").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    burningMicturition(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build();
    }

    ulcerOverGenitalia(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build();
    }

    yellowishDischargeFromVaginaPenis(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build();
    }

    doYouHaveVehicle2Wheeler(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build();
    }

    doYouDriveVehicle2Wheeler(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build();
    }

    doYouHaveLicenceForTheVehicle(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Drives 2 wheeler").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    doYouWearHelmetWhileDriving(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Drives 2 wheeler").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    haveYouSufferedFromRoadTrafficAccidentInLast6Months(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build();
    }

    howTheAccidentHasHappened(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Road accident in past 6 months").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    _getStatusBuilder(programEncounter, formElement, encounterTypeNames) {
        return new EncounterTypeFilter({
            programEncounter: programEncounter,
            formElement: formElement,
        }, encounterTypeNames);
    }
}