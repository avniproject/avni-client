import BirthFormHandler from "./formFilters/BirthFormHandler";
import ChildPNCFormHandler from "./formFilters/ChildPNCFormHandler";
import {FormElementsStatusHelper, complicationsBuilder as ComplicationsBuilder} from "rules-config/rules";
import _ from "lodash";
import {immediateReferralAdvice, referralAdvice} from "./referral";
import generateHighRiskConditionAdvice from "./highRisk";
import {getDecisions as anthropometricDecisions} from "./anthropometricDecision"


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