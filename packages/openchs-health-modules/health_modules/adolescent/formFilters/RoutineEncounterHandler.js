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
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().whenItem(this._isFirstAnnualVisit(programEncounter)).equals(false);
        return statusBuilder.build();
    }


    nameOfSchool(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when.addressType.equals("Boarding School")
            .or.when.addressType.equals("Village")
            .and.when.latestValueInEntireEnrolment("School going").containsAnswerConceptName("Yes")
            .or.whenItem(this._isFirstAnnualVisit(programEncounter)).equals(true);
        return statusBuilder.build();
    }

    inWhichStandardHeSheIsStudying(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when.latestValueInEntireEnrolment("School going").containsAnswerConceptName("Yes")
            .and.when.encounterMonth.equals(6)
            .or.when.latestValueInPreviousEncounters("Standard").is.notDefined;
        return statusBuilder.build();
    }

    parents(programEncounter, formElement) {
        return this._hasBeenComingToSchool(programEncounter, formElement, this.visits.ANNUAL)
            .or(this._registeredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    fathersOccupation(programEncounter, formElement) {
        return this._fatherIsAlive(programEncounter, formElement, this.visits.ANNUAL);
    }

    fathersAddiction(programEncounter, formElement) {
        return this._fatherIsAlive(programEncounter, formElement, this.visits.ANNUAL);
    }

    mothersOccupation(programEncounter, formElement) {
        return this._motherIsAlive(programEncounter, formElement, this.visits.ANNUAL);
    }

    mothersAddiction(programEncounter, formElement) {
        return this._motherIsAlive(programEncounter, formElement, this.visits.ANNUAL);
    }

    stayingWithWhom(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);

        //TODO Discuss with Vinay and fix this
        // statusBuilder.skipAnswers("Parents").when
        //     .valueInEncounter("Parents' life status").containsAnswerConceptName("Both Expired");

        return statusBuilder.build()
            .and(this._hasBeenComingToSchool(programEncounter, formElement, this.visits.ANNUAL)
                .or(this._registeredAtVillage(programEncounter, formElement, this.visits.ANNUAL)));
    }

    numberOfFamilyMembers(programEncounter, formElement) {
        return this._hasBeenComingToSchool(programEncounter, formElement, this.visits.ANNUAL)
            .or(this._registeredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    numberOfBrothers(programEncounter, formElement) {
        return this._hasBeenComingToSchool(programEncounter, formElement, this.visits.ANNUAL)
            .or(this._registeredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    numberOfSisters(programEncounter, formElement) {
        return this._hasBeenComingToSchool(programEncounter, formElement, this.visits.ANNUAL)
            .or(this._registeredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    chronicSicknessInFamily(programEncounter, formElement) {
        return this._hasBeenComingToSchool(programEncounter, formElement, this.visits.ANNUAL)
            .or(this._registeredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    height(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.HALF_YEARLY));
    }

    weight(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.HALF_YEARLY));
    }

    bmi(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, false)
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    hemoglobinTestDone(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    hemoglobinTest(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when.valueInEncounter("Hemoglobin Test Done").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    sicklingTestDone(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    sicklingTestResult(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when.valueInEncounter("Sickling Test Done").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    ironTablets(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.MONTHLY));
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
        statusBuilder.show().when.encounterMonth.equals(9).or.equals(3);
        return statusBuilder.build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.MONTHLY));
    }

    isThereAnyPhysicalDefect(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isThereASwellingAtLowerBack(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isThereCleftLipCleftPalate(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isThereLargeGapBetweenToeAndFinger(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isHerNailsTonguePale(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isSheHeSeverelyMalnourished(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, false)
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isThereAnyProblemInLegBone(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isThereASwellingOverThroat(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    doesSheHaveDifficultyInBreathingWhilePlaying(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    areThereDentalCarries(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isThereAWhitePatchInHerEyes(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    doesSheHaveImpairedVision(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isTherePusComingFromEar(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    doesSheHaveImpairedHearing(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    doesSheHaveSkinProblems(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    hasSheEverSufferedFromConvulsions(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isThereAnyNeurologicalMotorDefect(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isHerBehaviorDifferentFromOthers(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isSheSlowerThanOthersInLearningAndUnderstandingNewThings(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    isThereAnyDevelopmentalDelayOrDisabilitySeen(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    menstruationStarted(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.MONTHLY);
        statusBuilder.show().when.female.and.latestValueInPreviousEncounters("Menstruation started").not.containsAnswerConceptName("Yes");

        return statusBuilder.build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
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
            "Abnormal Vaginal Discharge", "Heavy Bleeding", "Irregular Menses");

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
        return this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.ANNUAL));
    }

    otherConditionsPleaseSpecify(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.ANNUAL);
        statusBuilder.show().when
            .valueInEncounter("Is there any other condition you want to mention about him/her?")
            .containsAnswerConceptName("Other");

        return statusBuilder.build();
    }

    sicknessInLast3Months(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.QUARTERLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.QUARTERLY));
    }

    otherSicknessPleaseSpecify(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.QUARTERLY);
        statusBuilder.show().when
            .valueInEncounter("Sickness in last 3 months")
            .containsAnswerConceptName("Other");

        return statusBuilder.build();
    }

    hospitalizedInLast3Months(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.QUARTERLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.QUARTERLY));
    }

    doYouHaveAnyAddiction(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.QUARTERLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.QUARTERLY));
    }

    areYourFriendsAddicted(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.QUARTERLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.QUARTERLY));
    }

    sexuallyActive(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.HALF_YEARLY));
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
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.HALF_YEARLY));
    }

    ulcerOverGenitalia(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.HALF_YEARLY));
    }

    yellowishDischargeFromVaginaPenis(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.HALF_YEARLY));
    }

    doYouHaveVehicle2Wheeler(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.HALF_YEARLY));
    }

    doYouDriveVehicle2Wheeler(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.HALF_YEARLY));
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
        return this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, this.visits.HALF_YEARLY));
    }

    howTheAccidentHasHappened(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, this.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Road accident in past 6 months").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    counsellingForSevereAnemiaDone(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForSevereAnemiaCounselling(programEncounter));
    }

    _fatherIsAlive(programEncounter, formElement, encounterTypes) {
        return this._parentStatusContains(["Both Alive", "Only Father Alive", "Separated"], programEncounter, formElement, encounterTypes);
    }

    _motherIsAlive(programEnrolment, formElement, encounterTypes) {
        return this._parentStatusContains(["Both Alive", "Only Mother Alive", "Separated"], programEnrolment, formElement, encounterTypes);
    }

    _parentStatusContains(statuses, programEncounter, formElement, encounterTypes) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, encounterTypes);
        statusBuilder.show().when.valueInEncounter("Parents' life status").containsAnyAnswerConceptName(...statuses);

        return statusBuilder.build();
    }


    _applicableForSevereAnemiaCounselling(programEncounter) {
        let previousEncounterWithSevereAnemiaVulnerability = programEncounter.programEnrolment
            .findLatestPreviousEncounterWithValueForConcept(programEncounter, "Reason for School Dropout Vulnerability", "Severe Anemia");
        if (_.isEmpty(previousEncounterWithSevereAnemiaVulnerability)) return false;
        let previousEncounterWithCounsellingDone = programEncounter.programEnrolment
            .findLatestPreviousEncounterWithValueForConcept(programEncounter, "Counselling for Severe Anemia Done", "Yes");
        return (_.isEmpty(previousEncounterWithCounsellingDone) || previousEncounterWithSevereAnemiaVulnerability.encounterDateTime
            > previousEncounterWithCounsellingDone.encounterDateTime);
    }

    _schoolAttendanceStatus(programEncounter, formElement, requiredAnswer, encounterTypes) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, encounterTypes);
        if (this._isFirstAnnualVisit(programEncounter)) {
            statusBuilder.show().when.valueInEnrolment("School going").containsAnswerConceptName(requiredAnswer);
        } else {
            statusBuilder.show().when.valueInEncounter("School going").containsAnswerConceptName(requiredAnswer);
        }
        return statusBuilder.build();
    }

    _isDroppedOut(programEnrolment, formElement, encounterTypes) {
        return this._schoolAttendanceStatus(programEnrolment, formElement, "Dropped Out", encounterTypes);
    }

    _hasBeenComingToSchool(programEncounter, formElement, encounterTypes) {
        return this._schoolAttendanceStatus(programEncounter, formElement, "Yes", encounterTypes);
    }

    _registeredAt(programEncounter, formElement, placeOfRegistration, encounterTypes) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, encounterTypes);
        statusBuilder.show().when.addressType.equals(placeOfRegistration);
        return statusBuilder.build();
    }

    _registeredAtSchoolOrBoarding(programEncounter, formElement, encounterTypes) {
        return this._registeredAt(programEncounter, formElement, "School", encounterTypes)
            .or(this._registeredAt(programEncounter, formElement, "Boarding", encounterTypes));
    }

    _registeredAtVillageOrBoarding(programEncounter, formElement, encounterTypes) {
        return this._registeredAt(programEncounter, formElement, "Village", encounterTypes)
            .or(this._registeredAt(programEncounter, formElement, "Boarding", encounterTypes));
    }

    _registeredAtVillage(programEncounter, formElement, encounterTypes) {
        return this._registeredAt(programEncounter, formElement, "Village", encounterTypes);
    }

    _notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, encounterTypes) {
        return this._registeredAtVillage(programEncounter, formElement, encounterTypes)
            .or(this._hasBeenComingToSchool(programEncounter, formElement, encounterTypes));
    }

    _villageRegistrationAndDroppedOut(programEncounter, formElement, encounterTypes) {
        return this._registeredAtVillage(programEncounter, formElement, encounterTypes)
            .and(this._isDroppedOut(programEncounter, formElement, encounterTypes));
    }

    _schoolRegistrationAndDroppedOut(programEncounter, formElement, encounterTypes) {
        return this._registeredAtSchoolOrBoarding(programEncounter, formElement, encounterTypes)
            .and(this._isDroppedOut(programEncounter, formElement, encounterTypes));
    }

    _isFirstAnnualVisit(programEncounter) {
        const firstAnnualEncounter = programEncounter.programEnrolment.encounters
            .find((encounter) => encounter.encounterType.name === "Annual Visit");
        return _.isEmpty(firstAnnualEncounter) ||
            firstAnnualEncounter.uuid === programEncounter.uuid
    }


    _getStatusBuilder(programEncounter, formElement, encounterTypeNames) {
        return new EncounterTypeFilter({
            programEncounter: programEncounter,
            formElement: formElement,
        }, encounterTypeNames);
    }
}