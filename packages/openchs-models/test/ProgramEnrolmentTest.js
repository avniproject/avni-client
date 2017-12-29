import {assert} from "chai";
import moment from "moment";
import _ from "lodash";
import ProgramEnrolment from "../src/ProgramEnrolment";
import ProgramEncounter from "../src/ProgramEncounter";

describe('ProgramEnrolmentTest', () => {
    it('mergeChecklists', () => {
        const enrolment = ProgramEnrolment.createEmptyInstance();
        const expectedChecklists = [{name: 'Vaccination', items: [{name: 'A1', dueDate: new Date(), maxDate: new Date()}]}];
        const checklists = enrolment.createChecklists(expectedChecklists, {getConceptByName: () => {return {name: 'A1'}}});
        assert.equal(checklists.length, 1);
    });

    it('getEncounters', () => {
        const enrolment = ProgramEnrolment.createEmptyInstance();

        enrolment.addEncounter(createEncounter(new Date(2017, 3, 1)));
        const newest = createEncounter(new Date(2017, 4, 1));
        enrolment.addEncounter(newest);
        enrolment.addEncounter(createEncounter(new Date(2017, 2, 1)));

        assert.equal(enrolment.getEncounters()[0].uuid, newest.uuid);
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

    });

    function createEncounter(date) {
        const encounter = ProgramEncounter.createEmptyInstance();
        encounter.encounterDateTime = date;
        return encounter;
    }
});