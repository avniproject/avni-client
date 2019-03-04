import {FormElementStatus, FormElementStatusBuilder, RuleCondition} from "rules-config/rules";
import _ from "lodash";
import EncounterTypeFilter from "./EncounterTypeFilter";
import C from '../../common';
import moment from "moment";

export default class RoutineEncounterHandler {
    static get visits() {
        return {
            MONTHLY: ["Annual Visit", "Half-Yearly Visit", "Quarterly Visit", "Monthly Visit"],
            MONTHLY_OR_MIDLINE: ["Annual Visit", "Half-Yearly Visit", "Quarterly Visit", "Monthly Visit", "Midline Visit"],
            QUARTERLY: ["Annual Visit", "Half-Yearly Visit", "Quarterly Visit"],
            QUARTERLY_OR_MIDLINE: ["Annual Visit", "Half-Yearly Visit", "Quarterly Visit", "Midline Visit"],
            HALF_YEARLY: ["Annual Visit", "Half-Yearly Visit"],
            HALF_YEARLY_OR_MIDLINE: ["Annual Visit", "Half-Yearly Visit", "Midline Visit"],
            ANNUAL: ["Annual Visit"],
            ANNUAL_OR_MIDLINE: ["Annual Visit", "Midline Visit"],
        };
    }

    schoolGoing(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().whenItem(this._isFirstAnnualVisit(programEncounter)).equals(false);
        return statusBuilder.build();
    }


    nameOfSchool(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL);
        statusBuilder.show()
            .when.addressType.equals("Village")
            .and.when.latestValueInEntireEnrolment("School going").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    inWhichStandardHeSheIsStudying(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when.latestValueInEntireEnrolment("School going").containsAnswerConceptName("Yes")
            .and.when.encounterMonth.equals(7)
            .or.when.latestValueInPreviousEncounters("Standard").is.notDefined;
        return statusBuilder.build();
    }

    rollNumber(programEncounter, formElement) {
        return this.inWhichStandardHeSheIsStudying(programEncounter, formElement)
            .and(this._registeredAtSchoolOrBoarding(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE));
    }

