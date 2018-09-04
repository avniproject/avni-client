import _ from 'lodash';
import {complicationsBuilder as ComplicationsBuilder} from "rules-config/rules";
import RoutineEncounterHandler from "./formFilters/RoutineEncounterHandler";


const conceptReferralMap = new Map([
    ["Is there any physical defect?", "Physical defect"],
    ["Is there a swelling at lower back?", "Swelling on lower back"],
    ["Is there Cleft lip/Cleft palate?", "Cleft lip"],
    ["Is there large gap between toe and finger?", "Large gap between toe and finger"],
    ["Is her nails/tongue pale?", "Pale nails/tongue"],
    ["Is she/he severely malnourished?", "Severe malnourishment"],
    ["Is there any problem in leg bone?", "Problem in leg bone"],
    ["Is there a swelling over throat?", "Throat swelling"],
    ["Does she have difficulty in breathing while playing?", "Difficulty in breathing"],
    ["Are there dental carries?", "Dental carries"],
    ["Is there a white patch in her eyes?", "White patch in eye"],
    ["Does she have impaired vision?", "Impaired vision"],
    ["Is there pus coming from ear?", "Pus coming out of ear"],
    ["Does she have impaired hearing?", "Impaired hearing"],
    ["Does she have skin problems?", "Skin problems"],
    ["Has she ever suffered from convulsions?", "Convulsions"],
    ["Is there any neurological motor defect?", "Neurological motor defect"],
    ["Is there any developmental delay or disability seen?", "Developmental delay"],
    ["Burning Micturition", "Burning micturition"],
    ["Ulcer over genitalia", "Ulcer over genitalia"],
    ["Yellowish discharge from Vagina / penis", "Yellowish discharge from penis/vagina"],
    ["Does she remain absent during menstruation?", "Menstrual Disorder"],
]);
const REFERRAL_ADVICE_CONCEPT = 'Refer to hospital for';

const getReferredAdviceConcepts = (encounter) => {
    const referredAdviceObs = _.defaultTo(encounter.findObservation(REFERRAL_ADVICE_CONCEPT),
        {concept: {getAnswers: () => []}, getValue: () => []});
    const answerConcepts = referredAdviceObs.concept.getAnswers().map(a => a.concept);
    return referredAdviceObs.getValue()
        .map((conceptUUID) => answerConcepts.find(ac => ac.uuid === conceptUUID));
};

const unsuccessfulReferral = (encounter) => (concept) => {
    let latestObs = encounter.findObservation("Visited hospital for");
    if (_.isNil(latestObs)) return true;
    return !latestObs.getValue().some(answer => concept.uuid === answer);
};

const existingReferralAdvice = (currentEncounter) => {
    const lastRoutineEncounter =
        currentEncounter.programEnrolment
            .findLastEncounterOfType(currentEncounter,
                RoutineEncounterHandler.visits.MONTHLY);
    const secondLastRoutineEncounter =
        _.defaultTo(currentEncounter.programEnrolment.findNthLastEncounterOfType(currentEncounter,
            RoutineEncounterHandler.visits.MONTHLY, 1), {findObservation: _.noop});

    if (_.isNil(lastRoutineEncounter)) return [];

    const lastReferredConcepts = getReferredAdviceConcepts(lastRoutineEncounter);
    const secondLastReferredConcepts = getReferredAdviceConcepts(secondLastRoutineEncounter);

    const remainingConcepts = _.differenceBy(lastReferredConcepts, secondLastReferredConcepts, (c) => c.uuid);
    let menstrualDisorder = lastReferredConcepts.filter((c) => c.name === "Menstrual Disorder");
    return menstrualDisorder.concat(remainingConcepts).filter(unsuccessfulReferral(currentEncounter));
};

const referralDecisions = (existingDecisions, programEncounter) => {
    const allDecisions = _.toPairs(existingDecisions).reduce((acc, [type, decisions]) => acc.concat(decisions), []);
    const complicationsBuilder = new ComplicationsBuilder({
        complicationsConcept: REFERRAL_ADVICE_CONCEPT,
        programEncounter: programEncounter,
        existingDecisions: allDecisions
    });


    existingReferralAdvice(programEncounter)
        .forEach(existingReferralComplication =>
            complicationsBuilder.addComplication(existingReferralComplication.name));

    Array.from(conceptReferralMap.entries())
        .map(([concept, complication]) => complicationsBuilder.addComplication(complication)
            .when.valueInEncounter(concept).containsAnswerConceptName("Yes"));

    complicationsBuilder.addComplication("Severe Anemia").when
        .valueInEncounter("Hb").lessThan(7);
    complicationsBuilder.addComplication("Severe malnourishment").when
        .valueInEncounter("BMI").lessThanOrEqualTo(14.5);
    complicationsBuilder.addComplication("Sickle Cell Anemia").when
        .valueInLastEncounter("Sickling Test Result", RoutineEncounterHandler.visits.ANNUAL).containsAnyAnswerConceptName("Disease");
    complicationsBuilder.addComplication("Self Addiction").when
        .valueInEncounter("Addiction Details").containsAnyAnswerConceptName("Alcohol", "Tobacco", "Both");

    existingDecisions.encounterDecisions.push(complicationsBuilder.getComplications());
    return existingDecisions;
};

export {referralDecisions}