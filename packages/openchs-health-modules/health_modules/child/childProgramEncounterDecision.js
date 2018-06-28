import BirthFormHandler from "./formFilters/BirthFormHandler";
import ChildPNCFormHandler from "./formFilters/ChildPNCFormHandler";
import {FormElementsStatusHelper, complicationsBuilder as ComplicationsBuilder, RuleFactory} from "rules-config/rules";
import _ from "lodash";
import {immediateReferralAdvice, referralAdvice} from "./referral";
import generateHighRiskConditionAdvice from "./highRisk";
import {getDecisions as anthropometricDecisions} from "./anthropometricDecision"
import {FormElementStatusBuilder} from "rules-config";
import FormElementStatus from "../../../openchs-models/src/application/FormElementStatus";

const ChildPNC = RuleFactory("e09dddeb-ed72-40c4-ae8d-112d8893f18b", "Decision");
const Birth = RuleFactory("901e2f48-2fb8-402b-9073-ee2fac33fce4", "Decision");
const Anthro = RuleFactory("d062907a-690c-44ca-b699-f8b2f688b075", "Decision");

const ChildPNCFilter = RuleFactory("e09dddeb-ed72-40c4-ae8d-112d8893f18b", "ViewFilter");
const BirthFilter = RuleFactory("901e2f48-2fb8-402b-9073-ee2fac33fce4", "ViewFilter");
const AnthroFilter = RuleFactory("d062907a-690c-44ca-b699-f8b2f688b075", "ViewFilter");

@ChildPNCFilter("c3e255cc-a531-4a71-a75b-d309bfb49411", "Child PNC Form Filter", 1.0, {})
class ChildPNCFormFilter {
    static exec(programEncounter, formElementGroup, today) {
        return getFormElementsStatuses(programEncounter, formElementGroup);
    }
}

@BirthFilter("07e15e19-8492-4768-9254-9c996a003aa0", "Child Birth Form Filter", 1.0, {})
class ChildBirthFormFilter {
    static exec(programEncounter, formElementGroup, today) {
        return getFormElementsStatuses(programEncounter, formElementGroup, today);
    }
}

@AnthroFilter("091b9a99-fb24-4609-8da4-48ca64040605", "Child Antrho Form Filter", 1.0, {})
class ChildAnthroFormFilter {
    static exec(programEncounter, formElementGroup, today) {
        return getFormElementsStatuses(programEncounter, formElementGroup, today);
    }
}

@ChildPNC("b090eb6d-0acb-4089-8ec0-9fbd63117010", "All Child PNC Encounter Decisions", 1.0, {})
class ChildPNCDecisions {
    static exec(programEncounter, decisions, context, today) {
        return getDecisions(programEncounter, today);
    }
}

@Birth("ddcc027e-68d0-473c-ab0e-92d7596d2dc1", "All Birth Encounter Decisions", 1.0, {})
class BirthDecisions {
    static exec(programEncounter, decisions, context, today) {
        return getDecisions(programEncounter, today);
    }
}

@Anthro("151302cb-f040-403a-8b1a-6c56ed7ecf04", "All Anthro Encounter Decisions", 1.0, {})
class AnthroDecisions {
    static exec(programEncounter, decisions, context, today) {
        return getDecisions(programEncounter, today);
    }
}


export function getDecisions(programEncounter, today) {
    if (programEncounter.encounterType.name === 'Birth' || programEncounter.encounterType.name === 'Child PNC') {
        let decisions = [
            recommendations(programEncounter.programEnrolment, programEncounter),
            immediateReferralAdvice(programEncounter.programEnrolment, programEncounter, today),
            referralAdvice(programEncounter.programEnrolment, programEncounter, today)
        ];

        let highRiskConditions = generateHighRiskConditionAdvice(programEncounter.programEnrolment, programEncounter, today);
        if (!_.isEmpty(highRiskConditions.value)) {
            decisions.push(highRiskConditions);
        }

        return {
            enrolmentDecisions: [],
            encounterDecisions: decisions.concat(anthropometricDecisions(programEncounter).encounterDecisions)
        }
    }
    else if (programEncounter.encounterType.name === 'Anthropometry Assessment') {
        return anthropometricDecisions(programEncounter);
    }
    else return {enrolmentDecisions: [], encounterDecisions: []};
}


