import BirthFormHandler from "./formFilters/BirthFormHandler";
import ChildPNCFormHandler from "./formFilters/ChildPNCFormHandler";
import ChildAnthropometryFormHandler from "./formFilters/ChildAnthropometryFormHandler";
import {FormElementsStatusHelper, complicationsBuilder as ComplicationsBuilder, RuleFactory} from "rules-config/rules";
import _ from "lodash";
import {immediateReferralAdvice, referralAdvice} from "./referral";
import generateHighRiskConditionAdvice from "./highRisk";
import {getDecisions as anthropometricDecisions} from "./anthropometricDecision"
import {FormElementStatusBuilder} from "rules-config";

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
            encounterDecisions: programEncounter.encounterType.name !== 'Birth' ?
                                    decisions.concat(anthropometricDecisions(programEncounter).encounterDecisions)
                                    : decisions
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
    ['Child PNC', new ChildPNCFormHandler()],
    ['Anthropometry Assessment',new ChildAnthropometryFormHandler()]
]);

export function getFormElementsStatuses(programEncounter, formElementGroup, today) {
    let handler = encounterTypeHandlerMap.get(programEncounter.encounterType.name);
    return FormElementsStatusHelper.getFormElementsStatuses(handler, programEncounter, formElementGroup, today);
}

