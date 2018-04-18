import {expect, assert} from "chai";
import EntityFactory from "../../../openchs-models/test/EntityFactory";
import {gestationalAgeCategoryAsOn} from "../../health_modules/mother/calculations";
import motherConcepts from "../../health_modules/mother/metadata/motherConcepts.json";
import commonConcepts from "../../health_modules/commonConcepts.json";
import ProgramFactory from "../ref/ProgramFactory";
import EnrolmentFiller from "../ref/EnrolmentFiller";
import program from "../../health_modules/mother/metadata/motherProgram";
import moment from "moment";


describe("Gestational Age", () => {
    let programData;

    beforeEach(() => {
        programData = new ProgramFactory(program)
            .withConcepts(commonConcepts)
            .withConcepts(motherConcepts)
            .build();
    });

    it("should gestational age based on LMP", () => {
        let mother = EntityFactory.createIndividual("Test mother");

        let enrolment = new EnrolmentFiller(programData, mother, new Date())
            .forConcept("Last menstrual period", moment().subtract(35, 'weeks').toDate())
            .build();
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Very preterm');

        enrolment = new EnrolmentFiller(programData, mother, new Date())
            .forConcept("Last menstrual period", moment().subtract(36, 'weeks').toDate())
            .build();
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Preterm');

        enrolment = new EnrolmentFiller(programData, mother, new Date())
            .forConcept("Last menstrual period", moment().subtract(37, 'weeks').toDate())
            .build();
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Preterm');

        enrolment = new EnrolmentFiller(programData, mother, new Date())
            .forConcept("Last menstrual period", moment().subtract(38, 'weeks').toDate())
            .build();
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Term');
    });
});