const recommendations = (enrolment, encounter) => {
    const recommendationBuilder = new ComplicationsBuilder({
        programEnrolment: enrolment,
        programEncounter: encounter,
        complicationsConcept: 'Recommendations'
    });

    recommendationBuilder.addComplication("Keep the baby warm")
        .when.valueInEncounter("Child Pulse").lessThan(60)
        .or.when.valueInEncounter("Child Pulse").greaterThan(100)
        .or.when.valueInEncounter("Child Respiratory Rate").lessThan(30)
        .or.when.valueInEncounter("Child Respiratory Rate").greaterThan(60)
    ;

    recommendationBuilder.addComplication("Keep the baby warm by giving mother's skin to skin contact and covering the baby's head, hands and feet with a cap, gloves and socks resp.")
        .when.valueInEncounter("Child Temperature").lessThan(97.5)
    ;

    recommendationBuilder.addComplication("Give exclusive breast feeding")
        .when.valueInEncounter("Child Temperature").lessThan(97.5);

    recommendationBuilder.addComplication("Give exclusive breast feeding")
        .when.encounterType.equals("Child PNC")
        .and.valueInEncounter("Is baby exclusively breastfeeding").containsAnswerConceptName("No");

    return recommendationBuilder.getComplications();
};


const encounterTypeHandlerMap = new Map([
    ['Birth', new BirthFormHandler()],
    ['Child PNC', new ChildPNCFormHandler()]
]);

export function getFormElementsStatuses(programEncounter, formElementGroup, today) {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormElementsStatusHelper.getFormElementsStatuses(handler, programEncounter, formElementGroup, today);
}

const HomeVisitFilter = RuleFactory("35aa9007-fe7a-4a59-b985-0a1c038df889", "ViewFilter");

@HomeVisitFilter("11a9fd8b-7234-4fc2-a9be-1895c6783778", "Child Home Visit Filter", 100.0, {})
class ChildHomeVisitFilter {
    haveYouFedYourChildAnyOfTheFollowing(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.ageInMonths.lessThan(6);
        return statusBuilder.build();
    }