    parents(programEncounter, formElement) {
        return this._hasBeenComingToSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL)
            .or(this._registeredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement,
                RoutineEncounterHandler.visits.ANNUAL));
    }

    fathersOccupation(programEncounter, formElement) {
        return this._fatherIsAlive(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL);
    }

    fathersAddiction(programEncounter, formElement) {
        return this._fatherIsAlive(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE);
    }

    mothersOccupation(programEncounter, formElement) {
        return this._motherIsAlive(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL);
    }

    mothersAddiction(programEncounter, formElement) {
        return this._motherIsAlive(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE);
    }

    stayingWithWhom(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL);
        const showQuestion = statusBuilder.show();

        showQuestion
            .whenItem(this._isAdolescentEleventhTwelfthStandardAndRegisteredAtSchoolOrBoarding(programEncounter))
            .equals(false);

        if (this._isFirstAnnualVisit(programEncounter)) {
            showQuestion.and.when.valueInEnrolment("School going").containsAnswerConceptName("Yes");
        } else {
            showQuestion.and.when.valueInEncounter("School going").containsAnswerConceptName("Yes");
        }

        showQuestion.or.when.addressType.equals("Village");

        statusBuilder.skipAnswers("Parents").when
            .valueInEncounter("Parents' life status").containsAnswerConceptName("Both Expired");

        return statusBuilder.build();
    }

    numberOfBrothers(programEncounter, formElement) {
        return this._hasBeenComingToSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL)
            .or(this._registeredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    numberOfSisters(programEncounter, formElement) {
        return this._hasBeenComingToSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL)
            .or(this._registeredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    chronicSicknessInFamily(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, false);
    }

    height(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY_OR_MIDLINE).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY_OR_MIDLINE))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY_OR_MIDLINE));
    }

    weight(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY_OR_MIDLINE).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY_OR_MIDLINE))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY_OR_MIDLINE));
    }

    bmi(programEncounter, formElement) {

        let weight = programEncounter.getObservationValue('Weight');
        let height = programEncounter.getObservationValue('Height');

        let bmi = '';
        if (_.isNumber(height) && _.isNumber(weight)) {
            bmi = C.calculateBMI(weight, height);
        }

        let formElmentStatus = this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY_OR_MIDLINE)
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY_OR_MIDLINE));
        formElmentStatus.value = bmi;
        return formElmentStatus;
    }

    hemoglobinTestDone(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL_OR_MIDLINE).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL_OR_MIDLINE))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL_OR_MIDLINE));
    }

    hemoglobinTest(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL_OR_MIDLINE);
        statusBuilder.show().when.valueInEncounter("Hemoglobin Test Done").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    sicklingTestDone(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    sicklingTestResult(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL);
        statusBuilder.show().when.valueInEncounter("Sickling Test Done").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    areYouTakingRegularTreatmentForSickleCellDisease(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL);
        statusBuilder.show().when.latestValueInEntireEnrolment("Are you taking regular treatment for Sickle cell disease?")
            .and.whenItem(this._isAdolescentEleventhTwelfthStandardAndRegisteredAtSchoolOrBoarding(programEncounter))
            .equals(true);
        return statusBuilder.build();
    }

    ironTablets(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE));
    }

    fromWhere(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when.valueInEncounter("Iron tablets received").containsAnswerConceptName("Yes")
            .and.whenItem(this._isAdolescentEleventhTwelfthStandardAndRegisteredAtSchoolOrBoarding(programEncounter))
            .equals(false);

        return statusBuilder.build();
    }

    ironTabletsConsumedInLastMonth(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when.valueInEncounter("Iron tablets received").containsAnswerConceptName("Yes")
            .and.whenItem(this._isAdolescentEleventhTwelfthStandardAndRegisteredAtSchoolOrBoarding(programEncounter))
            .equals(false);

        return statusBuilder.build();
    }

    albendazoleTabletsReceived(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show()
            .whenItem(new RuleCondition({programEncounter: programEncounter}).when.encounterMonth.equals(9).or.equals(3).matches()).is.truthy
            .and.whenItem(new RuleCondition({programEncounter: programEncounter}).when.latestValueInAllEncounters("Standard").not.containsAnyAnswerConceptName("11", "12").matches()).is.truthy;
        return statusBuilder.build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE));
    }

    isThereAnyPhysicalDefect(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isThereASwellingAtLowerBack(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isThereCleftLipCleftPalate(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isThereLargeGapBetweenToeAndFinger(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isHerNailsTonguePale(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isSheHeSeverelyMalnourished(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, false);
    }

    isThereAnyProblemInLegBone(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isThereASwellingOverThroat(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    doesSheHaveDifficultyInBreathingWhilePlaying(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    areThereDentalCarries(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isThereAWhitePatchInHerEyes(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    doesSheHaveImpairedVision(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isTherePusComingFromEar(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    doesSheHaveImpairedHearing(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    doesSheHaveSkinProblems(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    hasSheEverSufferedFromConvulsions(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isThereAnyNeurologicalMotorDefect(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isHerBehaviorDifferentFromOthers(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isSheSlowerThanOthersInLearningAndUnderstandingNewThings(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    isThereAnyDevelopmentalDelayOrDisabilitySeen(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    menstruationStarted(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when.female.and.latestValueInPreviousEncounters("Menstruation started").not.containsAnswerConceptName("Yes");

        return statusBuilder.build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE));
    }

    ifMenstruationStartedThenAtWhatAge(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when.valueInEncounter("Menstruation started").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    absorbentMaterialUsed(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when.latestValueInAllEncounters("Menstruation started").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    menstrualDisorders(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when.female.and.latestValueInAllEncounters("Menstruation started").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    anyTreatmentTaken(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when.valueInEncounter("Menstrual disorders").containsAnyAnswerConceptName(
            "Lower abdominal pain", "Backache", "Leg pain", "Nausea and vomiting", "Headache",
            "Abnormal vaginal discharge", "Heavy bleeding", "Irregular menses");

        return statusBuilder.build();
    }

    doesSheRemainAbsentDuringMenstruation(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when
            .latestValueInAllEncounters("Menstruation started").containsAnswerConceptName("Yes")
            .and.when.valueInEncounter("Menstrual disorders").containsAnyAnswerConceptName(
            "Lower abdominal pain", "Backache", "Leg pain", "Nausea and vomiting", "Headache",
            "Abnormal vaginal discharge", "Heavy bleeding", "Irregular menses")
            .and.whenItem(programEncounter.programEnrolment.individual.lowestAddressLevel.type).not.equals("Village");

        return statusBuilder.build();
    }

    reasonForRemainingAbsentDuringMenstruation(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when
            .valueInEncounter("Does she remain absent during menstruation?")
            .containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    otherReasonPleaseSpecify(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when
            .valueInEncounter("Reason for remaining absent during menstruation")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    howManyDaysDoesSheTakeOffDuringMenstruation(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when
            .valueInEncounter("Does she remain absent during menstruation?")
            .containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    mhmKitReceived(programEncounter, formElement) {
        let statusBuilder = new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
        let afterDate = moment(programEncounter.encounterDateTime).subtract(6, "months").toDate();
        let mhmKitReceivedStatus = programEncounter.programEnrolment.hasEncounterWithObservationValueAfterDate("Monthly Visit", afterDate, "MHM Kit received", "Yes");

        statusBuilder.show()
            .latestValueInAllEncounters("Menstruation started").containsAnswerConceptName("Yes")
            .and.whenItem(mhmKitReceivedStatus).is.not.truthy;
        return statusBuilder.build();
    }

    mhmKitUsed(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when.latestValueInAllEncounters("MHM Kit received").containsAnswerConceptName("Yes");
        return statusBuilder.build();
    }

    isThereAnyOtherConditionYouWantToMentionAboutHimHer(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL));
    }

    otherConditionsPleaseSpecify(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.ANNUAL);
        statusBuilder.show().when
            .valueInEncounter("Is there any other condition you want to mention about him/her?")
            .containsAnswerConceptName("Other");

        return statusBuilder.build();
    }

    sicknessInLast3Months(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE));
    }

    otherSicknessPleaseSpecify(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE);
        statusBuilder.show().when
            .valueInEncounter("Sickness in last 3 months")
            .containsAnswerConceptName("Other");

        return statusBuilder.build();
    }

    hospitalizedInLast3Months(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE));
    }

    doYouHaveAnyAddiction(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE));
    }

    areYourFriendsAddicted(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE));
    }

    areYouSexuallyActive(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY));
    }

    doYouPerformUnprotectedSexualIntercourse(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Sexually active").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    doYouHaveMultipleSexualPartners(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Sexually active").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    doYouSufferFromBurningMicturition(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY));
    }

    doYouSufferFromUlcerOverGenitalia(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY));
    }

    doYouSufferFromYellowishDischargeFromVaginaPenis(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY));
    }

    doYouHaveVehicle2Wheeler(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY))
            .and(this._notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY));
    }

    doYouDriveVehicle2Wheeler(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY));
    }

    doYouHaveLicenceForTheVehicle(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Drives 2 wheeler").containsAnswerConceptName("Yes")
            .and.whenItem(this._isAdolescentEleventhTwelfthStandardAndRegisteredAtSchoolOrBoarding(programEncounter))
            .equals(false);


        return statusBuilder.build();
    }

    doYouWearHelmetWhileDriving(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Drives 2 wheeler").containsAnswerConceptName("Yes")
            .and.whenItem(this._isAdolescentEleventhTwelfthStandardAndRegisteredAtSchoolOrBoarding(programEncounter))
            .equals(false);

        return statusBuilder.build();
    }

    haveYouSufferedFromRoadTrafficAccidentInLast6Months(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY).build()
            .and(this._notDroppedOutOrRegisteredAtVillage(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY));
    }

    howTheAccidentHasHappened(programEncounter, formElement) {
        const statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.HALF_YEARLY);
        statusBuilder.show().when.valueInEncounter("Road accident in past 6 months").containsAnswerConceptName("Yes");

        return statusBuilder.build();
    }

    counsellingChecklistForSevereAnemia(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForSevereAnemiaCounselling(programEncounter));
    }

    counsellingForSevereAnemiaDone(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForSevereAnemiaCounselling(programEncounter));
    }

    counsellingChecklistForNoParentsSingleParent(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForDeceasedParentCounselling(programEncounter));
    }

    counsellingForNoParentsSingleParentDone(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForDeceasedParentCounselling(programEncounter));
    }

    counsellingChecklistForMenstrualDisorder(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForMenstrualDisorderCounselling(programEncounter));
    }

    counsellingForMenstrualDisorderDone(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForMenstrualDisorderCounselling(programEncounter));
    }

    counsellingChecklistForMalnutrition(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForMalnutritionCounselling(programEncounter));
    }


    counsellingForMalnutritionDone(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForMalnutritionCounselling(programEncounter));
    }

    counsellingChecklistForSickleCellAnemiaTrait(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForSickleCellAnemiaCounselling(programEncounter));
    }

    counsellingChecklistForSickleCellAnemiaDisease(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForSickleCellAnemiaCounselling(programEncounter));
    }


    counsellingForSickleCellAnemiaDone(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForSickleCellAnemiaCounselling(programEncounter));
    }

    counsellingChecklistForAddiction(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForAddictionCounselling(programEncounter));
    }

    counsellingForAddictionDone(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForAddictionCounselling(programEncounter));
    }

    counsellingChecklistForRti(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForRTICounselling(programEncounter));
    }

    counsellingForEarlyPregnancyRtiDone(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForRTICounselling(programEncounter));
    }

    counsellingChecklistForRoadTrafficAccident(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForRTACounselling(programEncounter));
    }

    counsellingForRoadTrafficAccidentDone(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForRTACounselling(programEncounter));
    }

    haveYouStoppedAddiction(programEncounter, formElement) {
        return new FormElementStatus(formElement.uuid, this._applicableForAddictionFollowup(programEncounter));
    }

    whichOfTheFollowingAilmentsDidYouVisitTheHospitalFor(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        const allAnswerConcepts = formElement.concept.answers.map((answer) => Object.assign({
            name: answer.concept.name,
            uuid: answer.concept.uuid
        }));

        allAnswerConcepts.map((answer) => {
            statusBuilder.skipAnswers(answer.name)
                .when.valueInLastEncounter("Refer to hospital for", RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE)
                .not.containsAnswerConceptName(answer.name)
        });

        let builtStatus = statusBuilder.build();
        const answersToSkip = builtStatus.answersToSkip.filter((answer) => answer.name !== "None");
        return new FormElementStatus(builtStatus.uuid, builtStatus.answersToSkip.length < allAnswerConcepts.length,
            undefined, answersToSkip);
    }

    ailmentsCuredPostTreatment(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        const allAnswerConcepts = formElement.concept.answers.map((answer) => Object.assign({
            name: answer.concept.name,
            uuid: answer.concept.uuid
        }));

        allAnswerConcepts.map((answer) => {
            statusBuilder.skipAnswers(answer.name)
                .when.valueInLastEncounter("Refer to hospital for", RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE)
                .not.containsAnswerConceptName(answer.name)
        });

        let builtStatus = statusBuilder.build();
        const answersToSkip = builtStatus.answersToSkip.filter((answer) => answer.name !== "None");
        return new FormElementStatus(builtStatus.uuid, builtStatus.answersToSkip.length < allAnswerConcepts.length,
            undefined, answersToSkip);
    }

    haveYouUsedMitraHelplineInLast3Months(programEncounter, formElement) {
        return this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.QUARTERLY_OR_MIDLINE).build();
    }

    areYouSatisfiedWithTheCounselingServiceProvidedThroughHelpline(programEncounter, formElement) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE);
        statusBuilder.show().when.valueInEncounter("Used Mitra Helpline").containsAnswerConceptName('Yes');
        return statusBuilder.build();
    }

    _fatherIsAlive(programEncounter, formElement, encounterTypes) {
        return this._parentStatusContains(["Both Alive", "Only Father Alive", "Separated"], programEncounter, formElement, encounterTypes);
    }

    _motherIsAlive(programEnrolment, formElement, encounterTypes) {
        return this._parentStatusContains(["Both Alive", "Only Mother Alive", "Separated"], programEnrolment, formElement, encounterTypes);
    }

    _parentStatusContains(statuses, programEncounter, formElement, encounterTypes) {
        let statusBuilder = this._getStatusBuilder(programEncounter, formElement, encounterTypes);
        statusBuilder.show().when.latestValueInAllEncounters("Parents' life status").containsAnyAnswerConceptName(...statuses);

        return statusBuilder.build();
    }


    _applicableForSevereAnemiaCounselling(programEncounter) {
        return new RuleCondition({programEncounter: programEncounter})
            .when.valueInEncounter("Hb").lessThanOrEqualTo(10)
            .or.when.valueInLastEncounter("Counselling for Severe Anemia Done", RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE)
            .containsAnswerConceptName("No")
            .matches();
    }

    _applicableForMalnutritionCounselling(programEncounter) {
        let bmi = C.calculateBMI(programEncounter.getObservationValue("Weight"), programEncounter.getObservationValue("Height"));
        return new RuleCondition({programEncounter: programEncounter})
            .whenItem(bmi).lessThan(18.5)
            .or.when.valueInLastEncounter("Counselling for Malnutrition Done", RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE)
            .containsAnswerConceptName("No")
            .matches();
    }

    _applicableForMenstrualDisorderCounselling(programEncounter) {
        return new RuleCondition({programEncounter: programEncounter})
            .when.valueInEncounter("Menstrual disorders").containsAnyAnswerConceptName("Lower abdominal pain", "Backache",
                "Leg pain", "Nausea and vomiting", "Headache", "Abnormal vaginal discharge", "Heavy bleeding", "Irregular menses")
            .matches();
    }

    _applicableForAddictionCounselling(programEncounter) {
        let eitherParentAddicted = new RuleCondition({programEncounter: programEncounter})
            .when.valueInEncounter("Father's Addiction").containsAnyAnswerConceptName("Alcohol", "Tobacco", "Both")
            .or.valueInEncounter("Mother's Addiction").containsAnyAnswerConceptName("Alcohol", "Tobacco", "Both")
            .matches();

        return new RuleCondition({programEncounter: programEncounter})
            .whenItem(eitherParentAddicted).is.truthy
            .or.when.valueInEncounter("Are friends addicted?").containsAnyAnswerConceptName("Yes")
            .or.when.valueInEncounter("Addiction Details").containsAnyAnswerConceptName("Alcohol", "Tobacco", "Both")
            .or.when.valueInLastEncounter("Counselling for Addiction Done", RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE)
            .containsAnswerConceptName("No")
            .matches();
    }

    _applicableForRTICounselling(programEncounter) {
        return new RuleCondition({programEncounter: programEncounter})
            .when.valueInEncounter("Sexually active").containsAnyAnswerConceptName("Yes")
            .or.when.valueInLastEncounter("Counselling for Early Pregnancy & RTI Done", RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE)
            .containsAnswerConceptName("No")
            .matches();
    }

    _applicableForRTACounselling(programEncounter) {
        return new RuleCondition({programEncounter: programEncounter})
            .when.valueInEncounter("Drives 2 wheeler").containsAnyAnswerConceptName("Yes")
            .or.when.valueInLastEncounter("Counselling for Road Traffic Accident Done", RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE)
            .containsAnswerConceptName("No")
            .matches();
    }

    _applicableForSickleCellAnemiaCounselling(programEncounter) {
        return new RuleCondition({programEncounter: programEncounter})
            .when.valueInLastEncounter("Sickling Test Result", RoutineEncounterHandler.visits.ANNUAL).containsAnyAnswerConceptName("Trait", "Disease")
            .or.when.valueInLastEncounter("Counselling for Sickle Cell Anemia Done", RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE)
            .containsAnswerConceptName("No")
            .matches();
    }

    _applicableForDeceasedParentCounselling(programEncounter) {
        return new RuleCondition({programEncounter: programEncounter})
            .when.valueInLastEncounter("Parents' life status", RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE)
            .containsAnyAnswerConceptName("Only Father Alive", "Only Mother Alive", "Both Expired", "Separated")
            .or.when.valueInLastEncounter("Counselling for No Parents / Single Parent Done", RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE)
            .containsAnswerConceptName("No")
            .matches();
    }


    _applicableForAddictionFollowup(programEncounter) {
        return this._counsellingForSelfAddictionDoneInPastNVisit(2, programEncounter)
            || this._counsellingForSelfAddictionDoneInPastNVisit(3, programEncounter)
            || this._counsellingForSelfAddictionDoneInPastNVisit(4, programEncounter);

    }

    _counsellingForSelfAddictionDoneInPastNVisit(n, programEncounter) {
        let lastNthEncounter = programEncounter.programEnrolment.findNthLastEncounterOfType(programEncounter, RoutineEncounterHandler.visits.MONTHLY_OR_MIDLINE, n - 1);
        if (_.isEmpty(lastNthEncounter)) return false;
        return new RuleCondition({programEncounter: lastNthEncounter})
                .when.valueInEncounter("Counselling for Addiction Done").containsAnswerConceptName("Yes").matches()
            && new RuleCondition({programEncounter: programEncounter})
                .when.latestValueInPreviousEncounters("Addiction Details").containsAnyAnswerConceptName("Alcohol", "Tobacco", "Both").matches();
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

    _notEleventhTwelfthAdolescentRegisteredAtSchoolOrBoardingSchool(programEncounter, formElement, encounterTypes) {
        return new FormElementStatus(formElement.uuid, !this._isAdolescentEleventhTwelfthStandardAndRegisteredAtSchoolOrBoarding(programEncounter));
    }

    _isAdolescentEleventhTwelfthStandardAndRegisteredAtSchoolOrBoarding(programEncounter) {
        let isAdolescentEleventhTwelfthStandardAndRegisteredAtSchoolOrBoarding = new RuleCondition({programEncounter: programEncounter})
            .when.latestValueInAllEncounters("Standard").containsAnyAnswerConceptName("11", "12")
            .and.addressType.equalsOneOf("School", "Boarding").matches();
        return isAdolescentEleventhTwelfthStandardAndRegisteredAtSchoolOrBoarding;
    }

    _isFirstAnnualVisit(programEncounter) {
        if (programEncounter.encounterType.name !== "Annual Visit") {
            return false;
        }
        const firstAnnualEncounter = programEncounter.programEnrolment.getEncounters(true)
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
