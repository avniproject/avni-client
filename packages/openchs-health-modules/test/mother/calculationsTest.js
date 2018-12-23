import {expect, assert} from "chai";
import EntityFactory from "../../../openchs-models/test/EntityFactory";
import {gestationalAgeCategoryAsOn, eddBasedOnGestationalAge, gestationalAgeAsOfToday, gestationalAgeForEDD} from "../../health_modules/mother/calculations";
import motherConcepts from "../../health_modules/mother/metadata/motherConcepts.json";
import commonConcepts from "../../health_modules/commonConcepts.json";
import ProgramFactory from "../../../openchs-models/test/ref/ProgramFactory";
import EnrolmentFiller from "../../../openchs-models/test/ref/EnrolmentFiller";
import program from "../../health_modules/mother/metadata/motherProgram";
import moment from "moment";


describe("Calculations Test", () => {
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
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Preterm (<28 weeks)');

        enrolment = new EnrolmentFiller(programData, mother, new Date())
            .forConcept("Last menstrual period", moment().subtract(37, 'weeks').toDate())
            .build();
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Preterm (<28 weeks)');

        enrolment = new EnrolmentFiller(programData, mother, new Date())
            .forConcept("Last menstrual period", moment().subtract(38, 'weeks').toDate())
            .build();
        expect(gestationalAgeCategoryAsOn(new Date(), enrolment)).to.equal('Term (37 -38 weeks)');
    });

    it('Should get edd based on gestational age', function () {
        let estimatedGestationalAgeInWeeks = 12;
        let estimateDate = new Date(2018, 6, 22);
        let edd = eddBasedOnGestationalAge(estimatedGestationalAgeInWeeks, estimateDate);
        expect(edd.getTime()).is.equal(new Date(2019, 1, 3).getTime());
    });

    it('Should get gestational age as of today', function () {
        let estimatedGestationalAgeInWeeks = 16;
        let estimatedOnDate = new Date(2018, 5, 22);
        let today = new Date(2018, 6, 22);
        expect(gestationalAgeAsOfToday(estimatedGestationalAgeInWeeks, estimatedOnDate, today)).is.equal(20);

        estimatedGestationalAgeInWeeks = 40;
        estimatedOnDate = new Date(2018, 6, 27);
        today = new Date(2018, 6, 27);
        expect(gestationalAgeAsOfToday(estimatedGestationalAgeInWeeks, estimatedOnDate, today)).is.equal(40);
    });

    it('Should get gestational age from edd', () => {
        let edd = new Date(2018, 9, 1);
        let asOfDate = new Date(2018, 8, 1);
        expect(gestationalAgeForEDD(edd, asOfDate)).is.equal(36);
    });
});