    whatElseDidFeedYourChild(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Have you fed your child any of the following?")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    frequencyOfWater(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Have you fed your child any of the following?")
            .containsAnswerConceptName("Water");
        return statusBuilder.build();
    }

    frequencyOfCowsMilk(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Have you fed your child any of the following?")
            .containsAnswerConceptName("Cow's milk");
        return statusBuilder.build();
    }

    frequencyOfWaterBasedLiquids(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Have you fed your child any of the following?")
            .containsAnswerConceptName("Water based liquids (sugar water, juice etc)");
        return statusBuilder.build();
    }

    frequencyOfFormula(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Have you fed your child any of the following?")
            .containsAnswerConceptName("Formula");
        return statusBuilder.build();
    }

    otherFrequencyOfCowsMilk(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Frequency of cow's milk")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    otherFrequencyOfWaterBasedLiquids(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Frequency of water-based liquids")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    otherFrequencyOfWater(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Frequency of water")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    otherFrequencyOfFormula(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Frequency of formula")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    frequencyOfOther(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Have you fed your child any of the following?")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    otherFrequencyOfOther(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Frequency of other")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    whyDidYouFeedYourBabySomethingOtherThanBreastMilk(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show()
            .when.ageInMonths.lessThan(6)
            .and.when.valueInEncounter("Have you fed your child any of the following?").not.containsAnswerConceptName("No");

        return statusBuilder.build();
    }

    anyOtherReasonWhyYouFedSomethingOtherThanBreastMilk(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Why did you feed your baby something other than breast milk?")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    areYouStillBreastFeedingYourChild(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.ageInMonths.greaterThanOrEqualTo(6);
        return statusBuilder.build();
    }

    whatWasTheChildsAgeWhenYouStoppedBreastFeeding(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Are you still breast feeding your child?")
            .containsAnswerConceptName("No");
        return statusBuilder.build();
    }

    areYouFeedingYourChildAnyOtherLiquids(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.ageInMonths.greaterThanOrEqualTo(6)
            .and.when.ageInMonths.lessThan(12);
        return statusBuilder.build();
    }

    haveYouFedYourChildAnyOfTheFollowingLiquids(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Are you feeding your child any other liquids?")
            .is.yes;
        return statusBuilder.build();
    }

    whatWasTheChildsAgeWhenYouStartedFeedingTheseLiquids(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Are you feeding your child any other liquids?")
            .is.yes;
        return statusBuilder.build();
    }

    haveYouBeenFeedingSolidsSemiSolidsToTheChild(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.ageInMonths.greaterThanOrEqualTo(6)
            .and.when.ageInMonths.lessThan(12);
        return statusBuilder.build();
    }

    whatWasTheChildsAgeWhenYouStartedFeedingThemSolidsSemiSolids(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Have you been feeding solids/semi-solids to the child?").is.yes;
        return statusBuilder.build();
    }

    howManyTimesADayIsTheChildEatingHomemadeSemiSolidSolidFoods(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Have you been feeding solids/semi-solids to the child?").is.yes;
        return statusBuilder.build();
    }

    whatTypeOfSemiSolidSolidFoodsDoYouFeedYourChild(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Have you been feeding solids/semi-solids to the child?").is.yes;
        return statusBuilder.build();
    }

    howManyTimesADayIsTheChildEatingSnacks(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Have you been feeding solids/semi-solids to the child?").is.yes;
        return statusBuilder.build();
    }

    whatSnacksAreBeingFed(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("How many times a day is the child eating snacks?").is.defined
            .and.when.valueInEncounter("How many times a day is the child eating snacks?").not.containsAnswerConceptName("None");
        return statusBuilder.build();
    }

    whatOtherSnacksAreBeingFed(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("What snacks are being fed?")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }


    howManyTimesIsYourChildFedIn24Hours(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.ageInMonths.lessThan(6);
        return statusBuilder.build();
    }

    howManyTimesHasYourChildUrinatedInTheLast24Hours(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.ageInMonths.lessThan(6);
        return statusBuilder.build();
    }

    isYourBabyHavingAnyOfTheFollowingProblems(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.ageInMonths.lessThan(6);
        return statusBuilder.build();
    }

    hasYourChildBeenSickInTheLast2Weeks(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(true).is.truthy;
        return statusBuilder.build();
    }

    whatIllnessDidTheChildHave(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("Has your child been sick in the last 2 weeks?")
            .is.yes;
        return statusBuilder.build();
    }

    anyOtherIllness(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.valueInEncounter("What illness did the child have?")
            .containsAnswerConceptName("Other");
        return statusBuilder.build();
    }

    isYourChildSickRightNow(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().whenItem(true).is.truthy;
        return statusBuilder.build();
    }

    childPostNatalDiscussionTopicsLbw(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.ageInMonths.is.lessThan(3);
        return statusBuilder.build();
    }

    childPostNatalDiscussionTopics(programEncounter, formElement) {
        const statusBuilder = this._statusBuilder(programEncounter, formElement);
        statusBuilder.show().when.ageInMonths.is.greaterThanOrEqualTo(3);
        return statusBuilder.build();
    }

    _statusBuilder(programEncounter, formElement) {
        return new FormElementStatusBuilder({
            programEncounter: programEncounter,
            formElement: formElement
        });
    }

    static exec(programEncounter, formElementGroup, today) {
        return FormElementsStatusHelper.getFormElementsStatuses(new ChildHomeVisitFilter(), programEncounter, formElementGroup, today)
    }
}