import {assert} from "chai";
import {referralDecisions} from '../../health_modules/adolescent/referralDecision';
import enrolmentForm from "../../health_modules/adolescent/metadata/adolescentEnrolment.json";
import program from "../../health_modules/adolescent/metadata/adolescentProgram.json";
import adolescentConcepts from "../../health_modules/adolescent/metadata/adolescentConcepts.json";
import motherConcepts from "../../health_modules/mother/metadata/motherConcepts.json";
import commonConcepts from "../../health_modules/commonConcepts.json";
import adolescentRoutineVisitForm from "../../health_modules/adolescent/metadata/adolescentRoutineVisit.json";
import ProgramFactory from "../ref/ProgramFactory";
import EntityFactory from "../../../openchs-models/test/EntityFactory";
import Gender from "../../../openchs-models/src/Gender";
import EncounterFiller from "../ref/EncounterFiller";
import C from '../../health_modules/common';
import RoutineEncounterHandler from "../../health_modules/adolescent/formFilters/RoutineEncounterHandler";


describe("Referral Decision Test", () => {
    let programData;
    beforeEach(() => {
        programData = new ProgramFactory(program)
            .withConcepts(commonConcepts)
            .withConcepts(motherConcepts)
            .withConcepts(adolescentConcepts)
            .withEnrolmentform(enrolmentForm)
            .withEncounterForm(adolescentRoutineVisitForm)
            .build();
    });

    it("Shouldn't generate any referral advice in case of all normal values", () => {
        const encounterDecisions = {encounterDecisions: []};
        let individual = EntityFactory.createIndividual("Test Dude");
        individual.gender = Gender.create("Male");
        let enrolment = EntityFactory.createEnrolment({individual: individual, program: programData});
        let encounter = new EncounterFiller(programData, enrolment, RoutineEncounterHandler.visits.ANNUAL[0])
            .forSingleCoded("Is there any physical defect?", "No")
            .forSingleCoded("Is there a swelling at lower back?", "No")
            .forSingleCoded("Is there Cleft lip/Cleft palate?", "No")
            .forSingleCoded("Is there large gap between toe and finger?", "No")
            .forSingleCoded("Is her nails/tongue pale?", "No")
            .forSingleCoded("Is there any physical defect?", "No")
            .forSingleCoded("Is she/he severely malnourished?", "No")
            .forSingleCoded("Is there any problem in leg bone?", "No")
            .forSingleCoded("Is there a swelling over throat?", "No")
            .forSingleCoded("Does she have difficulty in breathing while playing?", "No")
            .forSingleCoded("Are there dental carries?", "No")
            .forSingleCoded("Is there a white patch in her eyes?", "No")
            .forSingleCoded("Does she have impaired vision?", "No")
            .forSingleCoded("Is there pus coming from ear?", "No")
            .forSingleCoded("Does she have impaired hearing?", "No")
            .forSingleCoded("Does she have skin problems?", "No")
            .forSingleCoded("Has she ever suffered from convulsions?", "No")
            .forSingleCoded("Is there any neurological motor defect?", "No")
            .forSingleCoded("Burning Micturition", "No")
            .forSingleCoded("Ulcer over genitalia", "No")
            .forSingleCoded("Yellowish discharge from Vagina / penis", "No")
            .forSingleCoded("Does she remain absent during menstruation?", "No")
            .forConcept("Hb", 8)
            .forConcept("BMI", 15)
            .forSingleCoded("Sickling Test Result", "Negative")
            .build();
        let decisions = referralDecisions(encounterDecisions, encounter).encounterDecisions;
        let decisionsToRefer = C.findValue(decisions, "Refer to hospital for");
        assert.lengthOf(decisionsToRefer, 0);
    });

    it("Should carry over the last encounter's referral advice given referral followup was unsuccessful", () => {
        const encounterDecisions = {encounterDecisions: []};
        let individual = EntityFactory.createIndividual("Test Dude");
        individual.gender = Gender.create("Male");
        let enrolment = EntityFactory.createEnrolment({individual: individual, program: programData});
        let previousEncounter = new EncounterFiller(programData, enrolment)
            .forMultiCoded("Refer to hospital for", ["Physical defect"])
            .build();
        let currentEncounter = new EncounterFiller(programData, enrolment, RoutineEncounterHandler.visits.ANNUAL[0])
            .forSingleCoded("Is there any physical defect?", "No")
            .forSingleCoded("Is there a swelling at lower back?", "No")
            .forSingleCoded("Is there Cleft lip/Cleft palate?", "No")
            .forSingleCoded("Is there large gap between toe and finger?", "No")
            .forSingleCoded("Is her nails/tongue pale?", "No")
            .forSingleCoded("Is there any physical defect?", "No")
            .forSingleCoded("Is she/he severely malnourished?", "No")
            .forSingleCoded("Is there any problem in leg bone?", "No")
            .forSingleCoded("Is there a swelling over throat?", "No")
            .forSingleCoded("Does she have difficulty in breathing while playing?", "No")
            .forSingleCoded("Are there dental carries?", "No")
            .forSingleCoded("Is there a white patch in her eyes?", "No")
            .forSingleCoded("Does she have impaired vision?", "No")
            .forSingleCoded("Is there pus coming from ear?", "No")
            .forSingleCoded("Does she have impaired hearing?", "No")
            .forSingleCoded("Does she have skin problems?", "No")
            .forSingleCoded("Has she ever suffered from convulsions?", "No")
            .forSingleCoded("Is there any neurological motor defect?", "No")
            .forSingleCoded("Burning Micturition", "No")
            .forSingleCoded("Ulcer over genitalia", "No")
            .forSingleCoded("Yellowish discharge from Vagina / penis", "No")
            .forSingleCoded("Does she remain absent during menstruation?", "No")
            .forConcept("Hb", 8)
            .forConcept("BMI", 15)
            .forSingleCoded("Sickling Test Result", "Negative")
            .forMultiCoded("Visited hospital for", [])
            .forMultiCoded("Ailments cured post treatment", [])
            .build();
        let decisions = referralDecisions(encounterDecisions, currentEncounter).encounterDecisions;
        let decisionsToRefer = C.findValue(decisions, "Refer to hospital for");
        assert.lengthOf(decisionsToRefer, 1);
        assert.include(decisionsToRefer, "Physical defect");
    });
});