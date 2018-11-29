import {assert, expect} from "chai";
import moment from "moment";
import _ from "lodash";
import ProgramEnrolment from "../src/ProgramEnrolment";
import ProgramEncounter from "../src/ProgramEncounter";
import SingleCodedValue from "../src/observation/SingleCodedValue";
import Observation from "../src/Observation";
import Concept from "../src/Concept";
import RoutineEncounterHandler
    from "../../openchs-health-modules/health_modules/adolescent/formFilters/RoutineEncounterHandler";
import EncounterType from "../src/EncounterType";
import EntityFactory from "./EntityFactory";
import PrimitiveValue from "../src/observation/PrimitiveValue";

describe('ProgramEnrolmentTest', () => {
    it('getEncounters', () => {
        const enrolment = ProgramEnrolment.createEmptyInstance();

        enrolment.addEncounter(createEncounter(new Date(2017, 3, 1)));
        const newest = createEncounter(new Date(2017, 4, 1));
        enrolment.addEncounter(newest);
        enrolment.addEncounter(createEncounter(new Date(2017, 2, 1)));

        assert.equal(enrolment.getEncounters()[0].uuid, newest.uuid);
    });

    describe("getObservationsForConceptName", () => {
        it("returns all observations for a given concept", () => {
            const heightConcept = EntityFactory.createConcept("Height", Concept.dataType.Numeric, "766472d4-30ce-480d-b46c-13ab9226842e"),
                enrolment = ProgramEnrolment.createEmptyInstance(),
                encounter1 = createEncounter(new Date(2017, 3, 1)),
                encounter2 = createEncounter(new Date(2017, 4, 1)),
                emptyEncounter = createEncounter(new Date(2017, 4, 1));

            encounter1.addObservation(Observation.create(heightConcept, new PrimitiveValue(100)));
            encounter2.addObservation(Observation.create(heightConcept, new PrimitiveValue(101)));
            enrolment.addEncounters(encounter1, encounter2, emptyEncounter);

            const heights = enrolment.getObservationsForConceptName("Height");

            expect(heights).to.be.an('array').with.lengthOf(2);
            expect(heights).to.deep.include({encounterDateTime: encounter1.encounterDateTime, obs: 100})
            expect(heights).to.deep.include({encounterDateTime: encounter2.encounterDateTime, obs: 101})
        });
    });

    describe("lastFulfilledEncounter", () => {

        it("returns null if no encounters are present in enrolment", () => {
            assert.isUndefined(ProgramEnrolment.createEmptyInstance().lastFulfilledEncounter());
        });

        it("returns null if none of the encounters have an encounterDatetime", () => {
            const enrolment = ProgramEnrolment.createEmptyInstance();
            enrolment.addEncounter(createEncounter(null));

            assert.isUndefined(enrolment.lastFulfilledEncounter());

            enrolment.addEncounter(createEncounter(null));

            assert.isUndefined(enrolment.lastFulfilledEncounter());

            enrolment.addEncounter(createEncounter(new Date()));
            assert.isDefined(enrolment.lastFulfilledEncounter());
        });

        it("returns the encounter with the greatest encounterDateTime", () => {
            const enrolment = ProgramEnrolment.createEmptyInstance();
            const todaysEncounter = createEncounter(new Date());
            enrolment.addEncounter(todaysEncounter);

            assert.equal(enrolment.lastFulfilledEncounter(), todaysEncounter);

            const yesterdaysEncounter = createEncounter(moment().subtract(1, 'days').toDate());
            enrolment.addEncounter(yesterdaysEncounter);

            assert.equal(enrolment.lastFulfilledEncounter(), todaysEncounter);

            const tomorrowsEncounter = createEncounter(moment().add(1, 'days').toDate());
            enrolment.addEncounter(tomorrowsEncounter);

            assert.equal(enrolment.lastFulfilledEncounter(), tomorrowsEncounter);

            const encounterNotYetFilled = createEncounter(undefined);
            enrolment.addEncounter(encounterNotYetFilled);

            assert.equal(enrolment.lastFulfilledEncounter(), tomorrowsEncounter);
            yesterdaysEncounter.encounterType = {name: 'special'};
            tomorrowsEncounter.encounterType = {name: 'notspecial'};
            todaysEncounter.encounterType = {name: 'notspecial'};
            assert.equal(enrolment.lastFulfilledEncounter('special'), yesterdaysEncounter);
            assert.equal(enrolment.lastFulfilledEncounter('notspecial'), tomorrowsEncounter);
            assert.equal(enrolment.lastFulfilledEncounter('unavailable'), null);
        });

        it("returns the last nth encounter", () => {
            const enrolment = ProgramEnrolment.createEmptyInstance();
            const thirdMonthlyVisit = createEncounter(new Date(2018, 4, 11), "Monthly Visit");
            enrolment.addEncounter(thirdMonthlyVisit);

            const quarterlyVisit = createEncounter(new Date(2018, 3, 11), "Quarterly Visit");
            enrolment.addEncounter(quarterlyVisit);

            const secondMonthlyVisit = createEncounter(new Date(2018, 2, 11), "Monthly Visit");
            enrolment.addEncounter(secondMonthlyVisit);

            const firstMonthlyVisit = createEncounter(new Date(2018, 1, 11), "Monthly Visit");
            enrolment.addEncounter(firstMonthlyVisit);

            const firstAnnualVisit = createEncounter(new Date(2018, 0, 11), "Annual Visit");
            enrolment.addEncounter(firstAnnualVisit);

            assert.equal(enrolment.findNthLastEncounterOfType(thirdMonthlyVisit,
                RoutineEncounterHandler.visits.MONTHLY, 1), secondMonthlyVisit);
        });

        it("returns the latest value of observation recorded", () => {
            const enrolment = ProgramEnrolment.createEmptyInstance();

            const firstAnnualVisit = createEncounter(new Date(2018, 0, 11), "Annual Visit");
            enrolment.addEncounter(firstAnnualVisit);
            let concept = EntityFactory.createConcept("height", Concept.dataType.Coded, "concept-2");

            const obs1 = Observation.create(concept, new SingleCodedValue("answerUUID"));
            firstAnnualVisit.observations.push(obs1);

            const firstMonthlyVisit = createEncounter(new Date(2018, 1, 11), "Monthly Visit");
            enrolment.addEncounter(firstMonthlyVisit);


            const secondMonthlyVisit = createEncounter(new Date(2018, 2, 11), "Monthly Visit");
            enrolment.addEncounter(secondMonthlyVisit);

            const obs2 = Observation.create(concept, new SingleCodedValue("answerUUID"));
            secondMonthlyVisit.observations.push(obs2);

            const quarterlyVisit = createEncounter(new Date(2018, 3, 11), "Quarterly Visit");
            enrolment.addEncounter(quarterlyVisit);

            const thirdMonthlyVisit = createEncounter(new Date(2018, 4, 11), "Monthly Visit");
            enrolment.addEncounter(thirdMonthlyVisit);


            assert.equal(enrolment.findLatestObservationFromEncounters("height",
                firstMonthlyVisit, false), obs1);
            assert.equal(enrolment.findLatestObservationFromEncounters("height",
                secondMonthlyVisit, false), obs2);
            assert.equal(enrolment.findLatestObservationFromEncounters("height",
                thirdMonthlyVisit, false), obs2);
            assert.equal(enrolment.findLatestObservationFromEncounters("height",
                null, false), obs2);
        });

    });

    function createEncounter(date, name) {
        const encounter = ProgramEncounter.createEmptyInstance();
        encounter.encounterDateTime = date;
        if (!_.isEmpty(name)) encounter.encounterType = EncounterType.create(name);
        return encounter;
    }

    function createScheduleEncounter(encounterDate, name, scheduleDate) {
        const scheduleEncounter = ProgramEncounter.createEmptyInstance();
        scheduleEncounter.encounterDateTime = encounterDate;
        scheduleEncounter.earliestVisitDateTime = scheduleDate;
        scheduleEncounter.maxVisitDateTime = scheduleDate;
        if (!_.isEmpty(name)) scheduleEncounter.encounterType = EncounterType.create(name);
        return scheduleEncounter;

    }
});