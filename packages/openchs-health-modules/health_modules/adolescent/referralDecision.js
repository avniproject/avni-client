import _ from 'lodash';
import ComplicationsBuilder from "../rules/complicationsBuilder";
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

const unsuccessfulReferral = (encounter) => (concept) => {
    const latestObs = encounter.programEnrolment
        .findLatestObservationFromEncounters("Visited hospital for", encounter);
    if (_.isNil(latestObs)) return true;
    return !latestObs.getValue().some(answer => concept.uuid === answer);
};

const existingReferralAdvice = (currentEncounter) => {
    const lastEncounterWithReferralDecision =
        currentEncounter.programEnrolment
            .findLastEncounterOfTypeAndWithConcept(currentEncounter,
                RoutineEncounterHandler.visits.MONTHLY,
                REFERRAL_ADVICE_CONCEPT);
    if (_.isNil(lastEncounterWithReferralDecision)) return [];
    const referredAdviceObs = lastEncounterWithReferralDecision.findObservation(REFERRAL_ADVICE_CONCEPT);
    const answerConcepts = referredAdviceObs.concept.getAnswers().map(a => a.concept);
    const obsConcepts = referredAdviceObs.getValue()
        .map((conceptUUID) => answerConcepts.find(ac => ac.uuid === conceptUUID));
    return obsConcepts.filter(unsuccessfulReferral(currentEncounter));

};

const referralDecisions = (vulnerabilityEncounterDecisions, programEncounter) => {

    const complicationsBuilder = new ComplicationsBuilder({
        complicationsConcept: REFERRAL_ADVICE_CONCEPT,
        programEncounter: programEncounter
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
        .valueInEncounter("Sickling Test Result").containsAnswerConceptName("Disease");

    vulnerabilityEncounterDecisions.encounterDecisions.push(complicationsBuilder.getComplications());
    return vulnerabilityEncounterDecisions;
};

export {referralDecisions}