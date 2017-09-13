import ComplicationsBuilder from "../rules/complicationsBuilder";
import _ from "lodash";

const getDecisions = (programEncounter) => {
    let decisions = {enrolmentDecisions: [], encounterDecisions: [], registrationDecisions: []};
    const complicationsBuilder = new ComplicationsBuilder({programEncounter: programEncounter, complicationsConcept: 'PNC Complications'})

    complicationsBuilder.addComplication("Post-Partum Haemorrhage")
        .when.valueInEncounter("Any vaginal problems").containsAnswerConceptName("Bad-smelling lochea")
        .or.when.valueInEncounter("Post-Partum Haemorrhage symptoms").containsAnyAnswerConceptName("Difficulty breathing", "Bad headache", "Blurred vision")
        .or.when.valueInEncounter("Systolic").is.lessThan(90)
        .or.when.valueInEncounter("Diastolic").is.lessThan(60);

    complicationsBuilder.addComplication("Urinary Tract Infection")
        .when.valueInEncounter("Any abdominal problems").containsAnswerConceptName("Abdominal pain")
        .or.when.valueInEncounter("Any difficulties with urinating").containsAnyAnswerConceptName("Difficulty passing urine", "Burning sensation when urinating");

    complicationsBuilder.addComplication("Genital Tract Infection")
        .when.valueInEncounter("Any abdominal problems").containsAnswerConceptName("Uterus is soft or tender")
        .or.when.valueInEncounter("Any vaginal problems").containsAnswerConceptName("Heavy bleeding per vaginum");

    complicationsBuilder.addComplication("Mastitis")
        .when.valueInEncounter("Any breast problems").containsAnyAnswerConceptName("Breast hardness", "Nipple hardness", "Cracked Nipple");

    complicationsBuilder.addComplication("Post Operative Infection")
        .when.valueInEncounter("How is the Cesarean incision area").containsAnyAnswerConceptName("Looks red", "Indurated", "Filled with pus");

    const existingComplications = complicationsBuilder.getComplications().value;
    const existingComplicationsThatCanResultInHighTemperature = ["Post-Partum Haemorrhage", "Urinary Tract Infection", "Genital Tract Infection", "Mastitis", "Post Operative Infection"];
    complicationsBuilder.addComplication("Infection")
        .when.valueInEncounter("Temperature").is.greaterThanOrEqualTo(99)
        .and.whenItem(existingComplications).matchesFn((existingComplications) => {
        return _.intersection(existingComplicationsThatCanResultInHighTemperature, existingComplications).length === 0;
    });

    complicationsBuilder.addComplication("Post-Partum Depression")
        .when.valueInEncounter("Post-Partum Depression Symptoms").containsAnyAnswerConceptName("Insomnia", "Loss of appetite", "Weakness", "Irritability");

    complicationsBuilder.addComplication("Post-Partum Eclampsia")
        .when.valueInEncounter("Convulsions").containsAnswerConceptName("Present")
        .and.valueInEncounter("Systolic").is.greaterThanOrEqualTo(140)
        .or.valueInEncounter("Diastolic").is.greaterThanOrEqualTo(90);

    if (complicationsBuilder.hasComplications()) {
        decisions.encounterDecisions.push({name: "Treatment Advice", value: "Refer to FRU for further checkup"});
    }

    decisions.encounterDecisions.push(complicationsBuilder.getComplications());
    return decisions;
};

export {getDecisions};