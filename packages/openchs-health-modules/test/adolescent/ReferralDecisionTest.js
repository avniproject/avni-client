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
import moment from "moment";


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

    afterEach(() => {
        programData = undefined;
    });

    it("Shouldn't generate any referral advice in case of all normal values", () => {
        const encounterDecisions = {encounterDecisions: []};
        let individual = EntityFactory.createIndividual("Test Dude");
        individual.gender = Gender.create("Male");
        let enrolment = EntityFactory.createEnrolment({individual: individual, program: programData});
        let encounter = new EncounterFiller(programData, enrolment, "Annual Visit")
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

        let previousEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-12-25").toDate())
            .forMultiCoded("Refer to hospital for", ["Physical defect", "Yellowish discharge from penis/vagina"])
            .build();

        let currentEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1996-12-25", "YYYY-MM-DD").toDate())
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
        const decisions = referralDecisions(encounterDecisions, currentEncounter).encounterDecisions;
        const decisionsToRefer = C.findValue(decisions, "Refer to hospital for");

        assert.lengthOf(decisionsToRefer, 2);
        assert.include(decisionsToRefer, "Physical defect");
        assert.include(decisionsToRefer, "Yellowish discharge from penis/vagina");
    });

    it("Shouldn't carry over the last encounter's referral advice given referral followup involved a visit to the hospital", () => {
        const encounterDecisions = {encounterDecisions: []};
        let individual = EntityFactory.createIndividual("Test Dude");
        individual.gender = Gender.create("Male");
        let enrolment = EntityFactory.createEnrolment({individual: individual, program: programData});

        let previousEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-12-25", "YYYY-MM-DD").toDate())
            .forMultiCoded("Refer to hospital for", ["Physical defect", "Yellowish discharge from penis/vagina"])
            .build();

        let currentEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1996-12-25", "YYYY-MM-DD").toDate())
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
            .forMultiCoded("Visited hospital for", ["Physical defect"])
            .forMultiCoded("Ailments cured post treatment", [])
            .build();

        let decisions = referralDecisions(encounterDecisions, currentEncounter).encounterDecisions;
        let decisionsToRefer = C.findValue(decisions, "Refer to hospital for");
        assert.lengthOf(decisionsToRefer, 1);
        assert.notInclude(decisionsToRefer, "Physical defect");
        assert.include(decisionsToRefer, "Yellowish discharge from penis/vagina");
    });

    it("Generate referral advice if BMI is less than or equal to 14.5", () => {
        const encounterDecisions = {encounterDecisions: [], enrolmentDecisions: [{name: "BMI", value: 14}]};
        let individual = EntityFactory.createIndividual("Test Dude");
        individual.gender = Gender.create("Male");
        let enrolment = EntityFactory.createEnrolment({individual: individual, program: programData});

        let previousEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-12-25", "YYYY-MM-DD").toDate())
            .forMultiCoded("Refer to hospital for", ["Physical defect", "Yellowish discharge from penis/vagina"])
            .build();

        let currentEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1996-12-25", "YYYY-MM-DD").toDate())
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
            .forConcept("BMI", 14)
            .forSingleCoded("Sickling Test Result", "Negative")
            .forMultiCoded("Visited hospital for", ["Physical defect"])
            .forMultiCoded("Ailments cured post treatment", [])
            .build();

        let decisions = referralDecisions(encounterDecisions, currentEncounter).encounterDecisions;
        let decisionsToRefer = C.findValue(decisions, "Refer to hospital for");
        assert.lengthOf(decisionsToRefer, 2);
        assert.notInclude(decisionsToRefer, "Physical defect");
        assert.include(decisionsToRefer, "Yellowish discharge from penis/vagina");
        assert.include(decisionsToRefer, "Severe malnourishment");
    });

    it("Generate referral advice if Hb is less than 7", () => {
        const encounterDecisions = {encounterDecisions: [{name: "BMI", value: 14}]};
        let individual = EntityFactory.createIndividual("Test Dude");
        individual.gender = Gender.create("Male");
        let enrolment = EntityFactory.createEnrolment({individual: individual, program: programData});

        let previousEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-12-25", "YYYY-MM-DD").toDate())
            .forMultiCoded("Refer to hospital for", ["Physical defect", "Yellowish discharge from penis/vagina"])
            .build();

        let currentEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1996-12-25", "YYYY-MM-DD").toDate())
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
            .forConcept("Hb", 6)
            .forConcept("BMI", 14)
            .forSingleCoded("Sickling Test Result", "Negative")
            .forMultiCoded("Visited hospital for", ["Physical defect"])
            .forMultiCoded("Ailments cured post treatment", [])
            .build();

        let decisions = referralDecisions(encounterDecisions, currentEncounter).encounterDecisions;
        let decisionsToRefer = C.findValue(decisions, "Refer to hospital for");
        assert.lengthOf(decisionsToRefer, 3);
        assert.notInclude(decisionsToRefer, "Physical defect");
        assert.include(decisionsToRefer, "Yellowish discharge from penis/vagina");
        assert.include(decisionsToRefer, "Severe malnourishment");
        assert.include(decisionsToRefer, "Severe Anemia");
    });

    it("Generate referral advice if Sickle cell disease", () => {
        const encounterDecisions = {encounterDecisions: [{name: "BMI", value: 14}]};
        let individual = EntityFactory.createIndividual("Test Dude");
        individual.gender = Gender.create("Male");
        let enrolment = EntityFactory.createEnrolment({individual: individual, program: programData});

        let previousEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-12-25", "YYYY-MM-DD").toDate())
            .forMultiCoded("Refer to hospital for", ["Physical defect", "Yellowish discharge from penis/vagina"])
            .build();

        let currentEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1996-12-25", "YYYY-MM-DD").toDate())
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
            .forConcept("Hb", 6)
            .forConcept("BMI", 14)
            .forSingleCoded("Sickling Test Result", "Disease")
            .forMultiCoded("Visited hospital for", ["Physical defect"])
            .forMultiCoded("Ailments cured post treatment", [])
            .build();

        let decisions = referralDecisions(encounterDecisions, currentEncounter).encounterDecisions;
        let decisionsToRefer = C.findValue(decisions, "Refer to hospital for");
        assert.lengthOf(decisionsToRefer, 4);
        assert.notInclude(decisionsToRefer, "Physical defect");
        assert.include(decisionsToRefer, "Yellowish discharge from penis/vagina");
        assert.include(decisionsToRefer, "Severe malnourishment");
        assert.include(decisionsToRefer, "Severe Anemia");
        assert.include(decisionsToRefer, "Sickle Cell Anemia");
    });

    it("Remove from referral advice after 2 unsucessful routine visits", () => {
        const encounterDecisions = {encounterDecisions: []};
        let individual = EntityFactory.createIndividual("Test Dude");
        individual.gender = Gender.create("Male");
        let enrolment = EntityFactory.createEnrolment({individual: individual, program: programData});

        let previousEncounter1 = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-1-25", "YYYY-MM-DD").toDate())
            .forMultiCoded("Refer to hospital for", ["Physical defect", "Yellowish discharge from penis/vagina"])
            .build();

        let previousEncounter2 = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-2-25", "YYYY-MM-DD").toDate())
            .forMultiCoded("Refer to hospital for", ["Physical defect", "Yellowish discharge from penis/vagina"])
            .build();

        let currentEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-3-25", "YYYY-MM-DD").toDate())
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

        let decisions = referralDecisions(encounterDecisions, currentEncounter).encounterDecisions;
        let decisionsToRefer = C.findValue(decisions, "Refer to hospital for");
        assert.lengthOf(decisionsToRefer, 0);
        assert.notInclude(decisionsToRefer, "Physical defect");
        assert.notInclude(decisionsToRefer, "Yellowish discharge from penis/vagina");
    });

    it("Remove from referral advice except for Menstrual Disorder after 2 unsucessful routine visits", () => {
        const encounterDecisions = {encounterDecisions: []};
        let individual = EntityFactory.createIndividual("Test Dude");
        individual.gender = Gender.create("Male");
        let enrolment = EntityFactory.createEnrolment({individual: individual, program: programData});

        let previousEncounter1 = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-1-25", "YYYY-MM-DD").toDate())
            .forMultiCoded("Refer to hospital for", ["Physical defect", "Yellowish discharge from penis/vagina", "Menstrual Disorder"])
            .build();

        let previousEncounter2 = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-2-25", "YYYY-MM-DD").toDate())
            .forMultiCoded("Refer to hospital for", ["Physical defect", "Yellowish discharge from penis/vagina", "Menstrual Disorder"])
            .build();

        let currentEncounter = new EncounterFiller(programData, enrolment, "Annual Visit", moment("1995-3-25", "YYYY-MM-DD").toDate())
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
            .forSingleCoded("Addiction Details", "Both")
            .forConcept("Hb", 8)
            .forConcept("BMI", 15)
            .forSingleCoded("Sickling Test Result", "Trait")
            .build();

        let decisions = referralDecisions(encounterDecisions, currentEncounter).encounterDecisions;
        let decisionsToRefer = C.findValue(decisions, "Refer to hospital for");
        assert.lengthOf(decisionsToRefer, 3);
        assert.notInclude(decisionsToRefer, "Physical defect");
        assert.notInclude(decisionsToRefer, "Yellowish discharge from penis/vagina");
        assert.include(decisionsToRefer, "Menstrual Disorder");
        assert.include(decisionsToRefer, "Self Addiction");
        assert.include(decisionsToRefer, "Sickle Cell Anemia");
    });
});